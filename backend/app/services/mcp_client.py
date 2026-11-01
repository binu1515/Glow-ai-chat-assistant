"""
Model Context Protocol (MCP) Client Service.
Connects to the external MCP Server, discovers tools, and invokes them.
Integrates Redis caching with TTL for Weather and Document Search tools.
Provides LangChain-compatible StructuredTools for the AI agent.
"""

import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional, Tuple

import httpx
from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.config import settings
from app.services.redis_cache import cache_service

logger = logging.getLogger(__name__)


# Pydantic argument schemas for LangChain tools
class CalculatorInput(BaseModel):
    expression: str = Field(..., description="The mathematical expression to evaluate, e.g. '(45 * 2) / 3' or 'sqrt(144) + 10'")


class WeatherInput(BaseModel):
    location: str = Field(..., description="City and optional country name, e.g., 'Paris', 'Tokyo', 'San Francisco, CA'")


class DocumentSearchInput(BaseModel):
    query: str = Field(..., description="The search term, keywords, or question to search within uploaded documents")
    doc_name: Optional[str] = Field(None, description="Optional filename to search within a specific document")


class MCPClientManager:
    """Manages connections to the MCP Server and executes tools with Redis caching."""

    def __init__(self, sse_url: str, exec_url: str):
        self.sse_url = sse_url
        self.exec_url = exec_url

    async def _execute_via_mcp_sse(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Execute tool via official MCP Python SDK SSE client."""
        from mcp.client.sse import sse_client
        from mcp.client.session import ClientSession

        async with sse_client(self.sse_url, timeout=5.0) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                response = await session.call_tool(tool_name, arguments=arguments)
                # Parse MCP response content
                if response and hasattr(response, "content") and response.content:
                    texts = [item.text for item in response.content if hasattr(item, "text")]
                    return "\n".join(texts)
                return str(response)

    async def _execute_via_http_fallback(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Fallback direct HTTP execution if SSE connection is unavailable."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                self.exec_url,
                json={"tool": tool_name, "arguments": arguments},
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("result", ""))

    async def _execute_local_fallback(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """In-process fallback executing tool implementations directly."""
        try:
            if tool_name == "calculate":
                from mcp_server.tools.calculator import evaluate_expression
                return evaluate_expression(arguments.get("expression", ""))
            elif tool_name == "get_weather":
                from mcp_server.tools.weather import get_weather_data, format_weather_summary
                data = await get_weather_data(arguments.get("location", ""))
                return format_weather_summary(data)
            elif tool_name == "search_document":
                from app.services.document_search import search_uploaded_documents, format_search_results
                data = search_uploaded_documents(
                    query=arguments.get("query", ""),
                    doc_filter=arguments.get("doc_name"),
                    docs_dir=settings.DOCUMENTS_DIR,
                )
                return format_search_results(data)
        except ImportError:
            raise RuntimeError(
                f"Tool '{tool_name}' failed: MCP server is unreachable at {self.sse_url} / {self.exec_url}"
            )
        raise ValueError(f"Unknown tool: {tool_name}")

    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Tuple[str, bool]:
        """
        Execute tool with Redis caching layer.
        Returns: (result_string, cache_hit_boolean)
        """
        cache_key: Optional[str] = None
        cache_ttl: int = settings.REDIS_DEFAULT_TTL

        # Check caching strategies for cache-eligible tools
        if tool_name == "get_weather":
            loc = arguments.get("location", "").strip().lower()
            cache_key = f"cache:weather:{loc}"
            cache_ttl = settings.WEATHER_CACHE_TTL
        elif tool_name == "search_document":
            q = arguments.get("query", "").strip().lower()
            doc = (arguments.get("doc_name") or "*").strip().lower()
            cache_key = f"cache:doc_search:{q}:{doc}"
            cache_ttl = settings.DOC_CACHE_TTL

        # 1. Attempt Cache Lookup
        if cache_key:
            cached_val = await cache_service.get(cache_key)
            if cached_val is not None:
                logger.info(f"⚡ Cache HIT for {tool_name} [{cache_key}]")
                return cached_val, True
            logger.info(f"💾 Cache MISS for {tool_name} [{cache_key}]")

        # 2. Invoke Tool (SSE -> HTTP Fallback -> Local In-Process Fallback)
        result_str = ""
        try:
            result_str = await self._execute_via_mcp_sse(tool_name, arguments)
        except Exception as e_sse:
            logger.debug(f"MCP SSE invocation failed ({e_sse}), trying direct HTTP...")
            try:
                result_str = await self._execute_via_http_fallback(tool_name, arguments)
            except Exception as e_http:
                logger.debug(f"MCP HTTP invocation failed ({e_http}), falling back to local runner...")
                result_str = await self._execute_local_fallback(tool_name, arguments)

        # 3. Store in Cache with TTL
        if cache_key and result_str and not result_str.startswith("Weather Error"):
            await cache_service.set(cache_key, result_str, ttl_seconds=cache_ttl)

        return result_str, False

    def get_langchain_tools(self, execution_callback=None) -> List[StructuredTool]:
        """
        Returns a list of LangChain StructuredTools bound to the MCP server.
        Optional execution_callback(tool_name, args, result, cache_hit) for stream logging.
        """
        async def _calc_tool(expression: str) -> str:
            res, hit = await self.call_tool("calculate", {"expression": expression})
            if execution_callback:
                await execution_callback("calculate", {"expression": expression}, res, hit)
            return res

        async def _weather_tool(location: str) -> str:
            res, hit = await self.call_tool("get_weather", {"location": location})
            if execution_callback:
                await execution_callback("get_weather", {"location": location}, res, hit)
            return res

        async def _doc_tool(query: str, doc_name: Optional[str] = None) -> str:
            res, hit = await self.call_tool("search_document", {"query": query, "doc_name": doc_name})
            if execution_callback:
                await execution_callback("search_document", {"query": query, "doc_name": doc_name}, res, hit)
            return res

        return [
            StructuredTool.from_function(
                coroutine=_calc_tool,
                name="calculate",
                description="Safely evaluate mathematical expressions including arithmetic, trigonometry, square root, powers, logarithms, and constants (pi, e).",
                args_schema=CalculatorInput,
            ),
            StructuredTool.from_function(
                coroutine=_weather_tool,
                name="get_weather",
                description="Retrieve current weather conditions, temperature, humidity, wind speed, and status for any city worldwide.",
                args_schema=WeatherInput,
            ),
            StructuredTool.from_function(
                coroutine=_doc_tool,
                name="search_document",
                description="Search uploaded documents and retrieve matching text snippets and relevance scores.",
                args_schema=DocumentSearchInput,
            ),
        ]


# Singleton instance
mcp_client = MCPClientManager(settings.MCP_SERVER_URL, settings.MCP_SERVER_EXEC_URL)

