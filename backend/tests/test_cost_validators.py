"""
Unit tests for the cost_calculator service and file validators.
These run entirely in-process without a real DB for the pure-logic paths,
and use the db_session fixture for the DB-backed paths.
"""
import pytest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.services.cost_calculator import calculate_cost, get_config_value
from app.models.slicing_result import SlicingResult
from app.models.material import Material
from app.models.admin_config import AdminConfig
from app.utils.validators import (
    validate_file_extension,
    validate_file_size,
    sanitize_filename,
)


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _make_material(name="PLA", density=1.24, cost_per_gram=Decimal("1.50")):
    m = Material()
    m.name = name
    m.density_g_cm3 = density
    m.cost_per_gram = cost_per_gram
    return m


def _make_slicing_result(**kwargs):
    defaults = dict(
        job_id=None,
        material_volume_mm3=10_000.0,   # 10 cm³
        material_weight_grams=12.4,
        support_material_grams=0.0,
        print_time_seconds=3600,        # 1 hour
        layer_count=100,
        slicing_parameters={"material": "PLA"},
    )
    defaults.update(kwargs)
    sr = SlicingResult()
    for k, v in defaults.items():
        setattr(sr, k, v)
    return sr


def _mock_db(material=None, configs=None):
    """Return a MagicMock that behaves like an SQLAlchemy Session."""
    db = MagicMock()
    configs = configs or {}

    def query_side_effect(model):
        q = MagicMock()
        if model is Material:
            q.filter.return_value.first.return_value = material
        elif model is AdminConfig:
            def filter_side(cond):
                # Inspect the right-hand side of the condition to find the key
                key = str(cond.right)
                val = configs.get(key)
                r = MagicMock()
                if val is not None:
                    cfg = MagicMock()
                    cfg.value = str(val)
                    r.first.return_value = cfg
                else:
                    r.first.return_value = None
                return r
            q.filter.side_effect = filter_side
        return q

    db.query.side_effect = query_side_effect
    return db


# ──────────────────────────────────────────────
# Cost Calculator — pure logic
# ──────────────────────────────────────────────

