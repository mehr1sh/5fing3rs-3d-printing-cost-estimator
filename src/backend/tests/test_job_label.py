"""
Test cases for job labeling feature
"""

import pytest
from uuid import uuid4


def test_admin_can_add_job_label(client, admin_token, db, verified_user):
    """
    Test that admin can add a processing label to a job.
    """
    from app.models.job import Job
    
    # Create a test job
    job = Job(
        job_id=uuid4(),
        user_id=verified_user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="completed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Update job label
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.put(
        f"/api/admin/jobs/{job.job_id}/label",
        json={"processing_label": "Post processing"},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["processing_label"] == "Post processing"


def test_admin_can_add_custom_label(client, admin_token, db, verified_user):
    """
    Test that admin can add a custom label to a job.
    """
    from app.models.job import Job
    
    # Create a test job
    job = Job(
        job_id=uuid4(),
        user_id=verified_user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="completed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Update job label with custom value
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.put(
        f"/api/admin/jobs/{job.job_id}/label",
        json={"processing_label": "Custom inspection needed"},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["processing_label"] == "Custom inspection needed"


def test_admin_can_update_label(client, admin_token, db, verified_user):
    """
    Test that admin can update an existing label.
    """
    from app.models.job import Job
    
    # Create a test job with existing label
    job = Job(
        job_id=uuid4(),
        user_id=verified_user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="completed",
        processing_label="Post processing"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Update the label
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.put(
        f"/api/admin/jobs/{job.job_id}/label",
        json={"processing_label": "Smoothing"},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["processing_label"] == "Smoothing"


def test_non_admin_cannot_add_label(client, user_token, db, verified_user):
    """
    Test that non-admin users cannot add labels to jobs.
    """
    from app.models.job import Job
    from uuid import uuid4
    
    # Create a test job
    job = Job(
        job_id=uuid4(),
        user_id=verified_user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="completed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Try to update job label as non-admin
    headers = {"Authorization": f"Bearer {user_token}"}
    response = client.put(
        f"/api/admin/jobs/{job.job_id}/label",
        json={"processing_label": "Post processing"},
        headers=headers
    )
    
    assert response.status_code == 403


def test_label_options(client, admin_token, db, verified_user):
    """
    Test all predefined label options.
    """
    from app.models.job import Job
    
    # Create a test job
    job = Job(
        job_id=uuid4(),
        user_id=verified_user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="completed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Test all predefined labels
    labels = ["Post processing", "Pre processing", "Smoothing"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    for label in labels:
        response = client.put(
            f"/api/admin/jobs/{job.job_id}/label",
            json={"processing_label": label},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["processing_label"] == label
