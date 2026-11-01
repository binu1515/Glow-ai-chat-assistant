"""
Pydantic Schemas for AI Model and Provider Configuration.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    id: str
    name: str
    context_window: int
    input_cost_per_million: float
    output_cost_per_million: float
    recommended: bool = False


class ProviderInfo(BaseModel):
    id: str
    name: str
    models: List[ModelInfo]
    has_api_key: bool = False
    masked_key: Optional[str] = None


class ActiveModelConfig(BaseModel):
    provider: str = "gemini"
    model: str = "gemini-3.5-flash-lite"
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(2048, ge=64, le=8192)
    system_prompt: str = "You are a helpful, accurate, and concise AI assistant with access to tools via Model Context Protocol."
    memory_window: int = Field(10, ge=1, le=50)


class UpdateConfigRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=64, le=8192)
    system_prompt: Optional[str] = None
    memory_window: Optional[int] = Field(None, ge=1, le=50)
    # API keys dictionary: {"openai": "sk-...", "gemini": "AIza...", "anthropic": "sk-ant-..."}
    api_keys: Optional[Dict[str, str]] = None


class ConfigResponse(BaseModel):
    active_config: ActiveModelConfig
    providers: List[ProviderInfo]

