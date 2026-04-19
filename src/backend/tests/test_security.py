"""
Security Test for Test Case 30
"""

import pytest
from io import BytesIO


def test_security_tc30_unauthorized_upload_access(client):
    """
    Test Case 30: Authentication enabled
    Pre-condition: Authentication enabled
    Steps:
    1. Try accessing /api/upload without token
    2. Check response
    Expected: 401 Unauthorized error returned, no access granted
    """
    # Test upload endpoint without authentication
    stl_content = b"solid test\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test"
    files = {"file": ("test.stl", BytesIO(stl_content), "application/octet-stream")}
    
    response = client.post("/api/upload", files=files)
    
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
