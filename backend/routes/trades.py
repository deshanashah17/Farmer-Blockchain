"""
Trade routes — all CRUD + blockchain transaction builders.
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query

from database import get_db
from models.schemas import (
    TradeCreate, SubmitTxnRequest, VoteDisputeRequest,
    VerifyContractRequest, ApiResponse,
)
from services.auth import get_current_user, require_role
from services.algorand import (
    build_create_trade_txn,
    build_fund_txn,
    build_confirm_txn,
    build_dispute_txn,
    build_refund_txn,
    build_vote_dispute_txn,
    build_mark_delivered_txn,
    submit_signed_txn,
    get_app_state,
    get_state_label,
)
from services.ipfs import upload_to_ipfs
from config import get_settings

router = APIRouter(prefix="/api/trades", tags=["Trades"])

# State code constants
STATES = {
    "CREATED": 0, "ACCEPTED": 1, "FUNDED": 2, "DELIVERED": 3,
    "RELEASED": 4, "DISPUTED": 5, "EXPIRED": 6, "CANCELLED": 7,
    "VIOLATED": 8, "REFUNDED": 9,
}


def _serialize_trade(trade: dict) -> dict:
    """Convert MongoDB doc to JSON-serializable dict."""
    if trade and "_id" in trade:
        trade["_id"] = str(trade["_id"])
    return trade


# Test endpoint (NO AUTH) — for debugging
@router.get("/test/ping", response_model=ApiResponse)
async def test_ping():
    """Test endpoint — no auth required."""
    return ApiResponse(success=True, data={"message": "Backend is working!"})


# ───────────────────────────────────────
#  CRUD
# ───────────────────────────────────────

@router.post("", response_model=ApiResponse)
async def create_trade(
    body: TradeCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new trade record in MongoDB (state = CREATED)."""
    db = get_db()
    settings = get_settings()

    amount_micro_algo = int(body.quantity_kg * body.price_per_kg * 1_000_000)
    now = datetime.now(timezone.utc)

    trade_doc = {
        "buyer_address": current_user["wallet_address"],
        "farmer_address": body.farmer_address,
        "verifier_address": body.verifier_address,
        "crop_type": body.crop_type,
        "quantity_kg": body.quantity_kg,
        "price_per_kg": body.price_per_kg,
        "amount_micro_algo": amount_micro_algo,
        "delivery_deadline": body.delivery_deadline,
        "state": "CREATED",
        "state_code": 0,
        "ipfs_cid": None,
        "app_id": settings.CONTRACT_APP_ID,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["trades"].insert_one(trade_doc)
    trade_doc["_id"] = str(result.inserted_id)

    return ApiResponse(success=True, data=trade_doc)


@router.post("/{trade_id}/build-create-txn", response_model=ApiResponse)
async def build_create_txn(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned create_trade transaction for the buyer to sign."""
    db = get_db()
    try:
        trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trade ID")

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    if trade["buyer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only buyer can create trade on-chain")

    if trade["state"] != "CREATED":
        raise HTTPException(status_code=400, detail="Trade must be in CREATED state")

    # Build the unsigned transaction
    unsigned_txn = build_create_trade_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
        trade_id=str(trade["_id"]),
        farmer_address=trade["farmer_address"],
        verifier_address=trade["verifier_address"],
        amount=trade["amount_micro_algo"],
        deadline=trade["delivery_deadline"],
    )

    return ApiResponse(
        success=True,
        data={"unsigned_txn": unsigned_txn, "trade_id": trade_id},
    )


@router.get("", response_model=ApiResponse)
async def list_trades(
    status: Optional[str] = Query(None, description="Filter: active,completed,rejected,all"),
    current_user: dict = Depends(get_current_user),
):
    """List all trades where the user is buyer, farmer, or verifier."""
    db = get_db()
    addr = current_user["wallet_address"]

    query = {
        "$or": [
            {"buyer_address": addr},
            {"farmer_address": addr},
            {"verifier_address": addr},
        ]
    }

    # Optional status filter
    if status == "active":
        query["state"] = {"$in": ["CREATED", "ACCEPTED", "FUNDED", "DELIVERED"]}
    elif status == "completed":
        query["state"] = {"$in": ["RELEASED", "REFUNDED"]}
    elif status == "rejected":
        query["state"] = {"$in": ["VIOLATED", "DISPUTED", "EXPIRED", "CANCELLED"]}

    cursor = db["trades"].find(query).sort("created_at", -1)

    trades = await cursor.to_list(100)
    return ApiResponse(success=True, data=[_serialize_trade(t) for t in trades])


@router.get("/pending-verification", response_model=ApiResponse)
async def pending_verification(current_user: dict = Depends(get_current_user)):
    """Trades in DELIVERED state for this verifier."""
    db = get_db()
    cursor = db["trades"].find({
        "verifier_address": current_user["wallet_address"],
        "state": "DELIVERED",
    }).sort("updated_at", -1)

    trades = await cursor.to_list(100)
    return ApiResponse(success=True, data=[_serialize_trade(t) for t in trades])


@router.get("/{trade_id}", response_model=ApiResponse)
async def get_trade(trade_id: str):
    """Get a single trade, merged with live on-chain state if available."""
    db = get_db()
    try:
        trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trade ID")

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    # Try to sync with on-chain state
    if trade.get("app_id") and trade["app_id"] > 0:
        try:
            on_chain = await get_app_state(trade["app_id"])
            if "state" in on_chain:
                chain_state_code = on_chain["state"]
                chain_state = get_state_label(chain_state_code)
                if chain_state != trade.get("state"):
                    await db["trades"].update_one(
                        {"_id": trade["_id"]},
                        {"$set": {
                            "state": chain_state,
                            "state_code": chain_state_code,
                            "updated_at": datetime.now(timezone.utc),
                        }},
                    )
                    trade["state"] = chain_state
                    trade["state_code"] = chain_state_code
        except Exception:
            pass  # On-chain sync is best-effort

    return ApiResponse(success=True, data=_serialize_trade(trade))


@router.get("/{trade_id}/status", response_model=ApiResponse)
async def get_trade_status(trade_id: str):
    """Lightweight status endpoint — called every 5s by frontend polling."""
    db = get_db()
    try:
        trade = await db["trades"].find_one(
            {"_id": ObjectId(trade_id)},
            {"state": 1, "state_code": 1, "_id": 0},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trade ID")

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    return ApiResponse(success=True, data=trade)


# ───────────────────────────────────────
#  Transaction Builders
# ───────────────────────────────────────

@router.post("/{trade_id}/accept", response_model=ApiResponse)
async def accept_contract(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Farmer accepts a contract. Transitions CREATED → ACCEPTED."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "CREATED":
        raise HTTPException(status_code=400, detail="Trade not in CREATED state")
    if trade["farmer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only the assigned farmer can accept")

    await db["trades"].update_one(
        {"_id": ObjectId(trade_id)},
        {"$set": {
            "state": "ACCEPTED",
            "state_code": STATES["ACCEPTED"],
            "accepted_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    return ApiResponse(success=True, data={"state": "ACCEPTED", "trade_id": trade_id})


@router.post("/{trade_id}/fund", response_model=ApiResponse)
async def fund_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned fund_escrow transaction group. Requires ACCEPTED state."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "ACCEPTED":
        raise HTTPException(status_code=400, detail="Trade not in ACCEPTED state. Farmer must accept first.")
    if trade["buyer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only buyer can fund")

    txn_data = build_fund_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
        amount_micro_algo=trade["amount_micro_algo"],
    )

    return ApiResponse(success=True, data={"unsigned_txns": txn_data})


@router.post("/{trade_id}/deliver", response_model=ApiResponse)
async def mark_delivered(
    trade_id: str,
    proof_photo: UploadFile | None = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Mark trade as delivered. Optionally upload proof photo to IPFS."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "FUNDED":
        raise HTTPException(status_code=400, detail="Trade not in FUNDED state")
    if trade["farmer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only farmer can mark delivery")

    update_fields = {
        "state": "DELIVERED",
        "state_code": 2,
        "updated_at": datetime.now(timezone.utc),
    }

    # Upload proof photo to IPFS if provided
    if proof_photo:
        file_bytes = await proof_photo.read()
        cid = await upload_to_ipfs(file_bytes, proof_photo.filename, trade_id)
        update_fields["ipfs_cid"] = cid

    await db["trades"].update_one(
        {"_id": ObjectId(trade_id)},
        {"$set": update_fields},
    )

    # Also build the mark_delivered on-chain txn
    unsigned_txn = build_mark_delivered_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
    )

    return ApiResponse(
        success=True,
        data={
            "state": "DELIVERED",
            "ipfs_cid": update_fields.get("ipfs_cid"),
            "unsigned_txn": unsigned_txn,
        },
    )


@router.post("/{trade_id}/confirm", response_model=ApiResponse)
async def confirm_delivery(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned confirm_delivery transaction."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "DELIVERED":
        raise HTTPException(status_code=400, detail="Trade not in DELIVERED state")
    if trade["verifier_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only verifier can confirm")

    unsigned_txn = build_confirm_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
    )

    return ApiResponse(success=True, data={"unsigned_txn": unsigned_txn})


@router.post("/{trade_id}/verify", response_model=ApiResponse)
async def verify_contract(
    trade_id: str,
    body: VerifyContractRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Verifier checkbox-based governance.
    approved=True  → release payment to farmer (RELEASED)
    approved=False → mark as violated (VIOLATED), buyer can withdraw
    """
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "DELIVERED":
        raise HTTPException(status_code=400, detail="Trade not in DELIVERED state")
    if trade["verifier_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only assigned verifier can verify")

    now = datetime.now(timezone.utc)

    if body.approved:
        # Approve → build confirm txn and set RELEASED
        unsigned_txn = build_confirm_txn(
            sender=current_user["wallet_address"],
            app_id=trade["app_id"],
        )
        await db["trades"].update_one(
            {"_id": ObjectId(trade_id)},
            {"$set": {
                "state": "RELEASED",
                "state_code": STATES["RELEASED"],
                "verified_at": now,
                "verified_by": current_user["wallet_address"],
                "verification_result": "approved",
                "updated_at": now,
            }},
        )
        # Update farmer earnings
        amount_algo = trade["amount_micro_algo"] / 1_000_000
        await db["users"].update_one(
            {"wallet_address": trade["farmer_address"]},
            {"$inc": {"total_earned_algo": amount_algo, "trades_completed": 1}},
        )
        return ApiResponse(success=True, data={
            "state": "RELEASED",
            "unsigned_txn": unsigned_txn,
            "message": "Contract approved. Payment released to farmer.",
        })
    else:
        # Violated
        await db["trades"].update_one(
            {"_id": ObjectId(trade_id)},
            {"$set": {
                "state": "VIOLATED",
                "state_code": STATES["VIOLATED"],
                "verified_at": now,
                "verified_by": current_user["wallet_address"],
                "verification_result": "violated",
                "updated_at": now,
            }},
        )
        return ApiResponse(success=True, data={
            "state": "VIOLATED",
            "message": "Contract marked as violated. Buyer can withdraw funds.",
        })


@router.post("/{trade_id}/withdraw", response_model=ApiResponse)
async def withdraw_funds(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Buyer withdraws funds from a violated contract."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "VIOLATED":
        raise HTTPException(status_code=400, detail="Trade not in VIOLATED state")
    if trade["buyer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only the buyer can withdraw")

    unsigned_txn = build_refund_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
    )

    await db["trades"].update_one(
        {"_id": ObjectId(trade_id)},
        {"$set": {
            "state": "REFUNDED",
            "state_code": STATES["REFUNDED"],
            "refunded_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    return ApiResponse(success=True, data={
        "state": "REFUNDED",
        "unsigned_txn": unsigned_txn,
        "message": "Funds returned to buyer wallet.",
    })


@router.post("/{trade_id}/dispute", response_model=ApiResponse)
async def raise_dispute(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned raise_dispute transaction."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] not in ("FUNDED", "DELIVERED"):
        raise HTTPException(status_code=400, detail="Cannot dispute in current state")
    if trade["buyer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only buyer can raise dispute")

    unsigned_txn = build_dispute_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
    )

    return ApiResponse(success=True, data={"unsigned_txn": unsigned_txn})


@router.post("/{trade_id}/refund", response_model=ApiResponse)
async def claim_refund(
    trade_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned claim_refund transaction (only after deadline)."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "FUNDED":
        raise HTTPException(status_code=400, detail="Trade not in FUNDED state")
    if trade["buyer_address"] != current_user["wallet_address"]:
        raise HTTPException(status_code=403, detail="Only buyer can claim refund")

    unsigned_txn = build_refund_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
    )

    return ApiResponse(success=True, data={"unsigned_txn": unsigned_txn})


@router.post("/{trade_id}/vote-dispute", response_model=ApiResponse)
async def vote_dispute(
    trade_id: str,
    body: VoteDisputeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Build unsigned vote_dispute transaction."""
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade["state"] != "DISPUTED":
        raise HTTPException(status_code=400, detail="Trade not in DISPUTED state")

    unsigned_txn = build_vote_dispute_txn(
        sender=current_user["wallet_address"],
        app_id=trade["app_id"],
        vote_for_farmer=body.vote_for_farmer,
    )

    return ApiResponse(success=True, data={"unsigned_txn": unsigned_txn})


@router.post("/{trade_id}/submit-txn", response_model=ApiResponse)
async def submit_transaction(
    trade_id: str,
    body: SubmitTxnRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Accept signed transaction bytes from frontend,
    submit to Algorand, wait for confirmation,
    then sync MongoDB state with on-chain state.
    """
    db = get_db()
    trade = await db["trades"].find_one({"_id": ObjectId(trade_id)})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    try:
        result = await submit_signed_txn(body.signed_txn)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Transaction failed: {str(e)}")

    # Sync DB with on-chain state
    if trade.get("app_id") and trade["app_id"] > 0:
        try:
            on_chain = await get_app_state(trade["app_id"])
            if "state" in on_chain:
                chain_state_code = on_chain["state"]
                chain_state = get_state_label(chain_state_code)

                update_data = {
                    "state": chain_state,
                    "state_code": chain_state_code,
                    "updated_at": datetime.now(timezone.utc),
                }

                # If released, update farmer's stats
                if chain_state == "RELEASED":
                    amount_algo = trade["amount_micro_algo"] / 1_000_000
                    await db["users"].update_one(
                        {"wallet_address": trade["farmer_address"]},
                        {
                            "$inc": {
                                "total_earned_algo": amount_algo,
                                "trades_completed": 1,
                            }
                        },
                    )

                await db["trades"].update_one(
                    {"_id": trade["_id"]},
                    {"$set": update_data},
                )
        except Exception:
            pass  # Best-effort sync

    return ApiResponse(
        success=True,
        data={
            "txid": result.get("txid"),
            "confirmed_round": result.get("confirmed_round"),
        },
    )
