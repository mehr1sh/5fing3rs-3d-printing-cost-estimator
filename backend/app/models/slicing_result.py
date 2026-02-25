from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from app.database.database import Base

class SlicingResult(Base):
    __tablename__ = "slicing_results"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.job_id"), nullable=False, index=True)
    gcode_path = Column(String(500), nullable=True)
    print_time_seconds = Column(Integer, nullable=True)
    material_volume_mm3 = Column(Float, nullable=True)
    material_weight_grams = Column(Float, nullable=True)
    support_material_grams = Column(Float, nullable=True, default=0.0)
    layer_count = Column(Integer, nullable=True)
    estimated_cost = Column(Numeric(10, 2), nullable=True)
    slicing_parameters = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
