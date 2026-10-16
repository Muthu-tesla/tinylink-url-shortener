import re
from urllib.parse import urlparse

BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

RESERVED_ALIASES = {
    "api",
    "docs",
    "redoc",
    "openapi.json",
    "health",
    "auth",
    "login",
    "register",
    "dashboard",
    "analytics",
    "assets",
    "favicon.ico",
    "admin",
    "static",
    "status",
    "urls",
    "user",
}


def encode_base62(number: int) -> str:
    """Encode an integer to a Base62 alphanumeric string."""
    if number == 0:
        return BASE62[0]

    result = ""
    while number > 0:
        remainder = number % 62
        result = BASE62[remainder] + result
        number = number // 62

    return result


def validate_custom_alias(alias: str) -> tuple[bool, str]:
    """Validate a custom alias against length, character set, and reserved words."""
    cleaned = alias.strip()
    if len(cleaned) < 3 or len(cleaned) > 30:
        return False, "Custom alias must be between 3 and 30 characters long."

    if not re.match(r"^[a-zA-Z0-9_-]+$", cleaned):
        return False, "Custom alias can only contain letters, numbers, hyphens, and underscores."

    if cleaned.lower() in RESERVED_ALIASES:
        return False, f"'{cleaned}' is a reserved keyword and cannot be used as an alias."

    return True, ""


def validate_url_safety(url_str: str) -> tuple[bool, str]:
    """Validate that the URL has an allowed scheme (http/https) and a valid host."""
    try:
        parsed = urlparse(url_str.strip())
        if parsed.scheme.lower() not in ("http", "https"):
            return False, "URL must start with http:// or https://"

        if not parsed.netloc:
            return False, "URL must have a valid domain or host name."

        # Block localhost and private IP loopbacks to protect against SSRF/open redirect attacks
        hostname = (parsed.hostname or "").lower()
        if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1"):
            return False, "Localhost and loopback destinations are not allowed."

        return True, ""
    except Exception:
        return False, "Invalid URL format."