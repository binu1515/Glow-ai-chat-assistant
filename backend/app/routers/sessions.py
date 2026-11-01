"""
Conversation Sessions API Router.
CRUD endpoints for managing persistent chat sessions and message histories.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.message import ChatMessage
from app.models.session import ConversationSession
from app.schemas.chat import (
    ChatMessageResponse,
    SessionDetailResponse,
    SessionResponse,
)

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])


class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"
    provider: Optional[str] = "gemini"
    model: Optional[str] = "gemini-1.5-flash"


class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None


@router.get("", response_model=List[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    """List all conversation sessions ordered by most recently updated."""
    # Query sessions along with message count
    stmt = (
        select(
            ConversationSession,
            func.count(ChatMessage.id).label("message_count")
        )
        .outerjoin(ChatMessage, ConversationSession.id == ChatMessage.session_id)
        .group_by(ConversationSession.id)
        .order_by(ConversationSession.updated_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    result = []
    for session, msg_count in rows:
        result.append(SessionResponse(
            id=session.id,
            title=session.title,
            provider=session.provider,
            model=session.model,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=msg_count,
        ))
    return result


@router.post("", response_model=SessionResponse)
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new independent chat session."""
    session = ConversationSession(
        title=request.title or "New Conversation",
        provider=request.provider or "gemini",
        model=request.model or "gemini-1.5-flash",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(
        id=session.id,
        title=session.title,
        provider=session.provider,
        model=session.model,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full conversation history for a specific session."""
    stmt = (
        select(ConversationSession)
        .options(selectinload(ConversationSession.messages))
        .where(ConversationSession.id == session_id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages_data = [
        ChatMessageResponse.model_validate(m) for m in session.messages
    ]

    return SessionDetailResponse(
        id=session.id,
        title=session.title,
        provider=session.provider,
        model=session.model,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages_data,
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update session title or assigned model."""
    stmt = select(ConversationSession).where(ConversationSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if request.title is not None:
        session.title = request.title
    if request.provider is not None:
        session.provider = request.provider
    if request.model is not None:
        session.model = request.model

    await db.commit()
    await db.refresh(session)
    return SessionResponse.model_validate(session)


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a conversation session and all its associated messages."""
    stmt = select(ConversationSession).where(ConversationSession.id == session_id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "success", "message": f"Session {session_id} deleted"}

