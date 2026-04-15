"""
Pydantic request / response models.
Every route returns ApiResponse for a consistent shape.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime


# ──────────────────────────────────────
#  Auth
# ──────────────────────────────────────
class VerifyWalletRequest(BaseModel):
    wallet_address: str
    role: str = "buyer"  # buyer | farmer | verifier | admin


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ──────────────────────────────────────
#  User
# ──────────────────────────────────────
class UserProfile(BaseModel):
    wallet_address: str
    role: str = "buyer"
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    total_earned_algo: float = 0.0
    trades_completed: int = 0
    created_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


# ──────────────────────────────────────
#  Trade
# ──────────────────────────────────────
class TradeCreate(BaseModel):
    farmer_address: str
    verifier_address: str
    crop_type: str
    quantity_kg: float
    price_per_kg: float
    delivery_deadline: datetime


class TradeOut(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    trade_id: Optional[str] = None
    buyer_address: Optional[str] = None
    farmer_address: Optional[str] = None
    verifier_address: Optional[str] = None
    crop_type: Optional[str] = None
    quantity_kg: Optional[float] = None
    price_per_kg: Optional[float] = None
    amount_micro_algo: Optional[int] = None
    delivery_deadline: Optional[datetime] = None
    state: str = "CREATED"
    state_code: int = 0
    ipfs_cid: Optional[str] = None
    app_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"populate_by_name": True}


class SubmitTxnRequest(BaseModel):
    signed_txn: str  # base64-encoded signed transaction bytes


class VoteDisputeRequest(BaseModel):
    vote_for_farmer: bool


class VerifyContractRequest(BaseModel):
    """Verifier checkbox-based governance."""
    approved: bool  # True = approve delivery, False = mark violated


# ──────────────────────────────────────
#  Verifier
# ──────────────────────────────────────
class VerifierEntry(BaseModel):
    wallet_address: str
    name: Optional[str] = None
    location: Optional[str] = None
    added_at: Optional[datetime] = None


class VerifierCreate(BaseModel):
    wallet_address: str
    name: Optional[str] = None
    location: Optional[str] = None


# ──────────────────────────────────────
#  Generic Response Wrapper
# ──────────────────────────────────────
class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
