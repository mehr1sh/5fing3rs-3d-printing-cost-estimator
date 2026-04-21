import pytest
from app.services.gcode_parser import calculate_material_breakdown

def test_calculate_material_breakdown():
    gcode_content = """
;TYPE:SKIRT
G1 F1500 E0.5
G1 X10 Y10 E1.0
;TYPE:WALL-OUTER
G1 X20 Y20 E2.0
;TYPE:SUPPORT
G1 X30 Y30 E3.0
G1 X40 Y40 E4.0
;TYPE:FILL
G1 X50 Y50 E5.0
"""
    breakdown = calculate_material_breakdown(gcode_content)
    
    # Filament diameter 1.75 -> area = 2.405...
    area = 3.14159 * (1.75 / 2) ** 2
    
    # SKIRT: 1.0 (total E at end of skirt) -> 1.0 * area
    expected_skirt = 1.0 * area
    # WALL-OUTER: 2.0 (E) - 1.0 (last_e) = 1.0 * area
    expected_wall = 1.0 * area
    # SUPPORT: 4.0 (E) - 2.0 (last_e) = 2.0 * area
    expected_support = 2.0 * area
    # FILL: 5.0 (E) - 4.0 (last_e) = 1.0 * area
    expected_fill = 1.0 * area
    
    assert pytest.approx(breakdown["SKIRT"]) == expected_skirt
    assert pytest.approx(breakdown["WALL-OUTER"]) == expected_wall
    assert pytest.approx(breakdown["SUPPORT"]) == expected_support
    assert pytest.approx(breakdown["FILL"]) == expected_fill

def test_calculate_material_breakdown_with_reset():
    gcode_content = """
;TYPE:WALL-INNER
G1 E1.0
G92 E0
G1 E0.5
"""
    breakdown = calculate_material_breakdown(gcode_content)
    area = 3.14159 * (1.75 / 2) ** 2
    # First 1.0, then reset, then 0.5. Total extrusion 1.5.
    assert pytest.approx(breakdown["WALL-INNER"]) == 1.5 * area
