from pydantic import BaseModel
from typing import List, Optional

class FHIRInput(BaseModel):  #Optional sirf prototype ke liye hai
    name: Optional[str] = "Aftab"
    diagnosis: Optional[str] = "Boils"
    patient_id: str = "DEMO_ID"
    codes: List[str]  #["NAMASTE:Prameha", "ICD11:TM2-05.02"]