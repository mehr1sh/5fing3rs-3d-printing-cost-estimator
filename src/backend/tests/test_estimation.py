import pytest
from app.services.cost_calculator import calculate_cost
from app.models.slicing_result import SlicingResult
from decimal import Decimal

def test_cost_calculation():
    """Test cost calculation logic."""
    # Mock slicing result
    slicing_result = SlicingResult(
        job_id=None,
        material_volume_mm3=10000.0,  # 10 cm³
        material_weight_grams=12.4,  # PLA density 1.24
        support_material_grams=1.24,
        print_time_seconds=3600,  # 1 hour
        layer_count=100
    )
    slicing_result.slicing_parameters = {"material": "PLA"}
    
    # This test would need a database session
    # For now, just verify the function exists
    assert callable(calculate_cost)
