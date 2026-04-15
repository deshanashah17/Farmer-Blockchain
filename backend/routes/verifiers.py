"""
Verifier whitelist routes — admin-gated.
GET    /api/verifiers
POST   /api/verifiers
DELETE /api/verifiers/{address}
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models.schemas import VerifierCreate, ApiResponse
from services.auth import require_role, get_current_user

router = APIRouter(prefix="/api/verifiers", tags=["Verifiers"])


@router.get("", response_model=ApiResponse)
async def list_verifiers():
    """List all whitelisted verifiers."""
    db = get_db()
    verifiers = await db["verifiers"].find({}, {"_id": 0}).to_list(100)
    return ApiResponse(success=True, data=verifiers)


@router.post("", response_model=ApiResponse)
async def add_verifier(
    body: VerifierCreate,
    current_user: dict = Depends(require_role("admin")),
):
    """Add a wallet address to the verifier whitelist (admin only)."""
    db = get_db()

    existing = await db["verifiers"].find_one(
        {"wallet_address": body.wallet_address}
    )
    if existing:
        raise HTTPException(status_code=409, detail="Verifier already exists")

    doc = {
        "wallet_address": body.wallet_address,
        "name": body.name,
        "location": body.location,
        "added_at": datetime.now(timezone.utc),
        "added_by": current_user["wallet_address"],
    }
    await db["verifiers"].insert_one(doc)
    doc.pop("_id", None)
    return ApiResponse(success=True, data=doc)


@router.delete("/{address}", response_model=ApiResponse)
async def remove_verifier(
    address: str,
    current_user: dict = Depends(require_role("admin")),
):
    """Remove a verifier from the whitelist (admin only)."""
    db = get_db()
    result = await db["verifiers"].delete_one({"wallet_address": address})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verifier not found")
    return ApiResponse(success=True, data={"deleted": address})
