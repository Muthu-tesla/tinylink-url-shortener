import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)


class ResilientRedisClient:
    """A resilient wrapper around Redis that fails gracefully to None

    when Redis is not running, unconfigured, or unreachable.
    """

    def __init__(self):
        self._client = None
        self._init_client()

    def _init_client(self):
        try:
            if REDIS_URL:
                self._client = redis.Redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1,
                )
            elif REDIS_HOST:
                self._client = redis.Redis(
                    host=REDIS_HOST,
                    port=REDIS_PORT,
                    password=REDIS_PASSWORD,
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1,
                )
            else:
                # No Redis host/URL configured; run in disabled mode
                self._client = None
        except Exception as e:
            print(f"Notice: Redis initialization failed: {e}. Running without Redis cache.")
            self._client = None

    def is_connected(self) -> bool:
        if not self._client:
            return False
        try:
            return bool(self._client.ping())
        except Exception:
            return False

    def get(self, key: str):
        if not self._client:
            return None
        try:
            return self._client.get(key)
        except Exception:
            return None

    def set(self, key: str, value: str, ex: int | None = None):
        if not self._client:
            return False
        try:
            return self._client.set(key, value, ex=ex)
        except Exception:
            return False

    def delete(self, key: str):
        if not self._client:
            return False
        try:
            return self._client.delete(key)
        except Exception:
            return False

    def incr(self, key: str) -> int | None:
        if not self._client:
            return None
        try:
            return self._client.incr(key)
        except Exception:
            return None

    def expire(self, key: str, seconds: int):
        if not self._client:
            return False
        try:
            return self._client.expire(key, seconds)
        except Exception:
            return False


redis_client = ResilientRedisClient()
