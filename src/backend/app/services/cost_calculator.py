from decimal import Decimal, ROUND_HALF_UP
from typing import Dict
from sqlalchemy.orm import Session
from app.models.material import Material
from app.models.admin_config import AdminConfig
from app.models.slicing_result import SlicingResult

def get_config_value(db: Session, key: str, default: str) -> float:
    """Get configuration value from database."""
    config = db.query(AdminConfig).filter(AdminConfig.key == key).first()
    if config:
        return float(config.value)
    return float(default)

def calculate_cost(db: Session, slicing_result: SlicingResult) -> Dict:
    """Calculate cost estimate for a slicing result."""
    # Get material
    material_name = slicing_result.slicing_parameters.get("material", "PLA") if slicing_result.slicing_parameters else "PLA"
    material = db.query(Material).filter(Material.name == material_name).first()
    
    if not material:
        raise ValueError(f"Material {material_name} not found")
    
    # Get configuration values
    machine_hourly_rate = get_config_value(db, "machine_hourly_rate", "500")
    waste_factor = get_config_value(db, "waste_factor", "1.25")
    failure_factor = get_config_value(db, "failure_factor", "1.25")
    
    # Material cost calculation
    material_volume_cm3 = slicing_result.material_volume_mm3 / 1000 if slicing_result.material_volume_mm3 else 0
    material_weight_grams = material_volume_cm3 * material.density_g_cm3
    
    # Use actual weight if available
    if slicing_result.material_weight_grams:
        material_weight_grams = slicing_result.material_weight_grams
    
    raw_material_cost = float(material.cost_per_gram) * material_weight_grams
    
    # Apply overhead factors
    material_cost_with_overhead = raw_material_cost * waste_factor * failure_factor
    
    # Support material cost
    support_weight_grams = slicing_result.support_material_grams or 0
    support_cost = 0.0
    raw_support_cost = 0.0
    if support_weight_grams > 0:
        raw_support_cost = float(material.cost_per_gram) * support_weight_grams
        support_cost = raw_support_cost * waste_factor * failure_factor
    
    # Machine time cost
    print_time_hours = slicing_result.print_time_seconds / 3600 if slicing_result.print_time_seconds else 0
    machine_cost = print_time_hours * machine_hourly_rate
    
    # Calculate overhead amounts
    waste_overhead = raw_material_cost * (waste_factor - 1)
    failure_overhead = (raw_material_cost * waste_factor) * (failure_factor - 1)
    
    # Subtotal before overhead
    subtotal = raw_material_cost + (raw_support_cost if support_weight_grams > 0 else 0) + machine_cost
    
    # Total cost
    total_cost = material_cost_with_overhead + support_cost + machine_cost
    
    # Round to nearest paisa (0.01 INR)
    total_cost = float(Decimal(str(total_cost)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    material_cost_with_overhead = float(Decimal(str(material_cost_with_overhead)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    support_cost = float(Decimal(str(support_cost)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    machine_cost = float(Decimal(str(machine_cost)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    waste_overhead = float(Decimal(str(waste_overhead)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    failure_overhead = float(Decimal(str(failure_overhead)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    subtotal = float(Decimal(str(subtotal)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    return {
        "material_cost": material_cost_with_overhead,
        "support_cost": support_cost,
        "machine_cost": machine_cost,
        "subtotal": subtotal,
        "waste_overhead": waste_overhead,
        "failure_overhead": failure_overhead,
        "total_cost": total_cost,
        "breakdown": {
            "material_weight_grams": round(material_weight_grams, 2),
            "print_time_hours": round(print_time_hours, 2),
            "layer_count": slicing_result.layer_count or 0
        }
    }
