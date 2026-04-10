from pydantic import BaseModel
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from .slicing import SlicingResultResponse

class JobCreate(BaseModel):
    filename: str
    file_size: int

class JobResponse(BaseModel):
    job_id: UUID
    filename: str
    status: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

class JobDetail(BaseModel):
    job_id: UUID
    filename: str
    original_filename: str
    status: str
    file_size: int
    created_at: datetime
    updated_at: Optional[datetime]
    slicing_result: Optional[dict] = None

    class Config:
        from_attributes = True
