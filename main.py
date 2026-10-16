import os
from fastapi import FastAPI, HTTPException, Depends, Request, status, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db, check_db_connection
from redis_client import redis_client
from rate_limiter import check_rate_limit
from auth import get_current_user, get_current_user_optional, create_access_token
from models import User, URL
from schemas import (
    URLCreate,
    URLResponse,
    URLListResponse,
    URLStatsResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from services.auth_service import register_user, authenticate_user
from services.url_services import (
    create_short_url,
    get_url_by_short_code,
    get_user_urls,
    delete_user_url,
    get_url_stats,
)

load_dotenv()

app = FastAPI(
    title="TinyURL Clone API",
    description="Production-ready URL shortener API with analytics, authentication, and resilient caching.",
    version="1.0.0"
)

# CORS Configuration
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_SHORT_URL = os.getenv("BASE_SHORT_URL")


def _build_url_response(url: URL, request_base_url: str) -> URLResponse:
    # Use explicit public base domain if configured; otherwise use request base URL
    base = BASE_SHORT_URL if BASE_SHORT_URL and BASE_SHORT_URL.strip() else request_base_url
    clean_base = base.rstrip("/") + "/"
    short_url = f"{clean_base}{url.short_code}"
    return URLResponse(
        id=url.id,
        short_code=url.short_code,
        short_url=short_url,

        long_url=url.long_url,
        created_at=url.created_at,
        expires_at=url.expires_at,
        is_active=url.is_active,
        clicks=url.clicks,
        user_id=url.user_id,
    )


# --- System & Health Endpoints ---

@app.get("/")
def home():
    return {
        "name": "TinyURL API",
        "status": "healthy",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    db_ok = check_db_connection()
    redis_ok = redis_client.is_connected()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_ok else "disabled_or_unavailable",
    }


# --- Authentication Endpoints ---

@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: UserCreate,
    db: Session = Depends(get_db)
):
    user = register_user(db, data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
    return user


@app.post(
    "/api/auth/login",
    response_model=TokenResponse
)
def login(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@app.get(
    "/api/auth/me",
    response_model=UserResponse
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- URL Shortening & Management Endpoints ---

@app.post(
    "/api/urls",
    response_model=URLResponse,
    status_code=status.HTTP_201_CREATED
)
def create_url(
    data: URLCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    # Enforce rate limit per IP
    check_rate_limit(request)

    user_id = current_user.id if current_user else None

    try:
        url = create_short_url(db, data, user_id=user_id)
        base_url = str(request.base_url)
        return _build_url_response(url, base_url)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create short URL. Please try again."
        )


@app.get(
    "/api/urls",
    response_model=URLListResponse
)
def list_user_urls(
    request: Request,
    search: str | None = Query(None, description="Search term for URL or short code"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items, total = get_user_urls(
        db,
        user_id=current_user.id,
        search=search,
        page=page,
        limit=limit
    )

    base_url = str(request.base_url)
    response_items = [_build_url_response(item, base_url) for item in items]

    return URLListResponse(
        items=response_items,
        total=total,
        page=page,
        limit=limit
    )


@app.delete(
    "/api/urls/{url_id}",
    status_code=status.HTTP_200_OK
)
def delete_url(
    url_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    success = delete_user_url(db, url_id=url_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="URL not found or unauthorized to delete."
        )
    return {"message": "URL deleted successfully"}


@app.get(
    "/api/urls/{short_code}/stats",
    response_model=URLStatsResponse
)
def get_stats(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db)
):
    url = get_url_stats(db, short_code)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found."
        )

    base = BASE_SHORT_URL if BASE_SHORT_URL and BASE_SHORT_URL.strip() else str(request.base_url)
    clean_base = base.rstrip("/") + "/"
    return URLStatsResponse(
        short_code=url.short_code,
        short_url=f"{clean_base}{url.short_code}",

        long_url=url.long_url,
        created_at=url.created_at,
        expires_at=url.expires_at,
        clicks=url.clicks,
        is_active=url.is_active,
    )


# --- Public Short URL Redirection ---

@app.get("/{short_code}")
def redirect_url(
    short_code: str,
    db: Session = Depends(get_db)
):
    # Skip routing if requested short_code is an API or reserved route
    if short_code in ("api", "docs", "redoc", "openapi.json", "health", "favicon.ico"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )

    long_url = get_url_by_short_code(db, short_code)

    if not long_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Short URL not found, expired, or deactivated."
        )

    return RedirectResponse(
        url=long_url,
        status_code=status.HTTP_302_FOUND
    )