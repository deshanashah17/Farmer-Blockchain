"""
Auth routes — wallet-based authentication.
POST /api/auth/verify-wallet
"""

from datetime import datetime, timezone
from fastapi import APIRouter

from database import get_db
from models.schemas import VerifyWalletRequest, ApiResponse
from services.auth import create_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/verify-wallet", response_model=ApiResponse)
async def verify_wallet(req: VerifyWalletRequest):
    """
    Accept wallet address + role.
    Upsert user in MongoDB (if available).
    Return JWT.
    """
    # Try to save to DB, but don't fail if MongoDB is unavailable
    try:
        db = get_db()
        if db is not None:
            users = db["users"]
            now = datetime.now(timezone.utc)
            await users.update_one(
                {"wallet_address": req.wallet_address},
                {
                    "$set": {
                        "wallet_address": req.wallet_address,
                        "role": req.role,
                        "last_login": now,
                    },
                    "$setOnInsert": {
                        "created_at": now,
                        "name": None,
                        "phone": None,
                        "location": None,
                        "total_earned_algo": 0.0,
                        "trades_completed": 0,
                    },
                },
                upsert=True,
            )
    except Exception as e:
        # Log but don't fail auth if DB is unavailable
        print(f"⚠️  Warning: Could not save user to DB: {e}")

    # Always return token, even if DB save fails
    token = create_token(req.wallet_address, req.role)

    return ApiResponse(
        success=True,
        data={
            "access_token": token,
            "token_type": "bearer",
            "wallet_address": req.wallet_address,
            "role": req.role,
        },
    )
