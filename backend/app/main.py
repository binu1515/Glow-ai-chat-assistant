"""
FastAPI Application Entrypoint.
Sets up CORS, registers API routers, and initializes the database and documents directory.
"""

from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import (
    analytics_router,
    cache_router,
    chat_router,
    config_router,
    documents_router,
    sessions_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("mcp_chatbot")


def seed_sample_documents():
    """Seed initial sample document if documents directory is empty."""
    os.makedirs(settings.DOCUMENTS_DIR, exist_ok=True)
    sample_file = os.path.join(settings.DOCUMENTS_DIR, "company_ai_policy.md")
    if not os.path.exists(sample_file):
        with open(sample_file, "w", encoding="utf-8") as f:
            f.write(
                "# Enterprise AI & Cloud Computing Policy 2026\n\n"
                "## 1. Overview\n"
                "This policy defines best practices for deploying LLMs, MCP servers, and vector databases in corporate applications.\n\n"
                "## 2. Model Context Protocol (MCP)\n"
                "All internal microservices must adopt the Model Context Protocol (MCP) by Anthropic for exposing tools to autonomous AI agents. "
                "Tools must provide strict JSON schemas and safe sandboxed execution.\n\n"
                "## 3. Redis Caching Directives\n"
                "All external API calls (including third-party weather, search, and document queries) must be cached in Redis with an appropriate TTL "
                "(Time-To-Live). Cache invalidation must be triggered automatically whenever underlying data sources are updated.\n\n"
                "## 4. Token Usage & Cost Management\n"
                "Engineering teams must track both prompt tokens and completion tokens in real-time. Usage alerts trigger if daily spending exceeds $50.00 USD.\n\n"
                "## 5. Security & Secret Zero\n"
                "API keys for OpenAI, Anthropic, and Google Gemini must never be logged or rendered in frontend responses. Keys must be encrypted using AES-256.\n"
            )
        logger.info(f"Seeded sample document at {sample_file}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Initializing database tables...")
    await init_db()
    seed_sample_documents()
    logger.info(f"Application {settings.APP_NAME} v{settings.APP_VERSION} ready.")
    yield
    logger.info("Application shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    description="Full-stack AI Chatbot integrating MCP Server, LangChain memory, Redis caching, and Token Usage monitoring.",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local and containerized access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(config_router)
app.include_router(cache_router)
app.include_router(analytics_router)
app.include_router(documents_router)


@app.get("/health")
async def health_check():
    """Health probe endpoint for container orchestrators."""
    return JSONResponse({
        "status": "healthy",
        "service": "fastapi-backend",
        "version": settings.APP_VERSION,
        "default_provider": settings.DEFAULT_PROVIDER,
        "default_model": settings.DEFAULT_MODEL,
    })


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "health": "/health",
    }

