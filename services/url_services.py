from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models import URL
from schemas import URLCreate
from utils import encode_base62, validate_custom_alias, validate_url_safety
from redis_client import redis_client


def create_short_url(
    db: Session,
    data: URLCreate,
    user_id: int | None = None
) -> URL:
    # 1. Validate destination URL
    is_valid_url, url_error = validate_url_safety(data.long_url)
    if not is_valid_url:
        raise ValueError(url_error)

    # 2. Handle Custom Alias if requested
    short_code = None
    if data.custom_alias and data.custom_alias.strip():
        alias = data.custom_alias.strip()
        is_valid_alias, alias_error = validate_custom_alias(alias)
        if not is_valid_alias:
            raise ValueError(alias_error)

        # Check if alias is already taken
        existing = db.query(URL).filter(URL.short_code == alias).first()
        if existing:
            raise ValueError(f"Custom alias '{alias}' is already in use. Please choose another.")
        short_code = alias

    # 3. Create URL record
    url = URL(
        long_url=data.long_url.strip(),
        expires_at=data.expires_at,
        user_id=user_id,
        short_code=short_code,
        clicks=0,
        is_active=True
    )

    db.add(url)
    db.flush()

    # If no custom alias was given, generate short code from the database ID using Base62
    if not short_code:
        generated_code = encode_base62(url.id)
        # Ensure minimum length of 4 characters for aesthetically pleasing short links
        if len(generated_code) < 4:
            generated_code = encode_base62(100000 + url.id)
        url.short_code = generated_code

    db.commit()
    db.refresh(url)

    # Update cache if Redis is available
    if redis_client.is_connected() and url.short_code:
        redis_client.set(f"url:{url.short_code}", url.long_url, ex=3600)

    return url


def get_url_by_short_code(
    db: Session,
    short_code: str
) -> str | None:
    """Retrieve the destination URL, validate expiration/active status,

    and accurately record the click in the database.
    """
    url = db.query(URL).filter(
        URL.short_code == short_code
    ).first()

    if not url:
        return None

    if not url.is_active:
        return None

    if url.expires_at is not None:
        # Normalize comparison whether expires_at is timezone-aware or naive
        now = datetime.now(timezone.utc) if url.expires_at.tzinfo else datetime.utcnow()
        if url.expires_at <= now:
            return None

    # Increment click count in PostgreSQL
    try:
        url.clicks += 1
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Notice: Failed to increment clicks: {e}")

    # Cache destination in Redis if connected
    if redis_client.is_connected():
        redis_client.set(f"url:{short_code}", url.long_url, ex=3600)

    return url.long_url


def get_user_urls(
    db: Session,
    user_id: int,
    search: str | None = None,
    page: int = 1,
    limit: int = 20
) -> tuple[list[URL], int]:
    query = db.query(URL).filter(URL.user_id == user_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                URL.long_url.ilike(term),
                URL.short_code.ilike(term)
            )
        )

    total = query.count()
    offset = max(0, (page - 1) * limit)
    items = query.order_by(URL.created_at.desc()).offset(offset).limit(limit).all()

    return items, total


def delete_user_url(
    db: Session,
    url_id: int,
    user_id: int
) -> bool:
    url = db.query(URL).filter(
        URL.id == url_id,
        URL.user_id == user_id
    ).first()

    if not url:
        return False

    short_code = url.short_code
    db.delete(url)
    db.commit()

    if short_code and redis_client.is_connected():
        redis_client.delete(f"url:{short_code}")

    return True


def get_url_stats(
    db: Session,
    short_code: str
) -> URL | None:
    return db.query(URL).filter(URL.short_code == short_code).first()