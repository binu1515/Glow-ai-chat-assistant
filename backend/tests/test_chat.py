"""
Integration Tests for Sessions and Chat Database Endpoints.
"""

import pytest
import os
import sys
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import init_db


@pytest.mark.asyncio
async def test_session_lifecycle():
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a session
        create_resp = await client.post(
            "/api/sessions",
            json={"title": "Test Math Session", "provider": "gemini", "model": "gemini-1.5-flash"},
        )
        assert create_resp.status_code == 200
        session_data = create_resp.json()
        session_id = session_data["id"]
        assert session_data["title"] == "Test Math Session"

        # 2. List sessions
        list_resp = await client.get("/api/sessions")
        assert list_resp.status_code == 200
        sessions = list_resp.json()
        assert any(s["id"] == session_id for s in sessions)

        # 3. Retrieve session details
        detail_resp = await client.get(f"/api/sessions/{session_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["id"] == session_id
        assert "messages" in detail

        # 4. Delete session
        del_resp = await client.delete(f"/api/sessions/{session_id}")
        assert del_resp.status_code == 200

        # Verify 404 after deletion
        check_resp = await client.get(f"/api/sessions/{session_id}")
        assert check_resp.status_code == 404

