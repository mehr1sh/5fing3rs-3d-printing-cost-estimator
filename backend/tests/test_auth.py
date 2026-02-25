import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_user():
    """Test user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "password": "testpass123",
            "email": "test@example.com"
        }
    )
    assert response.status_code in [201, 400]  # 400 if user exists

def test_login_invalid():
    """Test login with invalid credentials."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistent",
            "password": "wrongpass"
        }
    )
    assert response.status_code == 401

def test_get_me_unauthorized():
    """Test getting user info without auth."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
