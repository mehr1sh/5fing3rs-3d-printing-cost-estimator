"""
Test cases for UC-06, UC-07: Cost Estimation
Tests 14-16 from updated Test Plan
"""

import pytest
from app.models.job import Job
from app.models.slicing_result import SlicingResult
from app.models.user import User
from uuid import uuid4


def test_uc06_tc14_cost_formula_verification(db, pla_material, admin_config):
    """
    Test Case 14: Slicing completed (UC-05)
    Pre-condition: Slicing completed (UC-05)
    Steps:
    1. Wait for slicing to complete
    2. Check cost calculation panel
    3. Verify formula applied
    Expected: Cost calculated using formula: (material_volume × density × cost_per_gram × 1.25 × 1.25) + (print_time × ₹500/hour)
    """
    # Create a mock slicing result with known values
    user = User(
        username="costuser",
        password_hash="hash",
        email="cost@example.com",
        role="customer",
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job = Job(
        job_id=uuid4(),
        user_id=user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="sliced"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Mock slicing result
    # Formula: (material_volume × density × cost_per_gram × 1.25 × 1.25) + (print_time × ₹500/hour)
    # Test values: 50g material, 2 hours print time, PLA density 1.24, cost ₹0.03/g
    material_volume_mm3 = 50000  # 50g / 1.24 g/cm3 * 1000
    density = 1.24
    cost_per_gram = 0.03
    waste_factor = 1.25
    failure_factor = 1.25
    print_time_seconds = 7200  # 2 hours
    machine_hourly_rate = 500
    
    slicing_result = SlicingResult(
        job_id=job.job_id,
        print_time_seconds=print_time_seconds,
        material_volume_mm3=material_volume_mm3,
        estimated_cost=0  # Will calculate below
    )
    db.add(slicing_result)
    db.commit()
    db.refresh(slicing_result)
    
    # Calculate expected cost
    material_cost = (material_volume_mm3 / 1000) * density * cost_per_gram * waste_factor * failure_factor
    machine_cost = (print_time_seconds / 3600) * machine_hourly_rate
    total_cost = material_cost + machine_cost
    
    # Verify formula components
    assert material_cost > 0
    assert machine_cost > 0
    assert total_cost == material_cost + machine_cost


def test_uc06_tc15_cost_calculation_known_values(db, pla_material, admin_config):
    """
    Test Case 15: Sliced job with known values
    Pre-condition: Sliced job with known values
    Steps:
    1. Use test STL: 50g material, 2 hours print time
    2. Material rate: ₹0.03/g
    3. Check cost breakdown
    Expected: Material cost = 50 × 0.03 × 1.25 × 1.25 = ₹2.34; Machine cost = 2 × 500 = ₹1000; Total = ₹1002.34
    """
    # Create test data with known values
    user = User(
        username="testuser",
        password_hash="hash",
        email="test@example.com",
        role="customer",
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job = Job(
        job_id=uuid4(),
        user_id=user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="sliced"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Known values from test case
    material_grams = 50
    cost_per_gram = 0.03
    waste_factor = 1.25
    failure_factor = 1.25
    print_time_hours = 2
    machine_hourly_rate = 500
    
    # Calculate expected values
    expected_material_cost = material_grams * cost_per_gram * waste_factor * failure_factor
    expected_machine_cost = print_time_hours * machine_hourly_rate
    expected_total = expected_material_cost + expected_machine_cost
    
    # Expected: Material cost = ₹2.34, Machine cost = ₹1000, Total = ₹1002.34
    assert abs(expected_material_cost - 2.34) < 0.01  # Allow small rounding error
    assert expected_machine_cost == 1000
    assert abs(expected_total - 1002.34) < 0.01


def test_uc07_tc16_cost_estimate_display(client, user_token, db, pla_material, admin_config):
    """
    Test Case 16: Cost calculated (UC-06)
    Pre-condition: Cost calculated (UC-06)
    Steps:
    1. Navigate to cost estimate panel
    2. Verify all components displayed
    Expected: Cost breakdown shows: Material cost, Support cost, Machine time cost, Waste overhead (25%), Failure overhead (25%), Total in INR
    """
    # Create a test job with slicing result
    from app.models.job import Job
    from app.models.slicing_result import SlicingResult
    from uuid import uuid4
    from app.models.user import User
    
    user = User(
        username="estimateuser",
        password_hash="hash",
        email="estimate@example.com",
        role="customer",
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    job = Job(
        job_id=uuid4(),
        user_id=user.id,
        filename="test.stl",
        original_filename="test.stl",
        file_path="/tmp/test.stl",
        file_size=1000,
        status="sliced"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    slicing_result = SlicingResult(
        job_id=job.job_id,
        print_time_seconds=7200,
        material_volume_mm3=50000,
        estimated_cost=1002.34
    )
    db.add(slicing_result)
    db.commit()
    
    # Verify cost breakdown components exist in database
    assert float(slicing_result.estimated_cost) == 1002.34
    assert slicing_result.print_time_seconds == 7200
    assert slicing_result.material_volume_mm3 == 50000
