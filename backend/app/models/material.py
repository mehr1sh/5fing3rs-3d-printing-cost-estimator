from sqlalchemy import Column, Integer, String, Float, DateTime, Numeric
from sqlalchemy.sql import func
from app.database.database import Base

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    density_g_cm3 = Column(Float, nullable=False)
    cost_per_gram = Column(Numeric(10, 4), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
