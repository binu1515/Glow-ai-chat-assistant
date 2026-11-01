"""
Pydantic Schemas for Token Usage Monitoring and Dashboard.
"""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class TokenLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    timestamp: datetime


class ModelUsageSummary(BaseModel):
    model: str
    provider: str
    total_calls: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float


class SessionUsageSummary(BaseModel):
    session_id: str
    session_title: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float


class TokenDashboardSummary(BaseModel):
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float
    total_requests: int
    active_provider: str
    active_model: str
    by_model: List[ModelUsageSummary]
    by_session: List[SessionUsageSummary]
    recent_logs: List[TokenLogItem]
