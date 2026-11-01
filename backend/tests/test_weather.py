"""
Unit Tests for MCP Weather Tool.
"""

import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from mcp_server.tools.weather import get_weather_data, format_weather_summary


@pytest.mark.asyncio
async def test_weather_retrieval_success():
    data = await get_weather_data("Tokyo")
    assert "error" not in data
    assert "Tokyo" in data.get("location", "")
    assert "temperature_c" in data
    assert "condition" in data

    summary = format_weather_summary(data)
    assert "Tokyo" in summary
    assert "°C" in summary


@pytest.mark.asyncio
async def test_weather_invalid_location():
    data = await get_weather_data("xyzabc123nonexistentcity404")
    assert "error" in data
    summary = format_weather_summary(data)
    assert "Weather Error" in summary

