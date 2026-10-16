import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, URL


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def test_user(client):
    email = f"test_{int(datetime.utcnow().timestamp())}@example.com"
    password = "SecretPassword123!"
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": "Test User", "email": email, "password": password}
    )
    assert reg_resp.status_code == 201

    login_resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password}
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return {"email": email, "password": password, "headers": headers, "user": data["user"]}


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["database"] == "connected"


def test_register_and_login(client):
    email = f"user_{int(datetime.utcnow().timestamp())}@example.com"
    # Registration
    reg = client.post(
        "/api/auth/register",
        json={"name": "John Doe", "email": email, "password": "Password123!"}
    )
    assert reg.status_code == 201
    assert reg.json()["email"] == email

    # Duplicate registration fails
    dup = client.post(
        "/api/auth/register",
        json={"name": "John Doe", "email": email, "password": "Password123!"}
    )
    assert dup.status_code == 400

    # Login
    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "Password123!"}
    )
    assert login.status_code == 200
    assert "access_token" in login.json()

    # Login with wrong password
    bad_login = client.post(
        "/api/auth/login",
        json={"email": email, "password": "WrongPassword"}
    )
    assert bad_login.status_code == 401


def test_get_current_user(client, test_user):
    resp = client.get("/api/auth/me", headers=test_user["headers"])
    assert resp.status_code == 200
    assert resp.json()["email"] == test_user["email"]

    # Invalid token fails
    bad_resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken123"})
    assert bad_resp.status_code == 401


def test_anonymous_url_creation_and_redirect(client):
    long_url = "https://example.com/very/long/url/for/testing"
    resp = client.post(
        "/api/urls",
        json={"long_url": long_url}
    )
    assert resp.status_code == 201
    data = resp.json()
    short_code = data["short_code"]
    assert short_code is not None
    assert data["long_url"] == long_url
    assert data["clicks"] == 0

    # Test Redirection (follow_redirects=False to verify 302)
    redirect_resp = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_resp.status_code == 302
    assert redirect_resp.headers["location"] == long_url

    # Check stats and click count increment
    stats_resp = client.get(f"/api/urls/{short_code}/stats")
    assert stats_resp.status_code == 200
    assert stats_resp.json()["clicks"] == 1


def test_custom_alias_and_duplicate_handling(client):
    alias = f"my-alias-{int(datetime.utcnow().timestamp())}"
    long_url = "https://github.com/fastapi/fastapi"

    # Create with custom alias
    resp = client.post(
        "/api/urls",
        json={"long_url": long_url, "custom_alias": alias}
    )
    assert resp.status_code == 201
    assert resp.json()["short_code"] == alias

    # Duplicate alias must be rejected
    dup_resp = client.post(
        "/api/urls",
        json={"long_url": "https://different-destination.com", "custom_alias": alias}
    )
    assert dup_resp.status_code == 400
    assert "already in use" in dup_resp.json()["detail"].lower()


def test_reserved_alias_rejected(client):
    resp = client.post(
        "/api/urls",
        json={"long_url": "https://example.com", "custom_alias": "dashboard"}
    )
    assert resp.status_code == 400
    assert "reserved keyword" in resp.json()["detail"].lower()


def test_invalid_url_rejected(client):
    # Missing scheme / javascript
    resp1 = client.post(
        "/api/urls",
        json={"long_url": "javascript:alert(1)"}
    )
    assert resp1.status_code == 400

    # Localhost loopback protection
    resp2 = client.post(
        "/api/urls",
        json={"long_url": "http://localhost:8000/admin"}
    )
    assert resp2.status_code == 400


def test_expired_url_rejected(client):
    past_date = (datetime.utcnow() - timedelta(days=1)).isoformat()
    resp = client.post(
        "/api/urls",
        json={
            "long_url": "https://example.com/expired-test",
            "expires_at": past_date
        }
    )
    assert resp.status_code == 201
    short_code = resp.json()["short_code"]

    # Attempting to access expired link should return 404
    red_resp = client.get(f"/{short_code}", follow_redirects=False)
    assert red_resp.status_code == 404


def test_authenticated_user_urls_and_deletion(client, test_user):
    # Create URL as authenticated user
    create_resp = client.post(
        "/api/urls",
        json={"long_url": "https://python.org"},
        headers=test_user["headers"]
    )
    assert create_resp.status_code == 201
    url_id = create_resp.json()["id"]

    # List user's URLs
    list_resp = client.get("/api/urls", headers=test_user["headers"])
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] >= 1
    assert any(item["id"] == url_id for item in data["items"])

    # Delete user's URL
    del_resp = client.delete(f"/api/urls/{url_id}", headers=test_user["headers"])
    assert del_resp.status_code == 200

    # Verify deletion
    verify_resp = client.delete(f"/api/urls/{url_id}", headers=test_user["headers"])
    assert verify_resp.status_code == 404


def test_unauthorized_deletion_prevented(client, test_user):
    # Create URL with user A
    create_resp = client.post(
        "/api/urls",
        json={"long_url": "https://google.com"},
        headers=test_user["headers"]
    )
    url_id = create_resp.json()["id"]

    # Register user B
    user_b_email = f"user_b_{int(datetime.utcnow().timestamp())}@example.com"
    client.post(
        "/api/auth/register",
        json={"name": "User B", "email": user_b_email, "password": "PasswordB123!"}
    )
    login_b = client.post(
        "/api/auth/login",
        json={"email": user_b_email, "password": "PasswordB123!"}
    )
    user_b_token = login_b.json()["access_token"]
    user_b_headers = {"Authorization": f"Bearer {user_b_token}"}

    # User B tries to delete User A's URL -> should get 404
    del_attempt = client.delete(f"/api/urls/{url_id}", headers=user_b_headers)
    assert del_attempt.status_code == 404


def test_rate_limiter_fallback(client):
    # Testing that 101 requests from the same client trigger rate limiting (429)
    from rate_limiter import LIMIT, _memory_limiter_store
    _memory_limiter_store.clear()

    # Make LIMIT requests
    for i in range(LIMIT):
        resp = client.post("/api/urls", json={"long_url": f"https://example.com/item/{i}"})
        assert resp.status_code == 201

    # Request LIMIT + 1 must be blocked with 429
    blocked = client.post("/api/urls", json={"long_url": "https://example.com/blocked"})
    assert blocked.status_code == 429
    assert "Too many requests" in blocked.json()["detail"]

    # Clean up memory store after test
    _memory_limiter_store.clear()


def test_malformed_and_expired_jwt(client):
    # Malformed token
    r1 = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-valid-token"})
    assert r1.status_code == 401
    assert "credentials" in r1.json()["detail"].lower()

    # Expired token
    from auth import create_access_token
    from datetime import timedelta
    expired_token = create_access_token({"sub": "1"}, expires_delta=timedelta(seconds=-10))
    r2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert r2.status_code == 401
    assert "expired" in r2.json()["detail"].lower()


def test_proxy_rate_limiter_ip_extraction(client):
    from rate_limiter import get_client_ip
    from fastapi import Request

    # Create dummy scope
    scope = {
        "type": "http",
        "client": ("203.0.113.195", 12345),
        "headers": [(b"x-forwarded-for", b"198.51.100.1, 203.0.113.195")],
    }
    req = Request(scope)
    # By default, TRUST_PROXY_HEADERS is false, so it must return the direct socket IP
    assert get_client_ip(req) == "203.0.113.195"

