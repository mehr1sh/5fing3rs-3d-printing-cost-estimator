from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class AdminConfig(Base):
    __tablename__ = "admin_config"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
