from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.database.database import get_db
from app.models.job import Job
from app.models.user import User
from app.models.slicing_result import SlicingResult
from app.schemas.estimation import CostEstimateResponse, CostBreakdown
from app.services.cost_calculator import calculate_cost
from app.api.auth import get_current_user

router = APIRouter(prefix="/api", tags=["estimation"])

@router.post("/estimate/{job_id}", response_model=CostEstimateResponse)
async def estimate_cost(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate cost estimate for a sliced job."""
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
    
    slicing_result = db.query(SlicingResult).filter(SlicingResult.job_id == job_id).first()
    
    if not slicing_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job has not been sliced yet. Please slice the model first."
        )
    
    # Calculate cost
    cost_data = calculate_cost(db, slicing_result)
    
    # Update estimated cost in slicing result
    slicing_result.estimated_cost = cost_data["total_cost"]
    db.commit()
    
    return CostEstimateResponse(
        job_id=job_id,
        material_cost=cost_data["material_cost"],
        support_cost=cost_data["support_cost"],
        machine_cost=cost_data["machine_cost"],
        subtotal=cost_data["subtotal"],
        waste_overhead=cost_data["waste_overhead"],
        failure_overhead=cost_data["failure_overhead"],
        total_cost=cost_data["total_cost"],
        currency="INR",
        breakdown=CostBreakdown(**cost_data["breakdown"])
    )
