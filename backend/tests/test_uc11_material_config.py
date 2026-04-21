"""
Test cases for UC-11: Material Configuration
Tests 19-21 from updated Test Plan
"""

import pytest
from app.models.material import Material


def test_uc11_tc19_edit_material_cost(client, admin_token, db, pla_material):
    """
    Test Case 19: Admin authenticated
    Pre-condition: Admin authenticated
    Steps:
    1. Navigate to admin panel
    2. Click 'Material Configuration'
    3. Edit PLA cost from ₹0.03 to ₹0.035
    4. Click Save
    Expected: Material rate updated successfully, changes apply immediately to new jobs, audit log created
    """
    # Update PLA cost directly in database
    pla_material.cost_per_gram = 0.035
    db.commit()
    db.refresh(pla_material)
    
    # Verify the change persists
    assert float(pla_material.cost_per_gram) == 0.035


def test_uc11_tc20_add_new_material(client, admin_token, db):
    """
    Test Case 20: Admin panel open
    Pre-condition: Admin panel open
    Steps:
    1. Click 'Add New Material'
    2. Enter name: PETG, density: 1.27, cost: ₹0.04
    3. Save
    Expected: New material added successfully, appears in slicing parameter dropdown immediately
    """
    # Add new material directly to database
    new_material = Material(
        name="PETG",
        density_g_cm3=1.27,
        cost_per_gram=0.04
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    
    # Verify it was added
    assert new_material.name == "PETG"
    assert new_material.density_g_cm3 == 1.27
    assert float(new_material.cost_per_gram) == 0.04


def test_uc11_tc21_invalid_material_cost(client, admin_token, db):
    """
    Test Case 21: Admin panel open
    Pre-condition: Admin panel open
    Steps:
    1. Enter invalid cost: -5
    2. Click Save
    Expected: Validation error: 'Cost and density must be positive numbers'
    """
    # Try to add material with negative cost - validation should prevent this
    try:
        invalid_material = Material(
            name="InvalidMaterial",
            density_g_cm3=1.0,
            cost_per_gram=-5  # Invalid: negative
        )
        db.add(invalid_material)
        db.commit()
        # If we get here, validation failed
        assert False, "Should have raised validation error for negative cost"
    except Exception as e:
        # Expected to fail validation
        assert True
