"""
Redis Cache Management API Router.
Exposes hit/miss metrics, active cached keys, and cache invalidation endpoints.
"""

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.redis_cache import cache_service

router = APIRouter(prefix="/api/cache", tags=["Cache"])


class InvalidateRequest(BaseModel):
    pattern: Optional[str] = "*"  # e.g., 'cache:weather:*', 'cache:doc_search:*', or '*'


@router.get("/stats")
async def get_cache_stats():
    """Retrieve real-time cache performance metrics: hits, misses, hit ratio, and active keys."""
    return await cache_service.get_stats()


@router.post("/invalidate")
async def invalidate_cache(request: InvalidateRequest = InvalidateRequest()):
    """
    Invalidate cached entries by pattern.
    Use '*' to flush all cached queries, or 'cache:weather:*' for weather only.
    """
    deleted_count = await cache_service.invalidate(request.pattern or "*")
    stats = await cache_service.get_stats()
    return {
        "status": "success",
        "pattern": request.pattern,
        "keys_invalidated": deleted_count,
        "current_stats": stats,
    }

