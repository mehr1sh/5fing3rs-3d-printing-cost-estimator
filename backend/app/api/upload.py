from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID
import uuid
from app.database.database import get_db
from app.models.job import Job
from app.models.user import User
from app.models.failure_log import FailureLog
from app.schemas.job import JobResponse
from app.services.file_service import save_uploaded_file
from app.services.email_service import send_upload_success_email
from app.api.auth import get_current_user

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload STL/STEP file and create a new job."""
    try:
        # Generate job ID
        job_id = uuid.uuid4()
        
        # Save file
        file_path, original_filename, file_size = await save_uploaded_file(file, job_id)
        
        # Create job record
        new_job = Job(
            job_id=job_id,
            user_id=current_user.id,
            filename=f"model{file.filename[file.filename.rfind('.'):]}",
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            status="uploaded"
        )
        
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        
        # Send email notification
        if current_user.email:
            await send_upload_success_email(new_job, current_user.email)
        
        return new_job
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Log failure
        failure_log = FailureLog(
            job_id=job_id if 'job_id' in locals() else None,
            error_type="upload_error",
            error_message=str(e),
            stack_trace=None
        )
        db.add(failure_log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}"
        )

@router.get("/jobs", response_model=list[dict])
async def get_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all jobs for the current user."""
    jobs = db.query(Job).filter(Job.user_id == current_user.id).order_by(Job.created_at.desc()).all()
    return [
        {
            "job_id": job.job_id,
            "filename": job.filename,
            "original_filename": job.original_filename,
            "status": job.status,
            "file_size": job.file_size,
            "created_at": job.created_at,
            "updated_at": job.updated_at
        }
        for job in jobs
    ]

@router.get("/job/{job_id}", response_model=dict)
async def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get job details including slicing results."""
    job = db.query(Job).filter(Job.job_id == job_id).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if user owns the job or is admin
    if job.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this job"
        )
    
    # Get slicing result if exists
    from app.models.slicing_result import SlicingResult
    slicing_result = db.query(SlicingResult).filter(SlicingResult.job_id == job_id).first()
    
    result = {
        "job_id": job.job_id,
        "filename": job.filename,
        "original_filename": job.original_filename,
        "status": job.status,
        "file_size": job.file_size,
        "created_at": job.created_at,
        "updated_at": job.updated_at
    }
    
    if slicing_result:
        result["slicing_result"] = {
            "gcode_path": slicing_result.gcode_path,
            "print_time_seconds": slicing_result.print_time_seconds,
            "material_volume_mm3": slicing_result.material_volume_mm3,
            "material_weight_grams": slicing_result.material_weight_grams,
            "support_material_grams": slicing_result.support_material_grams,
            "layer_count": slicing_result.layer_count,
            "estimated_cost": float(slicing_result.estimated_cost) if slicing_result.estimated_cost else None,
            "slicing_parameters": slicing_result.slicing_parameters,
            "created_at": slicing_result.created_at
        }
    
    return result

@router.get("/files/{job_id}/model.stl")
async def download_model(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download model file."""
    from fastapi.responses import FileResponse
    from app.services.file_service import get_file_path, file_exists
    
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
    
    file_path = get_file_path(job_id, job.filename)
    
    if not file_exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(
        path=str(file_path),
        filename=job.original_filename,
        media_type="application/octet-stream"
    )
