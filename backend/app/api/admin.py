from fastapi import APIRouter, Depends, HTTPException, status
import os
from sqlalchemy.orm import Session
from typing import List
from app.database.database import get_db
from app.models.user import User
from app.models.material import Material
from app.models.admin_config import AdminConfig
from app.models.failure_log import FailureLog
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialResponse
from app.schemas.admin import AdminConfigResponse, AdminConfigUpdate
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Materials CRUD
@router.get("/materials", response_model=List[MaterialResponse])
async def list_materials(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all materials."""
    return db.query(Material).all()

@router.post("/materials", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(
    material_data: MaterialCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create a new material."""
    existing = db.query(Material).filter(Material.name == material_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material with this name already exists"
        )
    
    new_material = Material(
        name=material_data.name,
        density_g_cm3=material_data.density_g_cm3,
        cost_per_gram=material_data.cost_per_gram
    )
    
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    
    return new_material

@router.put("/materials/{material_id}", response_model=MaterialResponse)
async def update_material(
    material_id: int,
    material_data: MaterialUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update a material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    if material_data.name is not None:
        material.name = material_data.name
    if material_data.density_g_cm3 is not None:
        material.density_g_cm3 = material_data.density_g_cm3
    if material_data.cost_per_gram is not None:
        material.cost_per_gram = material_data.cost_per_gram
    
    db.commit()
    db.refresh(material)
    
    return material

@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    db.delete(material)
    db.commit()
    
    return None

# Configuration
@router.get("/config", response_model=AdminConfigResponse)
async def get_config(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all configuration values."""
    configs = db.query(AdminConfig).all()
    return {
        "config": {config.key: config.value for config in configs}
    }

@router.put("/config", response_model=AdminConfigResponse)
async def update_config(
    config_data: AdminConfigUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update a configuration value."""
    config = db.query(AdminConfig).filter(AdminConfig.key == config_data.key).first()
    
    if config:
        config.value = config_data.value
        if config_data.description is not None:
            config.description = config_data.description
    else:
        config = AdminConfig(
            key=config_data.key,
            value=config_data.value,
            description=config_data.description
        )
        db.add(config)
    
    db.commit()
    db.refresh(config)
    
    # Return all configs
    configs = db.query(AdminConfig).all()
    return {
        "config": {c.key: c.value for c in configs}
    }

# Failure Logs
@router.get("/logs")
async def get_failure_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get failure logs."""
    logs = db.query(FailureLog).order_by(FailureLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "job_id": str(log.job_id) if log.job_id else None,
            "error_type": log.error_type,
            "error_message": log.error_message,
            "created_at": log.created_at
        }
        for log in logs
    ]

# Dashboard Stats
@router.get("/stats")
async def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get system-wide statistics."""
    from app.models.user import User
    from app.models.job import Job
    from app.models.failure_log import FailureLog
    
    total_users = db.query(User).count()
    total_jobs = db.query(Job).count()
    failed_jobs = db.query(FailureLog).count()
    running_jobs = db.query(Job).filter(Job.status.in_(["uploaded", "slicing"])).count()
    
    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "failed_jobs": failed_jobs,
        "running_jobs": running_jobs
    }

# All Jobs
@router.get("/all-jobs")
async def get_all_jobs(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all jobs in the system."""
    from app.models.job import Job
    jobs = db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return jobs

# System Logs
@router.get("/system-logs")
async def get_system_logs(
    lines: int = 100,
    admin: User = Depends(require_admin)
):
    """Read the latest application logs."""
    log_file = "/app/logs/app.log"
    if not os.path.exists(log_file):
        return {"logs": "Log file not found."}
    
    try:
        with open(log_file, "r") as f:
            content = f.readlines()
            # Return last N lines
            last_lines = content[-lines:] if len(content) > lines else content
            return {"logs": "".join(last_lines)}
    except Exception as e:
        return {"logs": f"Error reading logs: {str(e)}"}
