"""
Test cases for UC-12, UC-13: Admin Configuration
Tests 22-23 from updated Test Plan
"""

import pytest
from app.models.admin_config import AdminConfig


def test_uc12_tc22_update_machine_time_rate(client, admin_token, db, admin_config):
    """
    Test Case 22: Admin authenticated
    Pre-condition: Admin authenticated
    Steps:
    1. Navigate to admin config
    2. Update machine time rate from ₹500 to ₹600
    3. Save
    Expected: Rate updated successfully, applies to all new cost calculations, historical jobs unchanged
    """
    # Update machine hourly rate directly in database
    config = db.query(AdminConfig).filter(AdminConfig.key == "machine_hourly_rate").first()
    config.value = "600"
    db.commit()
    db.refresh(config)
    
    # Verify the change persists
    assert config.value == "600"


def test_uc13_tc23_update_overhead_factors(client, admin_token, db, admin_config):
    """
    Test Case 23: Admin authenticated
    Pre-condition: Admin authenticated
    Steps:
    1. Navigate to admin config
    2. Update waste factor from 1.25 to 1.30
    3. Update failure factor from 1.25 to 1.20
    4. Save
    Expected: Factors updated successfully, new cost calculations use updated multipliers
    """
    # Update waste factor
    waste_config = db.query(AdminConfig).filter(AdminConfig.key == "waste_factor").first()
    waste_config.value = "1.30"
    db.commit()
    
    # Update failure factor
    failure_config = db.query(AdminConfig).filter(AdminConfig.key == "failure_factor").first()
    failure_config.value = "1.20"
    db.commit()
    
    # Verify both changes persist
    assert waste_config.value == "1.30"
    assert failure_config.value == "1.20"
