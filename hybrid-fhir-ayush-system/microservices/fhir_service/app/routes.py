from  fastapi import APIRouter, Body, HTTPException  
from .models.fhir_models import FHIRInput 
from .storage.db import save_bundle_to_db  
'''
 from validation.validator import validate_fhir_bundle 
 from storage.db import get_unsynced_bundles, mark_as_synced
 '''

from fhir.resources.bundle import Bundle            
from fhir.resources.condition import Condition      
from fhir.resources.claim import Claim              
from fhir.resources.codeableconcept import CodeableConcept  
from fhir.resources.coding import Coding           


from datetime import datetime


router = APIRouter()  


@router.post("/generate")
async def generate_bundle(input_data: FHIRInput = Body(...)):
    """
    Generates a FHIR Bundle containing a Condition and a Claim resource
    based on input codes and patient ID.
    """
    try:
        codings = [
            Coding(system=code.split(":")[0], code=code.split(":")[1])  # Split system and code and create Coding object
            for code in input_data.codes
        ]

        # Create a Condition resource for the patient
        condition = Condition(
            clinicalStatus=CodeableConcept(
                coding=[Coding(
                    system="http://terminology.hl7.org/CodeSystem/condition-clinical", 
                    code="active" 
                )]
            ),
            code=CodeableConcept(coding=codings), 
            subject={"reference": f"Patient/{input_data.patient_id}"} 
        )

        claim = Claim(
            created=datetime.now().date().isoformat(),  
            status="active",                          
            use="claim",                               
            type=CodeableConcept(text="consultation"),
            patient={"reference": f"Patient/{input_data.patient_id}"}  
        )

        bundle = Bundle(
            type="collection", 
            entry=[{"resource": condition}, {"resource": claim}]  
        )
        bundle_dict = bundle.model_dump()
        save_bundle_to_db(bundle_dict)
        return {"bundle": bundle_dict}

    except Exception as e:
        # Catch error
        raise HTTPException(status_code=500, detail=f"Bundle generation failed: {str(e)}")

    
#EXCLUDED FROM PROTOTYPE
'''
@router.post("/validate")  #FOLLOWS R4 VALIDATION
async def validate_bundle(bundle_data: dict = Body(...)):
    validation_result = validate_fhir_bundle(bundle_data)

    # 400 FOR VALIDATION ERROR
    if not validation_result["valid"]:
        raise HTTPException(status_code=400, detail=validation_result["errors"])
    return validation_result


@router.post("/sync")
async def sync_offline_data():
    """
    Sync unsynced bundles stored in local DB.
    - Fetch all unsynced bundles.
    - In MVP: mark them as synced (simulation).
    - In production: actually send them to external backend/insurance API.
    """
    unsynced = get_unsynced_bundles()  # Fetch unsynced bundles from DB

    for bundle in unsynced:
        # Normally, you'd send this bundle to backend via requests.post(...)
        # For MVP, we just mark it as synced locally.
        mark_as_synced(bundle["id"])

    # Return how many bundles got synced
    return {"synced_count": len(unsynced), "message": "Offline data synced."}
    '''
