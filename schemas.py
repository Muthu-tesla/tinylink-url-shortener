from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class URLCreate(BaseModel):
    long_url: str
    custom_alias: str | None = None
    expires_at: datetime | None = None


class URLResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    short_code: str
    short_url: str | None = None
    long_url: str
    created_at: datetime
    expires_at: datetime | None = None
    is_active: bool = True
    clicks: int = 0
    user_id: int | None = None


class URLListResponse(BaseModel):
    items: list[URLResponse]
    total: int
    page: int
    limit: int


class URLStatsResponse(BaseModel):
    short_code: str
    short_url: str | None = None
    long_url: str
    created_at: datetime
    expires_at: datetime | None = None
    clicks: int
    is_active: bool


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse