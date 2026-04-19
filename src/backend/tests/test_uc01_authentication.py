"""
Test cases for UC-01: Authentication
Tests 1-3 from updated Test Plan
"""

import pytest

def test_uc01_tc01_login_valid_credentials(client, verified_user):
    """
    Test Case 1: User credentials exist in database
    Pre-condition: User credentials exist in database
    Steps:
    1. Navigate to login page
    2. Enter username: testuser
    3. Enter password: testpass123
    4. Click Login button
    Expected: User authenticated and redirected to dashboard within 2 seconds
    """
    response = client.post(
        "/api/auth/login",
        data={
            "username": "testuser",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["username"] == "testuser"


def test_uc01_tc02_unauthorized_access(client):
    """
    Test Case 2: No user authenticated
    Pre-condition: No user authenticated
    Steps:
    1. Open API client or browser dev tools
    2. Send GET request to /api/auth/me without Authorization header
    Expected: Response returns 401 Unauthorized with message 'Not authenticated', no user data is leaked
    """
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "Not authenticated" in data["detail"] or "not authenticated" in str(data["detail"]).lower()


def test_uc01_tc03_get_user_profile_after_login(client, user_token, verified_user):
    """
    Test Case 3: Get user profile after successful login
    Pre-condition: User is authenticated
    Steps:
    1. Login with valid credentials
    2. Get access token
    3. Call GET /api/auth/me with token
    4. Verify user profile data
    Expected: User profile returned with correct id, username, email, role
    """
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/api/auth/me", headers=headers)
    
    assert response.status_code == 200
    user_data = response.json()
    assert "id" in user_data
    assert "username" in user_data
    assert user_data["username"] == "testuser"
    assert "email" in user_data
    assert user_data["email"] == "test@example.com"
    assert "role" in user_data
    assert user_data["role"] == "customer"
    assert "is_verified" in user_data
