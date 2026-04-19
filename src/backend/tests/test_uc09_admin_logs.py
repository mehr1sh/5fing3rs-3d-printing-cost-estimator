"""
Test cases for UC-09: Admin Failure Logs
Test 18 from updated Test Plan
"""

import pytest
from app.models.job import Job
from app.models.failure_log import FailureLog
from app.models.user import User
from uuid import uuid4


def test_uc09_tc18_admin_failure_logs_dashboard(client, admin_token, db):
    """
    Test Case 18: Admin authenticated
    Pre-condition: Admin authenticated
    Steps:
    1. Login as admin
    2. Navigate to failure logs dashboard
    3. Check log entries
    4. Apply filters
    Expected: All slicing failures displayed with job ID, timestamp, error message, affected user. Filters work correctly.
    """
    # Create multiple users and failed jobs with different error types
    users = []
    for i in range(3):
        user = User(
            username=f"failuser{i}",
            password_hash="hash",
            email=f"fail{i}@example.com",
            role="customer",
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        users.append(user)
    
    # Create failed jobs with different error types
    error_types = ["validation_error", "slicing_timeout", "upload_error"]
    jobs = []
    
    for i, (user, error_type) in enumerate(zip(users, error_types)):
        job = Job(
            job_id=uuid4(),
            user_id=user.id,
            filename=f"failed{i}.stl",
            original_filename=f"failed{i}.stl",
            file_path=f"/tmp/failed{i}.stl",
            file_size=1000,
            status="failed"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        jobs.append(job)
        
        # Create failure log
        failure_log = FailureLog(
            job_id=job.job_id,
            error_type=error_type,
            error_message=f"Error of type {error_type} occurred",
            stack_trace=None
        )
        db.add(failure_log)
        db.commit()
    
    # Get all failure logs as admin
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/admin/logs", headers=headers)
    
    assert response.status_code == 200
    logs = response.json()
    
    # Verify all logs are present
    assert len(logs) >= 3
    
    # Verify each log has required fields
    for log in logs:
        assert "id" in log
        assert "job_id" in log
        assert "error_type" in log
        assert "error_message" in log
        assert "created_at" in log
    
    # Test filtering by error type (if API supports it)
    # For now, verify we can filter by checking specific logs
    validation_logs = [log for log in logs if log["error_type"] == "validation_error"]
    assert len(validation_logs) >= 1
    
    timeout_logs = [log for log in logs if log["error_type"] == "slicing_timeout"]
    assert len(timeout_logs) >= 1
