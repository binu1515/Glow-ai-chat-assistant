"""
Pydantic Schemas for Chat Interactions and Streaming.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1, description="User prompt message")
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    system_prompt: Optional[str] = None


class ToolInvocation(BaseModel):
    tool: str
    arguments: Dict[str, Any]
    result: Optional[str] = None
    cache_hit: bool = False


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_results: Optional[List[Dict[str, Any]]] = None
    created_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    provider: str
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class SessionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    provider: str
    model: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []
