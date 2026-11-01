"""
Redis Caching Service with Fallback and Hit/Miss Metrics.
Provides TTL caching for external operations (Weather API, Document searches).
Tracks cache hit/miss statistics and supports granular or namespace invalidation.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional
import redis.asyncio as aioredis
from app.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None
        self._memory_cache: Dict[str, Dict[str, Any]] = {}  # Fallback in-memory store
        self._memory_stats = {"hits": 0, "misses": 0}
        self.is_connected = False

    async def get_client(self) -> Optional[aioredis.Redis]:
        """Lazy initialization of the async Redis client."""
        if self._redis is None:
            try:
                self._redis = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                    socket_timeout=2.0,
                )
                await self._redis.ping()
                self.is_connected = True
                logger.info(f"Connected to Redis at {self.redis_url}")
            except Exception as e:
                logger.warning(f"Could not connect to Redis ({e}). Falling back to in-memory cache.")
                self.is_connected = False
                self._redis = None
        return self._redis

    async def get(self, key: str) -> Optional[str]:
        """Retrieve value from cache. Updates hit/miss metrics."""
        client = await self.get_client()

        if client and self.is_connected:
            try:
                val = await client.get(key)
                if val is not None:
                    await client.hincrby("metrics:cache", "hits", 1)
                    return val
                else:
                    await client.hincrby("metrics:cache", "misses", 1)
                    return None
            except Exception as e:
                logger.error(f"Redis get error: {e}. Falling back to memory.")
                self.is_connected = False

        # In-memory fallback
        item = self._memory_cache.get(key)
        now = time.time()
        if item and item.get("expires_at", 0) > now:
            self._memory_stats["hits"] += 1
            return item["value"]
        elif item:
            # Expired
            del self._memory_cache[key]

        self._memory_stats["misses"] += 1
        return None

    async def set(self, key: str, value: str, ttl_seconds: int = 300) -> bool:
        """Store value with expiration TTL (seconds)."""
        client = await self.get_client()

        if client and self.is_connected:
            try:
                await client.setex(key, ttl_seconds, value)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                self.is_connected = False

        # In-memory fallback
        self._memory_cache[key] = {
            "value": value,
            "expires_at": time.time() + ttl_seconds,
        }
        return True

    async def invalidate(self, pattern: str = "*") -> int:
        """
        Invalidate cache keys matching a pattern.
        e.g., 'weather:*', 'doc_search:*', or '*' for all.
        """
        deleted_count = 0
        client = await self.get_client()

        if client and self.is_connected:
            try:
                if pattern == "*":
                    # Delete all keys matching application prefix
                    keys = await client.keys("cache:*")
                else:
                    keys = await client.keys(pattern)

                if keys:
                    deleted_count = await client.delete(*keys)
                return deleted_count
            except Exception as e:
                logger.error(f"Redis invalidate error: {e}")
                self.is_connected = False

        # In-memory fallback
        prefix = pattern.replace("*", "")
        keys_to_delete = [k for k in self._memory_cache if k.startswith(prefix) or pattern == "*"]
        for k in keys_to_delete:
            del self._memory_cache[k]
        return len(keys_to_delete)

    async def get_stats(self) -> Dict[str, Any]:
        """Return cache hit, miss, ratio, and cached key counts."""
        client = await self.get_client()

        if client and self.is_connected:
            try:
                stats = await client.hgetall("metrics:cache")
                hits = int(stats.get("hits", 0))
                misses = int(stats.get("misses", 0))
                total = hits + misses
                ratio = round((hits / total) * 100, 2) if total > 0 else 0.0

                keys = await client.keys("cache:*")
                return {
                    "backend": "redis",
                    "status": "connected",
                    "hits": hits,
                    "misses": misses,
                    "total_requests": total,
                    "hit_ratio_percent": ratio,
                    "cached_keys_count": len(keys),
                    "active_keys": keys[:50],  # preview up to 50
                }
            except Exception as e:
                logger.error(f"Redis stats error: {e}")
                self.is_connected = False

        hits = self._memory_stats["hits"]
        misses = self._memory_stats["misses"]
        total = hits + misses
        ratio = round((hits / total) * 100, 2) if total > 0 else 0.0
        now = time.time()
        active_keys = [k for k, v in self._memory_cache.items() if v.get("expires_at", 0) > now]

        return {
            "backend": "in-memory (redis fallback)",
            "status": "offline_fallback",
            "hits": hits,
            "misses": misses,
            "total_requests": total,
            "hit_ratio_percent": ratio,
            "cached_keys_count": len(active_keys),
            "active_keys": active_keys[:50],
        }


# Global cache service instance
cache_service = CacheService(settings.REDIS_URL)

