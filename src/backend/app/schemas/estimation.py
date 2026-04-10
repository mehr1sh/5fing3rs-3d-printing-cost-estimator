from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class CostBreakdown(BaseModel):
    material_weight_grams: float
    print_time_hours: float
    layer_count: int

class CostEstimateResponse(BaseModel):
    job_id: UUID
    material_cost: float
    support_cost: float
    machine_cost: float
    subtotal: float
    waste_overhead: float
    failure_overhead: float
    total_cost: float
    currency: str = "INR"
    breakdown: CostBreakdown
