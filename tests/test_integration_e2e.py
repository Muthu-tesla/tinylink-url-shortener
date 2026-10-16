import sys
import os
import time
import httpx

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_ORIGIN = "http://localhost:5173"


def test_cors_preflight():
    print("--> 1. Testing CORS Preflight (OPTIONS /api/urls)...")
    with httpx.Client(base_url=BACKEND_URL) as client:
        resp = client.options(
            "/api/urls",
            headers={
                "Origin": FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization, content-type",
            },
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.headers.get("access-control-allow-origin") == FRONTEND_ORIGIN, (
            f"Expected {FRONTEND_ORIGIN}, got {resp.headers.get('access-control-allow-origin')}"
        )
        assert "authorization" in resp.headers.get("access-control-allow-headers", "").lower()
        print("    [PASS] CORS Preflight response valid and headers allowed.")


def test_anonymous_url_lifecycle():
    print("--> 2. Testing Anonymous URL Lifecycle...")
    target_url = "https://www.python.org/community/"
    with httpx.Client(base_url=BACKEND_URL) as client:
        # Create
        create_resp = client.post(
            "/api/urls",
            headers={"Origin": FRONTEND_ORIGIN},
            json={"long_url": target_url},
        )
        assert create_resp.status_code == 201, f"Create failed: {create_resp.text}"
        data = create_resp.json()
        short_code = data["short_code"]
        assert short_code, "Short code must not be empty"
        assert data["long_url"] == target_url
        assert data["clicks"] == 0
        print(f"    [PASS] Short URL created: {data['short_url']} (code: {short_code})")

        # Redirect check (follow_redirects=False to verify 302)
        redirect_resp = client.get(f"/{short_code}", follow_redirects=False)
        assert redirect_resp.status_code == 302, f"Expected 302 redirect, got {redirect_resp.status_code}"
        assert redirect_resp.headers.get("location") == target_url
        print("    [PASS] HTTP 302 redirect correctly points to destination.")

        # Check clicks incremented
        stats_resp = client.get(f"/api/urls/{short_code}/stats")
        assert stats_resp.status_code == 200
        stats_data = stats_resp.json()
        assert stats_data["clicks"] == 1, f"Expected clicks=1, got {stats_data['clicks']}"
        print("    [PASS] Click count successfully incremented to 1.")


def test_url_validation_and_security():
    print("--> 3. Testing URL Validation and Safety Restrictions...")
    with httpx.Client(base_url=BACKEND_URL) as client:
        # Invalid scheme
        r1 = client.post("/api/urls", json={"long_url": "javascript:alert('xss')"})
        assert r1.status_code == 400
        assert "http://" in r1.json()["detail"].lower() or "https://" in r1.json()["detail"].lower()

        # Localhost SSRF block
        r2 = client.post("/api/urls", json={"long_url": "http://127.0.0.1:8000/internal"})
        assert r2.status_code == 400
        assert "loopback" in r2.json()["detail"].lower() or "localhost" in r2.json()["detail"].lower()

        # Non-existent short code
        r3 = client.get("/non_existent_code_xyz123", follow_redirects=False)
        assert r3.status_code == 404
        print("    [PASS] Invalid schemes, SSRF loopback attempts, and 404 routes handled safely.")


def test_auth_and_user_isolation():
    print("--> 4. Testing Authentication, Tokens, and User Isolation...")
    with httpx.Client(base_url=BACKEND_URL) as client:
        ts = int(time.time())
        # User A
        email_a = f"alice_{ts}@test.com"
        reg_a = client.post("/api/auth/register", json={"name": "Alice", "email": email_a, "password": "SecretPassword123"})
        assert reg_a.status_code == 201

        login_a = client.post("/api/auth/login", json={"email": email_a, "password": "SecretPassword123"})
        assert login_a.status_code == 200
        token_a = login_a.json()["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}", "Origin": FRONTEND_ORIGIN}

        # Check me
        me_resp = client.get("/api/auth/me", headers=headers_a)
        assert me_resp.status_code == 200
        assert me_resp.json()["email"] == email_a

        # User B
        email_b = f"bob_{ts}@test.com"
        reg_b = client.post("/api/auth/register", json={"name": "Bob", "email": email_b, "password": "SecretPassword456"})
        assert reg_b.status_code == 201

        login_b = client.post("/api/auth/login", json={"email": email_b, "password": "SecretPassword456"})
        assert login_b.status_code == 200
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}", "Origin": FRONTEND_ORIGIN}

        # User A creates link
        url_a = client.post("/api/urls", headers=headers_a, json={"long_url": "https://alice-private-link.org"}).json()

        # User B creates link
        url_b = client.post("/api/urls", headers=headers_b, json={"long_url": "https://bob-private-link.org"}).json()

        # User A lists links: must see url_a, must NOT see url_b
        list_a = client.get("/api/urls", headers=headers_a).json()
        ids_a = [item["id"] for item in list_a["items"]]
        assert url_a["id"] in ids_a, "User A should see their own link"
        assert url_b["id"] not in ids_a, "User A should NEVER see User B's link!"

        # User B attempts to delete User A's link: must return 404
        unauth_del = client.delete(f"/api/urls/{url_a['id']}", headers=headers_b)
        assert unauth_del.status_code == 404, "User B must not be able to delete User A's link!"

        # User A deletes their link: must succeed
        auth_del = client.delete(f"/api/urls/{url_a['id']}", headers=headers_a)
        assert auth_del.status_code == 200
        print("    [PASS] User authentication and ownership isolation verified.")


def test_custom_alias_and_expiration():
    print("--> 5. Testing Custom Alias Collision & Expiration Enforcement...")
    with httpx.Client(base_url=BACKEND_URL) as client:
        alias = f"e2e-custom-{int(time.time())}"
        # 1. Custom alias creation
        c1 = client.post("/api/urls", json={"long_url": "https://docs.python.org", "custom_alias": alias})
        assert c1.status_code == 201
        assert c1.json()["short_code"] == alias

        # 2. Duplicate alias rejection
        c2 = client.post("/api/urls", json={"long_url": "https://other.com", "custom_alias": alias})
        assert c2.status_code == 400
        assert "already in use" in c2.json()["detail"].lower()

        # 3. Expired link behavior
        yesterday_iso = "2020-01-01T00:00:00Z"
        exp = client.post("/api/urls", json={"long_url": "https://expired.org", "expires_at": yesterday_iso})
        assert exp.status_code == 201
        exp_code = exp.json()["short_code"]

        # Visiting expired link should return 404
        exp_redirect = client.get(f"/{exp_code}", follow_redirects=False)
        assert exp_redirect.status_code == 404
        print("    [PASS] Custom aliases and expiration rules enforced correctly.")


if __name__ == "__main__":
    print("=== STARTING FULL-STACK INTEGRATION VERIFICATION ===")
    test_cors_preflight()
    test_anonymous_url_lifecycle()
    test_url_validation_and_security()
    test_auth_and_user_isolation()
    test_custom_alias_and_expiration()
    print("=== ALL FULL-STACK INTEGRATION TESTS PASSED SUCCESSFULLY! ===")
