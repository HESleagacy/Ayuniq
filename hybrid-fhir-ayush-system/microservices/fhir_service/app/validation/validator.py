## NOT INCLUDED PROTOTYPE
from fhir.resources.bundle import Bundle  #NOT A USER_DEFINED_IMPORT

def validate_fhir_bundle(bundle_data: dict) -> dict:
    try:
        bundle = Bundle.model_validate(bundle_data)
        if not bundle.entry or len(bundle.entry) < 2:
            return {"valid": False, "errors": "Bundle must have at least Condition and Claim entries."}
        #ROOM FOR ADDITIONAL CHECK SYSTEM
        return {"valid": True, "errors": None}
    except Exception as e:
        return {"valid": False, "errors": str(e)}   #TO catch exc