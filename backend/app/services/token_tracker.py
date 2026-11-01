"""
Token Usage Tracker Service.
Extracts input/output token counts directly from actual LLM provider response metadata,
computes cost estimates, and records logs to the database.
"""

import logging
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.token_usage import TokenUsageLog
from app.services.llm_factory import calculate_cost

logger = logging.getLogger(__name__)


def extract_token_counts(
    response: Any,
    prompt_text_fallback: str = "",
    completion_text_fallback: str = "",
) -> Tuple[int, int, int]:
    """
    Extract prompt_tokens, completion_tokens, total_tokens from actual LLM response metadata.
    Falls back to heuristic character/word estimation if provider did not include metadata.
    """
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    # 1. Check LangChain standardized usage_metadata
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        um = response.usage_metadata
        prompt_tokens = um.get("input_tokens", 0)
        completion_tokens = um.get("output_tokens", 0)
        total_tokens = um.get("total_tokens", prompt_tokens + completion_tokens)
        if total_tokens > 0:
            return prompt_tokens, completion_tokens, total_tokens

    # 2. Check provider response_metadata (OpenAI / Anthropic / Gemini)
    if hasattr(response, "response_metadata") and response.response_metadata:
        rm = response.response_metadata
        token_usage = rm.get("token_usage") or rm.get("usage")
        if isinstance(token_usage, dict):
            prompt_tokens = token_usage.get("prompt_tokens") or token_usage.get("input_tokens", 0)
            completion_tokens = token_usage.get("completion_tokens") or token_usage.get("output_tokens", 0)
            total_tokens = token_usage.get("total_tokens", prompt_tokens + completion_tokens)
            if total_tokens > 0:
                return prompt_tokens, completion_tokens, total_tokens

    # 3. Fallback: Estimation based on 4 characters ~= 1 token
    if prompt_tokens == 0 and prompt_text_fallback:
        prompt_tokens = max(1, len(prompt_text_fallback) // 4)
    if completion_tokens == 0 and completion_text_fallback:
        completion_tokens = max(1, len(completion_text_fallback) // 4)

    total_tokens = prompt_tokens + completion_tokens
    return prompt_tokens, completion_tokens, total_tokens


async def record_token_usage(
    db: AsyncSession,
    session_id: str,
    provider: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
) -> TokenUsageLog:
    """Save token consumption log entry to database."""
    total_tokens = prompt_tokens + completion_tokens
    cost = calculate_cost(model, prompt_tokens, completion_tokens)

    log_entry = TokenUsageLog(
        session_id=session_id,
        provider=provider,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        estimated_cost_usd=cost,
    )

    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    logger.info(
        f"Logged usage for session {session_id}: {total_tokens} tokens ({prompt_tokens} in / {completion_tokens} out), cost: ${cost:.6f}"
    )
    return log_entry

