"""
Unit Tests for Redis and In-Memory Caching Layer.
Verifies get, set with TTL, hit/miss tracking, and invalidation.
"""

import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.redis_cache import CacheService


@pytest.mark.asyncio
async def test_cache_miss_and_hit():
    cache = CacheService("redis://localhost:9999/0")  # will trigger fallback

    # 1. Cache Miss
    val = await cache.get("cache:test:user1")
    assert val is None

    # 2. Set value with TTL
    await cache.set("cache:test:user1", "sample_data", ttl_seconds=60)

    # 3. Cache Hit
    val2 = await cache.get("cache:test:user1")
    assert val2 == "sample_data"

    # 4. Check statistics
    stats = await cache.get_stats()
    assert stats["hits"] >= 1
    assert stats["misses"] >= 1
    assert stats["hit_ratio_percent"] > 0


@pytest.mark.asyncio
async def test_cache_invalidation():
    cache = CacheService("redis://localhost:9999/0")

    await cache.set("cache:weather:london", "mild rain", ttl_seconds=60)
    await cache.set("cache:weather:paris", "clear sky", ttl_seconds=60)
    await cache.set("cache:doc:policy", "doc content", ttl_seconds=60)

    # Invalidate only weather pattern
    deleted = await cache.invalidate("cache:weather:*")
    assert deleted >= 2

    # Verify weather keys are gone
    assert await cache.get("cache:weather:london") is None
    assert await cache.get("cache:weather:paris") is None

    # Verify doc key is retained
    assert await cache.get("cache:doc:policy") == "doc content"

