"""Seed initial data into the database."""
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.material import Material
from app.models.admin_config import AdminConfig

def seed_materials(db: Session):
    """Seed materials table."""
    materials = [
        {"name": "PLA", "density_g_cm3": 1.24, "cost_per_gram": 0.025},
        {"name": "ABS", "density_g_cm3": 1.04, "cost_per_gram": 0.028},
        {"name": "PETG", "density_g_cm3": 1.27, "cost_per_gram": 0.032},
        {"name": "TPU", "density_g_cm3": 1.21, "cost_per_gram": 0.045},
    ]
    
    for mat_data in materials:
        existing = db.query(Material).filter(Material.name == mat_data["name"]).first()
        if not existing:
            material = Material(**mat_data)
            db.add(material)
    
    db.commit()
    print("Materials seeded successfully")

def seed_admin_config(db: Session):
    """Seed admin configuration."""
    configs = [
        {"key": "machine_hourly_rate", "value": "500", "description": "Machine time cost in INR/hour"},
        {"key": "waste_factor", "value": "1.25", "description": "Material waste multiplier"},
        {"key": "failure_factor", "value": "1.25", "description": "Print failure risk multiplier"},
        {"key": "printer_volume_x", "value": "200", "description": "Build volume X in mm"},
        {"key": "printer_volume_y", "value": "200", "description": "Build volume Y in mm"},
        {"key": "printer_volume_z", "value": "200", "description": "Build volume Z in mm"},
    ]
    
    for config_data in configs:
        existing = db.query(AdminConfig).filter(AdminConfig.key == config_data["key"]).first()
        if existing:
            existing.value = config_data["value"]
            if config_data.get("description"):
                existing.description = config_data["description"]
        else:
            config = AdminConfig(**config_data)
            db.add(config)
    
    db.commit()
    print("Admin configuration seeded successfully")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_materials(db)
        seed_admin_config(db)
    finally:
        db.close()
