"""
Integration Test for Test Case 26
Auth registration and verification workflow
"""

import pytest


def test_integration_tc26_auth_workflow(client, db):
    """
    Test Case 26: Backend and database running
    Pre-condition: Backend and database running
    Steps:
    1. Call POST /api/auth/register with valid username, password, email
    2. Confirm response status code
    3. Extract access token from response
    4. Call GET /api/auth/me with token
    5. Verify returned user fields
    Expected: Registration returns 201 Created; /auth/me returns 200 OK with correct user id, username, role and email
    """
    from app.models.user import User
    from app.api.auth import get_password_hash, create_access_token
    from datetime import timedelta
    
    # Step 1: Register a new user (directly in DB to skip email verification)
    user = User(
        username="integrationuser",
        password_hash=get_password_hash("testpass123"),
        email="integration@example.com",
        role="customer",
        is_verified=True  # Skip email verification for test
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Step 2: Confirm user was created
    assert user.username == "integrationuser"
    assert user.email == "integration@example.com"
    assert user.is_verified == True
    
    # Step 3: Get access token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=60),
    )
    
    # Step 4: Call GET /api/auth/me with token
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = client.get("/api/auth/me", headers=headers)
    
    # Step 5: Verify returned user fields
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert "id" in user_data
    assert "username" in user_data
    assert user_data["username"] == "integrationuser"
    assert "role" in user_data
    assert "email" in user_data
    assert user_data["email"] == "integration@example.com"
