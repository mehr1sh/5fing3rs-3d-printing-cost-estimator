from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional

class MaterialCreate(BaseModel):
    name: str
    density_g_cm3: float
    cost_per_gram: Decimal

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    density_g_cm3: Optional[float] = None
    cost_per_gram: Optional[Decimal] = None

class MaterialResponse(BaseModel):
    id: int
    name: str
    density_g_cm3: float
    cost_per_gram: Decimal
    created_at: datetime

    class Config:
        from_attributes = True
