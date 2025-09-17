from pydantic import BaseModel
from typing import Dict, Optional
from ..shared.config import HCX_API_URL

class ClaimInput(BaseModel):
    bundle: Dict 
    api_url: Optional[str] = HCX_API_URL