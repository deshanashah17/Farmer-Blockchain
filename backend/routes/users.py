"""
User profile routes.
GET  /api/users/{address}
POST /api/users
"""

from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from models.schemas import UserUpdate, ApiResponse
from services.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/{address}", response_model=ApiResponse)
async def get_user(address: str):
    """Get user profile by wallet address."""
    db = get_db()
    user = await db["users"].find_one(
        {"wallet_address": address}, {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return ApiResponse(success=True, data=user)


@router.post("", response_model=ApiResponse)
async def update_user(
    update: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the current user's profile."""
    db = get_db()
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db["users"].update_one(
        {"wallet_address": current_user["wallet_address"]},
        {"$set": update_data},
    )

    user = await db["users"].find_one(
        {"wallet_address": current_user["wallet_address"]}, {"_id": 0}
    )
    return ApiResponse(success=True, data=user)
