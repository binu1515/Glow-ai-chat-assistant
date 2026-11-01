"""
Application Configuration and Environment Settings.
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App Information
    APP_NAME: str = "Full-Stack AI Chatbot with MCP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mcp-chatbot-insecure-secret-key-change-in-prod-12345")

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/mcp_chatbot"
    )

    # Redis Cache Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_DEFAULT_TTL: int = int(os.getenv("REDIS_DEFAULT_TTL", "300"))  # 5 minutes
    WEATHER_CACHE_TTL: int = int(os.getenv("WEATHER_CACHE_TTL", "600"))  # 10 minutes
    DOC_CACHE_TTL: int = int(os.getenv("DOC_CACHE_TTL", "300"))        # 5 minutes

    # MCP Server Configuration
    MCP_SERVER_URL: str = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
    MCP_SERVER_EXEC_URL: str = os.getenv("MCP_SERVER_EXEC_URL", "http://localhost:8001/api/tools/execute")

    # Document Storage
    DOCUMENTS_DIR: str = os.getenv(
        "DOCUMENTS_DIR",
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "documents")
    )

    # Default LLM Provider Settings
    DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gemini-3.5-flash-lite")
    DEFAULT_TEMPERATURE: float = float(os.getenv("DEFAULT_TEMPERATURE", "0.7"))
    DEFAULT_MAX_TOKENS: int = int(os.getenv("DEFAULT_MAX_TOKENS", "2048"))
    DEFAULT_MEMORY_WINDOW: int = int(os.getenv("DEFAULT_MEMORY_WINDOW", "10"))

    # Provider API Keys (server-level fallbacks if not overridden in UI)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY", None)
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY", None)
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY", None)
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY", None)


settings = Settings()
