from pydantic import BaseModel
from typing import Dict, Optional

class AdminConfigResponse(BaseModel):
    config: Dict[str, str]

class AdminConfigUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
