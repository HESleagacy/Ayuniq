# claim_models.py: Pydantic models for claim processing.

from pydantic import BaseModel
from typing import Dict, Optional

class ClaimInput(BaseModel):
    """Input model for /submit endpoint."""
    bundle: Dict  # Full FHIR bundle
    api_url: Optional[str] = "https://api.hcx.gov.in/submit"  # Default external API