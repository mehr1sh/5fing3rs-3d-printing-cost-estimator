"""
Unit tests for the CostCalculator service.
These tests do NOT hit any API endpoints — they test the calculate_cost()
function directly with controlled inputs.
"""

import pytest
from decimal import Decimal
from app.services.cost_calculator import calculate_cost
from app.models.slicing_result import SlicingResult
from app.models.material import Material
from app.models.admin_config import AdminConfig


class TestCostCalculatorBasic:
    """Basic cost calculation correctness."""

    def test_material_cost_uses_weight_and_rate(self, db, pla_material, admin_config):
        """Material cost = weight_grams * cost_per_gram * waste * failure factors."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=10.0,   # 10g of PLA @ ₹2.5/g = ₹25 raw
            support_material_grams=0.0,
            print_time_seconds=0,
            layer_count=50,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        # raw = 10 * 2.5 = 25, with waste(1.25) * failure(1.25) = 25 * 1.5625 = 39.06
        assert cost["material_cost"] == pytest.approx(39.06, abs=0.01)

    def test_machine_cost_calculated_from_print_time(self, db, pla_material, admin_config):
        """Machine cost = print_time_hours * machine_hourly_rate."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=5.0,
            support_material_grams=0.0,
            print_time_seconds=7200,   # 2 hours @ ₹500/hr = ₹1000
            layer_count=100,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert cost["machine_cost"] == pytest.approx(1000.0, abs=0.01)

    def test_support_cost_is_zero_when_no_support(self, db, pla_material, admin_config):
        result = SlicingResult(
            job_id=None,
            material_weight_grams=8.0,
            support_material_grams=0.0,
            print_time_seconds=1800,
            layer_count=80,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert cost["support_cost"] == 0.0

    def test_support_cost_positive_when_support_present(self, db, pla_material, admin_config):
        result = SlicingResult(
            job_id=None,
            material_weight_grams=8.0,
            support_material_grams=2.0,   # 2g support material
            print_time_seconds=1800,
            layer_count=80,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert cost["support_cost"] > 0

    def test_total_cost_equals_sum_of_components(self, db, pla_material, admin_config):
        """total_cost = material + support + machine (after overheads)."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=10.0,
            support_material_grams=1.0,
            print_time_seconds=3600,
            layer_count=100,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        expected_total = cost["material_cost"] + cost["support_cost"] + cost["machine_cost"]
        assert cost["total_cost"] == pytest.approx(expected_total, abs=0.01)

    def test_waste_and_failure_overhead_values(self, db, pla_material, admin_config):
        """Overheads should be positive and add up sensibly."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=10.0,
            support_material_grams=0.0,
            print_time_seconds=3600,
            layer_count=100,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert cost["waste_overhead"] > 0
        assert cost["failure_overhead"] > 0
        assert cost["subtotal"] < cost["total_cost"]

    def test_breakdown_contains_expected_keys(self, db, pla_material, admin_config):
        result = SlicingResult(
            job_id=None,
            material_weight_grams=5.0,
            support_material_grams=0.0,
            print_time_seconds=1800,
            layer_count=50,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert "material_weight_grams" in cost["breakdown"]
        assert "print_time_hours" in cost["breakdown"]
        assert "layer_count" in cost["breakdown"]

    def test_total_cost_rounded_to_two_decimal_places(self, db, pla_material, admin_config):
        result = SlicingResult(
            job_id=None,
            material_weight_grams=7.777,
            support_material_grams=0.0,
            print_time_seconds=3333,
            layer_count=77,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        # Convert to string and check decimal places
        total_str = str(cost["total_cost"])
        if "." in total_str:
            assert len(total_str.split(".")[1]) <= 2


class TestCostCalculatorEdgeCases:
    """Edge cases and boundary conditions."""

    def test_zero_print_time_gives_zero_machine_cost(self, db, pla_material, admin_config):
        result = SlicingResult(
            job_id=None,
            material_weight_grams=5.0,
            support_material_grams=0.0,
            print_time_seconds=0,
            layer_count=50,
            slicing_parameters={"material": "PLA"},
        )
        db.add(result)
        db.commit()

        cost = calculate_cost(db, result)

        assert cost["machine_cost"] == 0.0

    def test_raises_if_material_not_found(self, db, admin_config):
        """Should raise ValueError when slicing params reference an unknown material."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=5.0,
            support_material_grams=0.0,
            print_time_seconds=1800,
            layer_count=50,
            slicing_parameters={"material": "UNOBTANIUM"},
        )
        db.add(result)
        db.commit()

        with pytest.raises(ValueError, match="UNOBTANIUM"):
            calculate_cost(db, result)

    def test_defaults_to_pla_when_no_material_in_params(self, db, pla_material, admin_config):
        """If slicing_parameters is None, should default to PLA."""
        result = SlicingResult(
            job_id=None,
            material_weight_grams=5.0,
            support_material_grams=0.0,
            print_time_seconds=1800,
            layer_count=50,
            slicing_parameters=None,
        )
        db.add(result)
        db.commit()

        # Should not raise — falls back to PLA
        cost = calculate_cost(db, result)
        assert cost["total_cost"] > 0

    def test_cost_scales_linearly_with_weight(self, db, admin_config):
        """Doubling the material weight should roughly double the material cost."""
        material = Material(name="PLA", density_g_cm3=1.24, cost_per_gram=2.5)
        db.add(material)
        db.commit()

        def make_result(weight):
            r = SlicingResult(
                job_id=None,
                material_weight_grams=weight,
                support_material_grams=0.0,
                print_time_seconds=0,
                layer_count=50,
                slicing_parameters={"material": "PLA"},
            )
            db.add(r)
            db.commit()
            return r

        cost_10g = calculate_cost(db, make_result(10.0))
        cost_20g = calculate_cost(db, make_result(20.0))

        assert cost_20g["material_cost"] == pytest.approx(
            cost_10g["material_cost"] * 2, abs=0.02
        )