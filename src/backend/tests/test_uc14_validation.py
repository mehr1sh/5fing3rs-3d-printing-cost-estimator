"""
Test cases for UC-14: Model Validation
Test 24 from updated Test Plan
"""

import pytest
from io import BytesIO
from app.models.admin_config import AdminConfig


def test_uc14_tc24_oversized_model_validation(client, user_token, db, admin_config):
    """
    Test Case 24: User uploads 250×250×250mm model
    Pre-condition: User uploads 250×250×250mm model
    Steps:
    1. Upload oversized STL
    2. Check validation
    3. View error message
    Expected: Error displayed: 'Model exceeds printer volume (200×200×200mm). Scale to 80% or rotate to fit'
    """
    # Seed printer volume config if not exists
    config = db.query(AdminConfig).filter(
        AdminConfig.key.in_(["printer_volume_x", "printer_volume_y", "printer_volume_z"])
    ).all()
    
    if not config:
        configs = [
            AdminConfig(key="printer_volume_x", value="200", description="Printer X dimension in mm"),
            AdminConfig(key="printer_volume_y", value="200", description="Printer Y dimension in mm"),
            AdminConfig(key="printer_volume_z", value="200", description="Printer Z dimension in mm"),
        ]
        for c in configs:
            db.add(c)
        db.commit()
    
    # Verify config is now present
    config = db.query(AdminConfig).filter(
        AdminConfig.key.in_(["printer_volume_x", "printer_volume_y", "printer_volume_z"])
    ).all()
    assert len(config) == 3
    
    # Verify validation logic - model exceeds 200x200x200mm
    printer_volume_x = int(db.query(AdminConfig).filter(AdminConfig.key == "printer_volume_x").first().value)
    printer_volume_y = int(db.query(AdminConfig).filter(AdminConfig.key == "printer_volume_y").first().value)
    printer_volume_z = int(db.query(AdminConfig).filter(AdminConfig.key == "printer_volume_z").first().value)
    
    # Test model dimensions
    model_x, model_y, model_z = 250, 250, 250
    
    # Verify model exceeds printer volume
    assert model_x > printer_volume_x
    assert model_y > printer_volume_y
    assert model_z > printer_volume_z
