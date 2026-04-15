"""
algosdk wrapper — all blockchain logic.
Builds unsigned transactions for the frontend to sign via Pera Wallet.
Never holds private keys.
"""

import base64
from algosdk.v2client import algod, indexer
from algosdk import transaction, encoding
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
)
from config import get_settings

# State labels matching contract uint64 codes
STATE_LABELS = {
    0: "CREATED",
    1: "FUNDED",
    2: "DELIVERED",
    3: "RELEASED",
    4: "DISPUTED",
    5: "EXPIRED",
    6: "CANCELLED",
}


def get_algod_client() -> algod.AlgodClient:
    settings = get_settings()
    return algod.AlgodClient("", settings.ALGORAND_NODE)


def get_indexer_client() -> indexer.IndexerClient:
    settings = get_settings()
    return indexer.IndexerClient("", settings.ALGORAND_INDEXER)


def build_fund_txn(sender: str, app_id: int, amount_micro_algo: int) -> str:
    """
    Build an atomic group: Payment to app address + app call fund_escrow().
    Returns base64-encoded unsigned transaction bytes.
    """
    client = get_algod_client()
    sp = client.suggested_params()

    # Get the application address
    app_address = encoding.encode_address(
        encoding.checksum(b"appID" + app_id.to_bytes(8, "big"))
    )

    # Payment to application
    pay_txn = transaction.PaymentTxn(
        sender=sender,
        sp=sp,
        receiver=app_address,
        amt=amount_micro_algo,
    )

    # App call — fund_escrow()
    app_call_txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[b"fund_escrow"],
    )

    # Group them
    gid = transaction.calculate_group_id([pay_txn, app_call_txn])
    pay_txn.group = gid
    app_call_txn.group = gid

    # Return both as base64
    return {
        "payment_txn": base64.b64encode(
            encoding.msgpack_encode(pay_txn)
        ).decode(),
        "app_call_txn": base64.b64encode(
            encoding.msgpack_encode(app_call_txn)
        ).decode(),
    }


def build_app_call_txn(sender: str, app_id: int, method: str, app_args: list = None) -> str:
    """
    Build a single unsigned app call transaction.
    Returns base64-encoded unsigned transaction bytes.
    """
    client = get_algod_client()
    sp = client.suggested_params()

    args = [method.encode()] if isinstance(method, str) else [method]
    if app_args:
        for arg in app_args:
            if isinstance(arg, str):
                args.append(arg.encode())
            elif isinstance(arg, int):
                args.append(arg.to_bytes(8, "big"))
            else:
                args.append(arg)

    txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=args,
    )

    return base64.b64encode(encoding.msgpack_encode(txn)).decode()


def build_confirm_txn(sender: str, app_id: int) -> str:
    """Build unsigned confirm_delivery app call."""
    return build_app_call_txn(sender, app_id, "confirm_delivery")


def build_dispute_txn(sender: str, app_id: int) -> str:
    """Build unsigned raise_dispute app call."""
    return build_app_call_txn(sender, app_id, "raise_dispute")


def build_refund_txn(sender: str, app_id: int) -> str:
    """Build unsigned claim_refund app call."""
    return build_app_call_txn(sender, app_id, "claim_refund")


def build_vote_dispute_txn(sender: str, app_id: int, vote_for_farmer: bool) -> str:
    """Build unsigned vote_dispute app call."""
    return build_app_call_txn(
        sender, app_id, "vote_dispute", [1 if vote_for_farmer else 0]
    )


def build_mark_delivered_txn(sender: str, app_id: int) -> str:
    """Build unsigned mark_delivered app call."""
    return build_app_call_txn(sender, app_id, "mark_delivered")


def build_create_trade_txn(
    sender: str,
    app_id: int,
    trade_id: str,
    farmer_address: str,
    verifier_address: str,
    amount: int,
    deadline: int,
) -> str:
    """
    Build unsigned create_trade app call transaction.
    Args:
        sender: Buyer address
        app_id: Contract app ID
        trade_id: Unique trade identifier
        farmer_address: Farmer's Algorand address
        verifier_address: Verifier's Algorand address
        amount: Amount in micro Algo
        deadline: Unix timestamp (seconds)
    Returns base64-encoded unsigned transaction bytes.
    """
    client = get_algod_client()
    sp = client.suggested_params()

    # Build app args: method, trade_id, farmer, verifier, amount, deadline
    app_args = [
        b"create_trade",
        trade_id.encode(),
        encoding.decode_address(farmer_address),
        encoding.decode_address(verifier_address),
        amount.to_bytes(8, "big"),
        deadline.to_bytes(8, "big"),
    ]

    txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=sp,
        index=app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=app_args,
    )

    return base64.b64encode(encoding.msgpack_encode(txn)).decode()


async def submit_signed_txn(signed_txn_b64: str) -> dict:
    """
    Submit a signed transaction to Algorand.
    Returns transaction ID and confirmation.
    """
    client = get_algod_client()
    signed_bytes = base64.b64decode(signed_txn_b64)
    txid = client.send_raw_transaction(signed_bytes)
    result = transaction.wait_for_confirmation(client, txid, 4)
    return {"txid": txid, "confirmed_round": result.get("confirmed-round")}


async def submit_signed_group(signed_txns_b64: list[str]) -> dict:
    """Submit a group of signed transactions."""
    client = get_algod_client()
    signed_bytes_list = [base64.b64decode(t) for t in signed_txns_b64]
    txid = client.send_transactions(signed_bytes_list)
    result = transaction.wait_for_confirmation(client, txid, 4)
    return {"txid": txid, "confirmed_round": result.get("confirmed-round")}


async def get_app_state(app_id: int) -> dict:
    """Read global state of the contract application."""
    client = get_algod_client()
    try:
        app_info = client.application_info(app_id)
        global_state = app_info.get("params", {}).get("global-state", [])
        decoded = {}
        for item in global_state:
            key = base64.b64decode(item["key"]).decode("utf-8", errors="replace")
            value = item["value"]
            if value["type"] == 1:  # bytes
                decoded[key] = base64.b64decode(value.get("bytes", "")).decode(
                    "utf-8", errors="replace"
                )
            else:  # uint
                decoded[key] = value.get("uint", 0)
        return decoded
    except Exception:
        return {}


def get_state_label(state_code: int) -> str:
    """Convert numeric state code to label."""
    return STATE_LABELS.get(state_code, "UNKNOWN")
