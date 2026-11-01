"""
Official Model Context Protocol (MCP) Server.
Exposes tools for Calculator, Weather Information, and Document Search.
Supports SSE (Server-Sent Events) transport as well as HTTP health/direct invocation endpoints.
"""

import json
import os
import sys
from typing import Any, Dict, Optional

from starlette.requests import Request
from starlette.responses import JSONResponse
import uvicorn
from mcp.server.mcpserver import MCPServer

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tools.calculator import evaluate_expression
from tools.weather import get_weather_data, format_weather_summary
from tools.document_search import search_uploaded_documents, format_search_results

# Initialize MCP Server
mcp = MCPServer(
    name="fullstack-ai-mcp-server",
    instructions="Provides utility tools including mathematical calculation, live weather reporting, and document retrieval.",
)


@mcp.tool(
    name="calculate",
    description="Evaluate a mathematical expression safely. Supports arithmetic (+, -, *, /, //, %, **), constants (pi, e, tau), and functions (sqrt, sin, cos, tan, log, abs, etc.).",
)
def calculate(expression: str) -> str:
    """
    Perform a mathematical calculation safely.

    Args:
        expression: A valid mathematical string like '(15 * 4) / 2' or 'sqrt(144) + sin(pi / 2)'
    """
    return evaluate_expression(expression)


@mcp.tool(
    name="get_weather",
    description="Retrieve current weather conditions, temperature, humidity, and forecast for any city or location worldwide using real-time meteorological data.",
)
async def get_weather(location: str) -> str:
    """
    Retrieve live weather for a location.

    Args:
        location: City or location name, e.g., 'Tokyo', 'San Francisco', 'London', 'Paris'
    """
    data = await get_weather_data(location)
    return format_weather_summary(data)


@mcp.tool(
    name="search_document",
    description="Search and retrieve relevant text passages and snippets from uploaded documents based on query terms or topics.",
)
def search_document(query: str, doc_name: Optional[str] = None) -> str:
    """
    Search indexed documents for relevant content.

    Args:
        query: The search term, topic, or question to look up in the uploaded documents.
        doc_name: Optional document filename to restrict search to a specific file.
    """
    data = search_uploaded_documents(query=query, doc_filter=doc_name)
    return format_search_results(data)


# Custom Health Check Endpoint
@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request) -> JSONResponse:
    """Health check endpoint for container orchestrators and backend discovery."""
    return JSONResponse({
        "status": "healthy",
        "service": "mcp-server",
        "protocol": "Model Context Protocol (MCP) 2.x",
        "transport": "SSE (/sse)",
        "available_tools": [
            {
                "name": "calculate",
                "description": "Safe math evaluator",
            },
            {
                "name": "get_weather",
                "description": "Live weather reporting",
            },
            {
                "name": "search_document",
                "description": "Document content search",
            },
        ],
    })


# Direct HTTP tool execution endpoint (for testing or direct microservice queries)
@mcp.custom_route("/api/tools/execute", methods=["POST"])
async def direct_execute_tool(request: Request) -> JSONResponse:
    """Execute a registered tool directly over HTTP."""
    try:
        body = await request.json()
        tool_name = body.get("tool")
        args = body.get("arguments", {})

        if tool_name == "calculate":
            result = calculate(args.get("expression", ""))
        elif tool_name == "get_weather":
            result = await get_weather(args.get("location", ""))
        elif tool_name == "search_document":
            result = search_document(args.get("query", ""), args.get("doc_name"))
        else:
            return JSONResponse(
                {"error": f"Tool '{tool_name}' not found. Supported: calculate, get_weather, search_document"},
                status_code=404,
            )

        return JSONResponse({"status": "success", "tool": tool_name, "result": result})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# Create ASGI Starlette application exposing SSE and custom routes
app = mcp.sse_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting MCP Server on {host}:{port} ...")
    uvicorn.run(app, host=host, port=port)

