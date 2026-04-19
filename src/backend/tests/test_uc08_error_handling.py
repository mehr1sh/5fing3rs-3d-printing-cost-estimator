"""
Test cases for UC-08: Error Handling
Test 17 from updated Test Plan
"""

import pytest
from app.models.job import Job
from app.models.failure_log import FailureLog
from app.models.user import User
from uuid import uuid4


def test_uc08_tc17_slicing_error_display(client, admin_token, db):
    """
    Test Case 17: Slicing failed with error
    Pre-condition: Slicing failed with error
    Steps:
    1. Upload problematic STL
    2. Trigger slicing
    3. Wait for failure
    4. Check error display
    Expected: Clear error message with actionable suggestions displayed, problem areas highlighted in 3D viewer
    
    Note: This test simulates a slicing failure and verifies error logging.
    The frontend highlighting of problem areas is a frontend concern.
    """
    # Create a user and job that failed
    user = User(
        username="erroruser",
        password_hash="hash",
        email="error@example.com",
        role="customer",
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job = Job(
        job_id=uuid4(),
        user_id=user.id,
        filename="failed.stl",
        original_filename="failed.stl",
        file_path="/tmp/failed.stl",
        file_size=1000,
        status="failed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Create a failure log
    failure_log = FailureLog(
        job_id=job.job_id,
        error_type="thin_walls",
        error_message="Slicing failed: Model has thin walls or disconnected parts",
        stack_trace=None
    )
    db.add(failure_log)
    db.commit()
    
    # Verify admin can see the failure log
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/logs", headers=headers)
    
    assert response.status_code == 200
    logs = response.json()
    
    # Find our failure log
    our_log = next((log for log in logs if log["job_id"] == str(job.job_id)), None)
    assert our_log is not None
    assert "thin walls" in our_log["error_message"].lower() or "disconnected" in our_log["error_message"].lower()
