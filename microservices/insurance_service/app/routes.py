# routes.py: Defines API endpoints for insurance claims.

from fastapi import APIRouter, Body, HTTPException
from .models.claim_models import ClaimInput
'''
from .storage.db import save_claim_to_db, get_unsynced_claims, mark_as_synced
'''
from .storage.db import save_claim_to_db
from .utils.helpers import log_message


router = APIRouter()

@router.post("/submit")
async def submit_claim(input_data: ClaimInput = Body(...)):
    try:
        bundle = input_data.bundle
        claim_data = bundle.get("entry", [{}])[1].get("resource", {}) if len(bundle.get("entry", [])) > 1 else {}
        if not claim_data:
            raise ValueError("No Claim found in bundle")

        condition_data = bundle.get("entry", [{}])[0].get("resource", {})
        codes = condition_data.get("code", {}).get("coding", []) if condition_data else []

        # Save the claim bundle to the database (unsynced by default)
        claim_id = save_claim_to_db({
            "bundle": bundle,
            "claim_data": claim_data,
            "codes": [{"system": c.get("system"), "code": c.get("code")} for c in codes]
        })

        log_message(f"Mock submitted claim saved with ID: {claim_id}")
        return {
            "status": "success",
            "claim_id": f"MOCK_CLAIM_{claim_id}",
            "claim_data": claim_data,
            "codes": [{"system": c.get("system"), "code": c.get("code")} for c in codes]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")

'''
@router.get("/status/{claim_id}")
async def get_claim_status(claim_id: str):
    """Checks status of a claim via external API."""
    try:
        api_url = "https://api.hcx.gov.in/status"
        response = requests.get(f"{api_url}/{claim_id}", timeout=10)
        if response.status_code == 200:
            return response.json()
        raise HTTPException(status_code=response.status_code, detail=f"Status failed: {response.text}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@router.post("/sync")
async def sync_offline_data():
    """Syncs queued claims to external API."""
    unsynced = get_unsynced_claims()
    synced_count = 0
    for claim in unsynced:
        try:
            headers = {"Content-Type": "application/json"}
            response = requests.post(claim["api_url"], json=claim["data"], headers=headers, timeout=10)
            if response.status_code == 200:
                mark_as_synced(claim["id"])
                synced_count += 1
                log_message(f"Synced claim {claim['id']}")
        except Exception as e:
            log_message(f"Sync failed for {claim['id']}: {str(e)}")
    return {"synced_count": synced_count, "total_queued": len(unsynced), "message": "Sync attempted."}
'''
