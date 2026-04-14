"""
Integration tests for /api/auth/* endpoints.
Uses the TestClient + in-memory DB from conftest.py.
Email sending is patched so no real Mailtrap calls are made.
"""

import pytest
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone, timedelta


# Patch send_otp_email globally for all tests in this file so no real
# HTTP call to Mailtrap happens during registration tests.
@pytest.fixture(autouse=True)
def mock_email():
    with patch(
        "app.api.auth.send_otp_email",
        new_callable=AsyncMock,
        return_value=True,
    ) as m:
        yield m


class TestRegister:

    def test_register_new_user_returns_201(self, client):
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "password": "securepass123",
            "email": "newuser@example.com",
        })
        assert response.status_code == 201

    def test_register_response_contains_user_fields(self, client):
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "password": "securepass123",
            "email": "newuser@example.com",
        })
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@example.com"
        assert data["is_verified"] is False  # not verified until OTP
        assert data["role"] == "customer"

    def test_register_duplicate_username_returns_400(self, client, verified_user):
        response = client.post("/api/auth/register", json={
            "username": "testuser",  # same as verified_user fixture
            "password": "anotherpass",
            "email": "other@example.com",
        })
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_without_email_still_succeeds(self, client):
        """Email is optional in the schema."""
        response = client.post("/api/auth/register", json={
            "username": "noemailuser",
            "password": "pass123",
        })
        assert response.status_code == 201

    def test_register_calls_send_otp_email(self, client, mock_email):
        client.post("/api/auth/register", json={
            "username": "otpuser",
            "password": "pass123",
            "email": "otp@example.com",
        })
        mock_email.assert_called_once_with("otp@example.com", pytest.approx)


class TestVerifyOtp:

    def test_verify_correct_otp_marks_user_verified(self, client, db, unverified_user):
        response = client.post("/api/auth/verify-otp", json={
            "username": "unverified",
            "code": "123456",  # matches unverified_user fixture
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_verified"] is True

    def test_verify_wrong_otp_returns_400(self, client, unverified_user):
        response = client.post("/api/auth/verify-otp", json={
            "username": "unverified",
            "code": "000000",  # wrong code
        })
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    def test_verify_nonexistent_user_returns_404(self, client):
        response = client.post("/api/auth/verify-otp", json={
            "username": "ghost",
            "code": "123456",
        })
        assert response.status_code == 404

    def test_verify_already_verified_user_returns_message(self, client, verified_user):
        response = client.post("/api/auth/verify-otp", json={
            "username": "testuser",
            "code": "000000",
        })
        assert response.status_code == 200
        assert "already verified" in response.json()["message"].lower()

    def test_verify_expired_otp_returns_400(self, client, db, unverified_user):
        # Force-expire the OTP
        unverified_user.verification_code_expires_at = datetime(2000, 1, 1, tzinfo=timezone.utc)
        db.commit()

        response = client.post("/api/auth/verify-otp", json={
            "username": "unverified",
            "code": "123456",
        })
        assert response.status_code == 400
        assert "expired" in response.json()["detail"].lower()


class TestLogin:

    def test_login_verified_user_returns_token(self, client, verified_user):
        response = client.post("/api/auth/login", data={
            "username": "testuser",
            "password": "testpass123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client, verified_user):
        response = client.post("/api/auth/login", data={
            "username": "testuser",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_nonexistent_user_returns_401(self, client):
        response = client.post("/api/auth/login", data={
            "username": "nobody",
            "password": "pass",
        })
        assert response.status_code == 401

    def test_login_unverified_user_returns_403(self, client, unverified_user):
        response = client.post("/api/auth/login", data={
            "username": "unverified",
            "password": "pass123",
        })
        assert response.status_code == 403
        assert "verified" in response.json()["detail"].lower()


class TestGetMe:

    def test_get_me_authenticated_returns_user_info(self, client, verified_user, user_token):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["role"] == "customer"

    def test_get_me_without_token_returns_401(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_get_me_with_invalid_token_returns_401(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer this.is.fake"},
        )
        assert response.status_code == 401

    def test_get_me_unverified_user_returns_403(self, client, db, unverified_user):
        """Even with a valid token, unverified users must be blocked."""
        from app.api.auth import create_access_token
        token = create_access_token(data={"sub": "unverified"})
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403