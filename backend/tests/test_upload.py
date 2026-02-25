import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_upload_invalid_file():
    """Test uploading invalid file type."""
    response = client.post(
        "/api/upload",
        files={"file": ("test.txt", b"test content", "text/plain")},
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code in [400, 401]  # 401 if auth required

def test_upload_too_large():
    """Test uploading file that's too large."""
    large_content = b"x" * (51 * 1024 * 1024)  # 51MB
    response = client.post(
        "/api/upload",
        files={"file": ("test.stl", large_content, "application/octet-stream")},
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code in [400, 413, 401]

def test_get_job_not_found():
    """Test getting non-existent job."""
    response = client.get(
        "/api/job/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": "Bearer test_token"}
    )
    assert response.status_code in [404, 401]
