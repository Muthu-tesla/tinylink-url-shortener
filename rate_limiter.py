import os
import time
import threading
from collections import defaultdict
from fastapi import Request, HTTPException
from redis_client import redis_client

LIMIT = int(os.getenv("RATE_LIMIT_MAX", "100"))
WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")

# Thread-safe in-memory rate limiter fallback when Redis is unavailable
_memory_limiter_lock = threading.Lock()
_memory_limiter_store: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    """Extract client IP safely. Only trusts X-Forwarded-For when explicitly configured."""
    direct_ip = request.client.host if request.client and request.client.host else "unknown"

    if TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Take the first entry (client IP before proxies), stripping whitespace
            parts = [p.strip() for p in forwarded_for.split(",") if p.strip()]
            if parts:
                return parts[0]

    return direct_ip


def check_rate_limit(request: Request):
    """Rate limiter enforcing LIMIT requests per WINDOW seconds per client IP.

    Uses Redis if available; falls back to process-local in-memory tracking.
    Note: Process-local fallback tracks within a single process only.
    """
    client_ip = get_client_ip(request)
    key = f"rate:{client_ip}"

    # 1. Try Redis first if connected
    if redis_client.is_connected():
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, WINDOW)
        if count and count > LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        return

    # 2. Resilient In-Memory Fallback
    now = time.time()
    cutoff = now - WINDOW
    with _memory_limiter_lock:
        recent_timestamps = [t for t in _memory_limiter_store[client_ip] if t > cutoff]
        if len(recent_timestamps) >= LIMIT:
            _memory_limiter_store[client_ip] = recent_timestamps
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        recent_timestamps.append(now)
        _memory_limiter_store[client_ip] = recent_timestamps