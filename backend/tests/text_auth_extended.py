"""
Extended auth tests covering registration edge cases, login variants,
token validation, and the /me endpoint.
"""
import pytest
from fastapi.testclient import TestClient


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────

class TestRegistration:
    def test_register_success(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "newuser1",
            "password": "ValidPass123",
            "email": "newuser1@example.com",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "newuser1"
        assert "password" not in data          # password must never be returned
        assert "password_hash" not in data

    def test_register_duplicate_username(self, client):
        payload = {"username": "dup_user", "password": "Pass123", "email": "a@b.com"}
        client.post("/api/auth/register", json=payload)
        resp = client.post("/api/auth/register", json={**payload, "email": "c@d.com"})
        assert resp.status_code == 400

    def test_register_duplicate_email_different_username(self, client):
        """Two registrations with the same e-mail but different usernames.
        The app may or may not enforce unique e-mails; just ensure no 500."""
        client.post("/api/auth/register", json={
            "username": "em_user1", "password": "P@ss1", "email": "shared@x.com"})
        resp = client.post("/api/auth/register", json={
            "username": "em_user2", "password": "P@ss1", "email": "shared@x.com"})
        assert resp.status_code in (201, 400)

    def test_register_missing_email(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "noemail", "password": "Pass123"})
        assert resp.status_code == 422

    def test_register_missing_username(self, client):
        resp = client.post("/api/auth/register", json={
            "password": "Pass123", "email": "x@y.com"})
        assert resp.status_code == 422

    def test_register_missing_password(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "nopass", "email": "x@y.com"})
        assert resp.status_code == 422

    def test_register_invalid_email_format(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "bademail", "password": "Pass123", "email": "not-an-email"})
        # Pydantic email validation should reject this
        assert resp.status_code == 422

    def test_register_returns_correct_role(self, client):
        resp = client.post("/api/auth/register", json={
            "username": "rolecheck", "password": "Pass123", "email": "role@x.com"})
        assert resp.status_code == 201
        assert resp.json().get("role") == "customer"


# ──────────────────────────────────────────────
# Login
# ──────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, client, registered_user):
        resp = client.post("/api/auth/login", data={
            "username": registered_user["username"],
            "password": registered_user["password"],
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_login_wrong_password(self, client, registered_user):
        resp = client.post("/api/auth/login", data={
            "username": registered_user["username"],
            "password": "wrong_password",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/auth/login", data={
            "username": "ghost_user_xyz",
            "password": "anything",
        })
        assert resp.status_code == 401

    def test_login_empty_password(self, client, registered_user):
        resp = client.post("/api/auth/login", data={
            "username": registered_user["username"],
            "password": "",
        })
        assert resp.status_code in (401, 422)

    def test_login_case_sensitive_username(self, client, registered_user):
        """Username lookup should be case-sensitive (or at least consistent)."""
        resp = client.post("/api/auth/login", data={
            "username": registered_user["username"].upper(),
            "password": registered_user["password"],
        })
        # Accept either 401 (case-sensitive, correct) or 200 (case-insensitive)
        assert resp.status_code in (200, 401)


# ──────────────────────────────────────────────
# /me endpoint
# ──────────────────────────────────────────────

class TestMe:
    def test_me_with_valid_token(self, client, registered_user, auth_headers):
        resp = client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == registered_user["username"]

    def test_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_malformed_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.token"})
        assert resp.status_code == 401

    def test_me_with_wrong_scheme(self, client, auth_token):
        resp = client.get("/api/auth/me", headers={"Authorization": f"Basic {auth_token}"})
        assert resp.status_code == 401
