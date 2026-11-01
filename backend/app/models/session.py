"""
Conversation Session Model.
Represents an isolated chat conversation thread.
"""

from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, String
from sqlalchemy.orm import relationship
from app.database import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New Conversation")
    provider = Column(String(50), nullable=False, default="gemini")
    model = Column(String(100), nullable=False, default="gemini-1.5-flash")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    token_logs = relationship("TokenUsageLog", back_populates="session", cascade="all, delete-orphan")

