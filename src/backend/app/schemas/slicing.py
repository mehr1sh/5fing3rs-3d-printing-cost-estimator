from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime

class SlicingParams(BaseModel):
    material: Literal["PLA", "ABS", "PETG", "TPU"]
    layerHeight: float = Field(..., description="Layer height in mm", ge=0.1, le=0.4)
    infillDensity: float = Field(..., description="Infill density percentage", ge=0, le=100)
    infillPattern: Literal["grid", "lines", "triangles", "cubic", "gyroid"]
    wallThickness: float = Field(..., description="Wall thickness in mm", gt=0)
    topBottomLayers: int = Field(..., description="Number of top/bottom layers", ge=1)
    supportEnabled: bool = False
    supportType: Literal["none", "touching_buildplate", "everywhere"] = "none"
    supportDensity: float = Field(default=20.0, description="Support density percentage", ge=0, le=100)
    printSpeed: float = Field(..., description="Print speed in mm/s", gt=0)
    buildPlateAdhesion: Literal["none", "skirt", "brim", "raft"] = "none"
    nozzleTemp: int = Field(..., description="Nozzle temperature in °C", ge=150, le=300)
    bedTemp: int = Field(..., description="Bed temperature in °C", ge=0, le=120)

class SlicingResultResponse(BaseModel):
    job_id: UUID
    gcode_path: Optional[str]
    print_time_seconds: Optional[int]
    material_volume_mm3: Optional[float]
    material_weight_grams: Optional[float]
    support_material_grams: Optional[float]
    layer_count: Optional[int]
    estimated_cost: Optional[float]
    slicing_parameters: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True
