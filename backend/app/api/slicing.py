from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
from app.database.database import get_db
from app.models.job import Job
from app.models.user import User
from app.models.slicing_result import SlicingResult
from app.models.failure_log import FailureLog
from app.schemas.slicing import SlicingParams, SlicingResultResponse
from app.services.cura_service import execute_cura_slicing
from app.services.file_service import get_file_path, get_gcode_path, file_exists
from app.services.gcode_parser import parse_gcode
from app.services.email_service import send_slicing_complete_email, send_slicing_failed_email
from app.api.auth import get_current_user

router = APIRouter(prefix="/api", tags=["slicing"])

async def process_slicing(
    job_id: UUID,
    params: SlicingParams
):
    """Background task to process slicing."""
    # Create new database session for background task
    from app.database.database import SessionLocal
    db = SessionLocal()
    
    try:
        # Get job
        job = db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            return
        
        # Update job status
        job.status = "slicing"
        db.commit()
        
        # Get file paths
        stl_path = str(get_file_path(job_id, job.filename))
        gcode_path = str(get_gcode_path(job_id))
        
        if not file_exists(get_file_path(job_id, job.filename)):
            raise FileNotFoundError("Model file not found")
        
        # Execute slicing
        result = execute_cura_slicing(stl_path, gcode_path, params)
        
        # Parse G-code
        gcode_stats = parse_gcode(gcode_path)
        
        # Calculate material weight (simplified - use volume from G-code)
        material_volume_mm3 = gcode_stats.get("material_volume_mm3", 0)
        
        # Get material density
        from app.models.material import Material
        material = db.query(Material).filter(Material.name == params.material).first()
        if material:
            material_weight_grams = (material_volume_mm3 / 1000) * material.density_g_cm3
        else:
            material_weight_grams = (material_volume_mm3 / 1000) * 1.24  # Default PLA density
        
        # Estimate support material (10% of model volume if enabled)
        support_material_grams = 0.0
        if params.supportEnabled:
            support_volume_mm3 = material_volume_mm3 * 0.1
            if material:
                support_material_grams = (support_volume_mm3 / 1000) * material.density_g_cm3
        
        # Create slicing result
        slicing_result = SlicingResult(
            job_id=job_id,
            gcode_path=gcode_path,
            print_time_seconds=gcode_stats.get("print_time_seconds", 0),
            material_volume_mm3=material_volume_mm3,
            material_weight_grams=material_weight_grams,
            support_material_grams=support_material_grams,
            layer_count=gcode_stats.get("layer_count", 0),
            slicing_parameters=params.dict()
        )
        
        db.add(slicing_result)
        
        # Update job status
        job.status = "sliced"
        db.commit()
        
        # Send email notification (best-effort — don't let email errors fail the job)
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and user.email:
                try:
                    await send_slicing_complete_email(job, slicing_result, user.email)
                except Exception as email_err:
                    print(f"Email notification failed (non-fatal): {email_err}")
    
    except TimeoutError as e:
        job.status = "failed"
        db.commit()
        
        failure_log = FailureLog(
            job_id=job_id,
            error_type="slicing_timeout",
            error_message=str(e),
            stack_trace=None
        )
        db.add(failure_log)
        db.commit()
        
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and user.email:
                try:
                    await send_slicing_failed_email(job, str(e), user.email)
                except Exception as email_err:
                    print(f"Email notification failed (non-fatal): {email_err}")
    
    except Exception as e:
        job.status = "failed"
        db.commit()
        
        import traceback
        failure_log = FailureLog(
            job_id=job_id,
            error_type="slicing_error",
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        db.add(failure_log)
        db.commit()
        
        if job.user_id:
            user = db.query(User).filter(User.id == job.user_id).first()
            if user and user.email:
                try:
                    await send_slicing_failed_email(job, str(e), user.email)
                except Exception as email_err:
                    print(f"Email notification failed (non-fatal): {email_err}")
    finally:
        db.close()

@router.post("/slice/{job_id}", status_code=status.HTTP_202_ACCEPTED)
async def slice_model(
    job_id: UUID,
    params: SlicingParams,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start slicing process for a job."""
    job = db.query(Job).filter(Job.job_id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    if job.status == "slicing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slicing already in progress"
        )
    
    # Start background task (don't pass db session, it will create its own)
    background_tasks.add_task(process_slicing, job_id, params)
    
    return {
        "message": "Slicing started",
        "job_id": job_id,
        "status": "processing"
    }

@router.get("/files/{job_id}/output.gcode")
async def download_gcode(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download G-code file."""
    from fastapi.responses import FileResponse
    from app.services.file_service import file_exists
    
    job = db.query(Job).filter(Job.job_id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if job.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    gcode_path = get_gcode_path(job_id)
    
    if not file_exists(gcode_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="G-code file not found. Please complete slicing first."
        )
    
    return FileResponse(
        path=str(gcode_path),
        filename=f"{job.original_filename}.gcode",
        media_type="text/plain"
    )
