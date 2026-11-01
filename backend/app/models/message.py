"""
Chat Message Model.
Represents individual turns (user, assistant, tool calls, tool results) in a session.
"""

from datetime import datetime
import uuid
from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("conversation_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=True)
    tool_calls = Column(JSON, nullable=True)    # List of tool calls: [{"name": "...", "arguments": {...}}]
    tool_results = Column(JSON, nullable=True)  # List of results: [{"name": "...", "result": "...", "cache_hit": bool}]
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("ConversationSession", back_populates="messages")

