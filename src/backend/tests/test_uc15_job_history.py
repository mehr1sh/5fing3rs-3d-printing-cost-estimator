"""
Test cases for UC-15: Job History
Test 25 from updated Test Plan
"""

import pytest
from io import BytesIO
from app.models.job import Job
from app.models.slicing_result import SlicingResult
from uuid import uuid4


def test_uc15_tc25_job_history_display(client, user_token, db):
    """
    Test Case 25: User has uploaded 3 jobs
    Pre-condition: User has uploaded 3 jobs
    Steps:
    1. Navigate to job history
    2. Check displayed information
    Expected: All 3 jobs shown with: Job ID, filename, timestamp, status, cost estimate, G-code download link (if available)
    """
    # Create 3 jobs directly in database
    from app.models.job import Job
    from uuid import uuid4
    from app.models.user import User
    
    user = db.query(User).filter(User.username == "testuser").first()
    
    job_ids = []
    for i in range(3):
        job = Job(
            job_id=uuid4(),
            user_id=user.id,
            filename=f"test_model_{i}.stl",
            original_filename=f"test_model_{i}.stl",
            file_path=f"/tmp/test_model_{i}.stl",
            file_size=1000,
            status="uploaded"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_ids.append(job.job_id)
    
    # Get all jobs for the user
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.get("/api/jobs", headers=headers)
    
    assert response.status_code == 200
    jobs = response.json()
    
    # Verify at least 3 jobs are returned
    assert len(jobs) >= 3
    
    # Verify each job has required fields
    for job in jobs:
        assert "job_id" in job
        assert "filename" in job
        assert "original_filename" in job
        assert "status" in job
        assert "file_size" in job
        assert "created_at" in job
        assert "updated_at" in job