class TestCostCalculatorLogic:
    def test_basic_cost_calculation(self):
        material = _make_material(cost_per_gram=Decimal("1.00"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(
            material_weight_grams=10.0,
            print_time_seconds=3600,
            support_material_grams=0.0,
        )
        # Defaults: machine_hourly_rate=500, waste_factor=1.25, failure_factor=1.25
        result = calculate_cost(db, sr)

        raw_material = 10.0 * 1.00              # 10.00
        material_cost = raw_material * 1.25 * 1.25   # 15.625 → 15.63
        machine_cost = 1.0 * 500                # 500.00
        expected_total = round(material_cost + machine_cost, 2)

        assert result["total_cost"] == expected_total
        assert result["machine_cost"] == 500.00
        assert result["support_cost"] == 0.0

    def test_support_material_adds_to_cost(self):
        material = _make_material(cost_per_gram=Decimal("2.00"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(
            material_weight_grams=10.0,
            support_material_grams=5.0,
            print_time_seconds=0,
        )
        result = calculate_cost(db, sr)
        assert result["support_cost"] > 0
        assert result["total_cost"] > result["material_cost"]

    def test_zero_print_time_gives_zero_machine_cost(self):
        material = _make_material()
        db = _mock_db(material=material)
        sr = _make_slicing_result(print_time_seconds=0)
        result = calculate_cost(db, sr)
        assert result["machine_cost"] == 0.0

    def test_missing_material_raises_value_error(self):
        db = _mock_db(material=None)
        sr = _make_slicing_result()
        with pytest.raises(ValueError, match="not found"):
            calculate_cost(db, sr)

    def test_total_equals_material_plus_support_plus_machine(self):
        material = _make_material(cost_per_gram=Decimal("1.50"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(
            material_weight_grams=20.0,
            support_material_grams=3.0,
            print_time_seconds=7200,
        )
        result = calculate_cost(db, sr)
        expected = round(result["material_cost"] + result["support_cost"] + result["machine_cost"], 2)
        assert result["total_cost"] == expected

    def test_cost_rounded_to_two_decimal_places(self):
        material = _make_material(cost_per_gram=Decimal("0.333"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(material_weight_grams=3.0, print_time_seconds=0)
        result = calculate_cost(db, sr)
        # All monetary values must have at most 2 decimal places
        for key in ("material_cost", "support_cost", "machine_cost", "total_cost"):
            val = result[key]
            assert val == round(val, 2), f"{key} not rounded to 2 dp: {val}"

    def test_breakdown_contains_expected_keys(self):
        material = _make_material()
        db = _mock_db(material=material)
        sr = _make_slicing_result()
        result = calculate_cost(db, sr)
        for key in ("material_weight_grams", "print_time_hours", "layer_count"):
            assert key in result["breakdown"]

    def test_large_print_job_cost(self):
        """24-hour job with 500g PLA should not overflow or error."""
        material = _make_material(cost_per_gram=Decimal("1.00"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(
            material_weight_grams=500.0,
            print_time_seconds=86400,
            support_material_grams=50.0,
        )
        result = calculate_cost(db, sr)
        assert result["total_cost"] > 0

    def test_custom_machine_hourly_rate_from_config(self):
        material = _make_material(cost_per_gram=Decimal("0.00"))
        db = _mock_db(material=material, configs={"machine_hourly_rate": 1000})
        sr = _make_slicing_result(
            material_weight_grams=0.0,
            print_time_seconds=3600,
            support_material_grams=0.0,
        )
        result = calculate_cost(db, sr)
        assert result["machine_cost"] == 1000.0

    def test_uses_weight_from_slicing_result_not_volume(self):
        """When material_weight_grams is set it should take priority over volume-derived weight."""
        material = _make_material(density=1.24, cost_per_gram=Decimal("1.00"))
        db = _mock_db(material=material)
        sr = _make_slicing_result(
            material_volume_mm3=1_000_000.0,   # huge volume → 1000 cm³ → 1240 g
            material_weight_grams=10.0,        # actual weight override
            print_time_seconds=0,
        )
        result = calculate_cost(db, sr)
        # material cost based on 10 g × 1.00 × 1.25 × 1.25 = 15.63
        assert result["breakdown"]["material_weight_grams"] == 10.0


# ──────────────────────────────────────────────
# File Validators
# ──────────────────────────────────────────────

class TestFileExtensionValidator:
    @pytest.mark.parametrize("fname", ["model.stl", "part.STL", "assembly.step", "cad.stp", "PART.STEP"])
    def test_valid_extensions_accepted(self, fname):
        assert validate_file_extension(fname) is True

    @pytest.mark.parametrize("fname", ["doc.txt", "image.png", "archive.zip", "script.py", "model.obj", "model.3mf"])
    def test_invalid_extensions_rejected(self, fname):
        assert validate_file_extension(fname) is False

    def test_no_extension_rejected(self):
        assert validate_file_extension("modelfile") is False

    def test_double_extension_uses_last(self):
        # "model.txt.stl" — last extension is .stl → valid
        assert validate_file_extension("model.txt.stl") is True

    def test_extension_only_filename(self):
        assert validate_file_extension(".stl") is True


class TestFileSizeValidator:
    def test_normal_size_accepted(self):
        assert validate_file_size(1024) is True

    def test_zero_size_rejected(self):
        assert validate_file_size(0) is False

    def test_negative_size_rejected(self):
        assert validate_file_size(-1) is False

    def test_exactly_50mb_accepted(self):
        assert validate_file_size(50 * 1024 * 1024) is True

    def test_one_byte_over_50mb_rejected(self):
        assert validate_file_size(50 * 1024 * 1024 + 1) is False

    def test_one_byte_file_accepted(self):
        assert validate_file_size(1) is True


class TestSanitizeFilename:
    def test_normal_filename_unchanged(self):
        assert sanitize_filename("model.stl") == "model.stl"

    def test_path_traversal_stripped(self):
        result = sanitize_filename("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result

    def test_dangerous_chars_removed(self):
        result = sanitize_filename('file<name>:with|bad"chars?.stl')
        for ch in '<>:"|?*':
            assert ch not in result

    def test_long_filename_truncated(self):
        long = "a" * 300 + ".stl"
        result = sanitize_filename(long)
        assert len(result) <= 255

    def test_windows_path_stripped(self):
        result = sanitize_filename("C:\\Users\\admin\\model.stl")
        assert "\\" not in result
        assert result.endswith("model.stl")

    def test_empty_filename_returns_empty_or_safe(self):
        result = sanitize_filename("")
        assert isinstance(result, str)  
