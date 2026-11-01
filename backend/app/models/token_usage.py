"""
Token Usage Log Model.
Tracks actual input and output tokens consumed per LLM call and estimated cost.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base


class TokenUsageLog(Base):
    __tablename__ = "token_usage_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("conversation_sessions.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    model = Column(String(100), nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    estimated_cost_usd = Column(Float, default=0.0, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("ConversationSession", back_populates="token_logs")

