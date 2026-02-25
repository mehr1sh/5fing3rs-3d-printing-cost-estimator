from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database.database import Base

class FailureLog(Base):
    __tablename__ = "failure_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.job_id"), nullable=True)
    error_type = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
