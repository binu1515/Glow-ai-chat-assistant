"""
AI Agent Service with LangChain/LangGraph, MCP Tool Calling, and Conversation Memory.
Orchestrates multi-turn memory retrieval, tool invocations, token extraction, and real-time SSE streaming.
"""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)

from app.models.message import ChatMessage
from app.models.session import ConversationSession
from app.services.llm_factory import LLMFactory, calculate_cost
from app.services.mcp_client import mcp_client
from app.services.token_tracker import extract_token_counts, record_token_usage

logger = logging.getLogger(__name__)


def normalize_content(content: Any) -> str:
    """
    Extract clean plain text from strings, lists of message blocks, or dictionaries.
    Handles Google Gemini / Anthropic structured content blocks like [{'type': 'text', 'text': '...'}].
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        extracted = []
        for item in content:
            if isinstance(item, str):
                extracted.append(item)
            elif isinstance(item, dict):
                if "text" in item and isinstance(item["text"], str):
                    extracted.append(item["text"])
                elif "content" in item and isinstance(item["content"], str):
                    extracted.append(item["content"])
            elif hasattr(item, "text"):
                extracted.append(str(item.text))
        return "".join(extracted)
    if isinstance(content, dict):
        if "text" in content:
            return str(content["text"])
        if "content" in content:
            return str(content["content"])
    return str(content) if content is not None else ""


class AgentService:
    @staticmethod
    async def load_conversation_history(
        db: AsyncSession,
        session_id: str,
        memory_window: int = 10,
    ) -> List[BaseMessage]:
        """
        Load conversation history from the database for the given session.
        Applies a sliding memory window to maintain context without overflowing token limits.
        """
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        res = await db.execute(stmt)
        all_messages = res.scalars().all()

        # Apply sliding window: take the most recent K messages
        recent_messages = all_messages[-memory_window:] if len(all_messages) > memory_window else all_messages

        langchain_messages: List[BaseMessage] = []
        for msg in recent_messages:
            if msg.role == "user":
                langchain_messages.append(HumanMessage(content=msg.content or ""))
            elif msg.role == "assistant":
                # If assistant message has final content, replay the synthesized answer directly.
                # This keeps context intact while avoiding Gemini thought-signature expiration and function sequence errors.
                if msg.content:
                    langchain_messages.append(AIMessage(content=msg.content))
                elif msg.tool_calls and msg.tool_results:
                    tool_calls_payload = []
                    for tc in msg.tool_calls:
                        tool_calls_payload.append({
                            "name": tc.get("name"),
                            "args": tc.get("arguments", {}),
                            "id": tc.get("id", f"call_{tc.get('name', 'tool')}"),
                            "type": "tool_call",
                        })
                    langchain_messages.append(AIMessage(content="", tool_calls=tool_calls_payload))
                    for i, tr in enumerate(msg.tool_results):
                        tc_id = tr.get("id")
                        if not tc_id and i < len(msg.tool_calls):
                            tc_id = msg.tool_calls[i].get("id")
                        tc_id = tc_id or f"call_{tr.get('name', 'tool')}"
                        langchain_messages.append(ToolMessage(content=str(tr.get("result", "")), tool_call_id=tc_id))
                else:
                    langchain_messages.append(AIMessage(content=msg.content or ""))
            elif msg.role == "tool":
                langchain_messages.append(ToolMessage(content=msg.content or "", tool_call_id="call_prev"))

        # Healing: Ensure clean turn alternation (no consecutive User/Assistant turns, start with User)
        healed: List[BaseMessage] = []
        for m in langchain_messages:
            if not healed:
                if isinstance(m, HumanMessage):
                    healed.append(m)
                continue
            last = healed[-1]
            if isinstance(m, HumanMessage) and isinstance(last, HumanMessage):
                healed[-1] = HumanMessage(content=f"{last.content}\n{m.content}")
            elif isinstance(m, AIMessage) and isinstance(last, AIMessage) and not getattr(m, "tool_calls", None) and not getattr(last, "tool_calls", None):
                healed[-1] = AIMessage(content=f"{last.content}\n{m.content}")
            else:
                healed.append(m)

        return healed

    @staticmethod
    def build_langgraph_workflow(
        llm: Any,
        tools: List[Any],
        system_prompt: Optional[str] = None,
        checkpointer: Optional[Any] = None,
    ):
        """
        Build and compile a LangGraph ReAct agent.
        Demonstrates LangGraph's cyclical graph architecture:
          Agent State -> LLM Node -> Tool Condition -> Tool Node -> Loop back to LLM.
        """
        try:
            from langgraph.prebuilt import create_react_agent
            prompt = system_prompt or "You are a helpful AI assistant with access to tools."
            return create_react_agent(
                model=llm,
                tools=tools,
                prompt=prompt,
                checkpointer=checkpointer,
            )
        except ImportError:
            logger.warning("langgraph is not installed, falling back to LangChain standard runnable.")
            return None

    @staticmethod
    async def run_agent_stream(
        db: AsyncSession,
        session: ConversationSession,
        user_message_text: str,
        provider: str,
        model_name: str,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        system_prompt: str = "You are a helpful, accurate AI assistant with access to tools via Model Context Protocol.",
        memory_window: int = 10,
    ) -> AsyncGenerator[str, None]:
        """
        Executes the agent loop and yields Server-Sent Events (SSE) JSON strings.
        Event types:
          - session_created
          - tool_start
          - tool_end
          - token
          - usage
          - done
          - error
        """
        # Save user message to database
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=user_message_text,
        )
        db.add(user_msg)
        await db.commit()

        # Load history
        history = await AgentService.load_conversation_history(
            db=db,
            session_id=session.id,
            memory_window=memory_window,
        )

        # Assemble prompt chain with system prompt and history
        messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]
        messages.extend(history)
        # Ensure the current user message is at the end
        if not history or history[-1].content != user_message_text:
            messages.append(HumanMessage(content=user_message_text))

        # Instantiate LLM
        try:
            llm = LLMFactory.create_chat_model(
                provider=provider,
                model=model_name,
                api_key=api_key,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=True,
            )
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
            return

        # Prepare tools
        tool_instances = mcp_client.get_langchain_tools()
        llm_with_tools = llm.bind_tools(tool_instances)

        recorded_tool_calls: List[Dict[str, Any]] = []
        recorded_tool_results: List[Dict[str, Any]] = []
        assistant_full_content = ""
        total_prompt_tokens = 0
        total_completion_tokens = 0

        try:
            # Step 1: Initial invocation to check for tool calls
            first_response = await llm_with_tools.ainvoke(messages)

            # Extract initial usage if returned
            p_tok, c_tok, _ = extract_token_counts(first_response)
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            # Check if LLM decided to invoke any tools
            tool_calls = getattr(first_response, "tool_calls", []) or []

            if tool_calls:
                # Add assistant's tool call message to history
                messages.append(first_response)

                for tc in tool_calls:
                    t_name = tc.get("name")
                    t_args = tc.get("args", {})
                    t_id = tc.get("id", f"call_{t_name}")

                    recorded_tool_calls.append({
                        "id": t_id,
                        "name": t_name,
                        "arguments": t_args,
                    })

                    # Emit tool_start SSE event
                    yield f"event: tool_start\ndata: {json.dumps({'tool': t_name, 'arguments': t_args, 'id': t_id})}\n\n"

                    # Execute via MCP Client with Redis Caching
                    t_result, cache_hit = await mcp_client.call_tool(t_name, t_args)

                    recorded_tool_results.append({
                        "id": t_id,
                        "name": t_name,
                        "result": t_result,
                        "cache_hit": cache_hit,
                    })

                    # Emit tool_end SSE event
                    yield f"event: tool_end\ndata: {json.dumps({'tool': t_name, 'result': t_result, 'cache_hit': cache_hit, 'id': t_id})}\n\n"

                    # Add tool response to message history
                    messages.append(ToolMessage(content=str(t_result), tool_call_id=t_id))

                # Step 2: Stream final synthesized answer from LLM with tool outputs
                async for chunk in llm.astream(messages):
                    text_chunk = normalize_content(chunk.content)
                    if text_chunk:
                        assistant_full_content += text_chunk
                        yield f"event: token\ndata: {json.dumps({'token': text_chunk})}\n\n"

                    # Check chunk usage
                    c_p, c_c, _ = extract_token_counts(chunk)
                    if c_p > 0:
                        total_prompt_tokens += c_p
                    if c_c > 0:
                        total_completion_tokens += c_c
            else:
                # No tools needed: normalize content to clean plain text
                content_str = normalize_content(first_response.content)
                assistant_full_content = content_str
                # Stream the content in chunks for a nice real-time effect
                words = content_str.split(" ")
                for i, w in enumerate(words):
                    part = w + (" " if i < len(words) - 1 else "")
                    yield f"event: token\ndata: {json.dumps({'token': part})}\n\n"

        except Exception as err:
            logger.error(f"Error during agent execution: {err}", exc_info=True)
            err_raw = str(err)
            if "function call turn comes immediately after" in err_raw or "INVALID_ARGUMENT" in err_raw:
                friendly = "The AI model encountered a conversation sequence conflict while executing tools. Context has been refreshed—please try re-sending your question."
            elif "not found" in err_raw or "no longer available" in err_raw:
                friendly = "The requested AI model is unavailable or has been deprecated. Please select a supported model in Settings."
            elif "429" in err_raw or "quota" in err_raw.lower() or "rate limit" in err_raw.lower():
                friendly = "API rate limit reached. Please wait a moment before trying again."
            elif "401" in err_raw or "Unauthorized" in err_raw or "API key" in err_raw:
                friendly = "Invalid or missing API key. Please check your credentials in Settings."
            else:
                friendly = err_raw
            yield f"event: error\ndata: {json.dumps({'error': friendly, 'raw_error': err_raw})}\n\n"
            return

        # Fallback token estimation if provider did not report
        if total_prompt_tokens == 0:
            total_prompt_tokens = max(1, len(user_message_text) // 4)
        if total_completion_tokens == 0:
            total_completion_tokens = max(1, len(assistant_full_content) // 4)

        # Record token usage in database
        usage_log = await record_token_usage(
            db=db,
            session_id=session.id,
            provider=provider,
            model=model_name,
            prompt_tokens=total_prompt_tokens,
            completion_tokens=total_completion_tokens,
        )

        # Emit usage SSE event
        yield f"event: usage\ndata: {json.dumps({'prompt_tokens': usage_log.prompt_tokens, 'completion_tokens': usage_log.completion_tokens, 'total_tokens': usage_log.total_tokens, 'estimated_cost_usd': usage_log.estimated_cost_usd, 'model': model_name, 'provider': provider})}\n\n"

        # Persist assistant message in database
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=assistant_full_content,
            tool_calls=recorded_tool_calls if recorded_tool_calls else None,
            tool_results=recorded_tool_results if recorded_tool_results else None,
        )
        db.add(assistant_msg)

        # Update session title if first exchange
        if session.title == "New Conversation" and user_message_text:
            cleaned_title = user_message_text[:35].strip()
            session.title = cleaned_title + ("..." if len(user_message_text) > 35 else "")

        await db.commit()
        await db.refresh(assistant_msg)

        # Emit done event
        yield f"event: done\ndata: {json.dumps({'message_id': assistant_msg.id, 'session_id': session.id, 'content': assistant_full_content, 'tool_calls': recorded_tool_calls, 'tool_results': recorded_tool_results})}\n\n"

