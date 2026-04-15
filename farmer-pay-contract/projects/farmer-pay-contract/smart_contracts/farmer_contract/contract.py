from algopy import ARC4Contract, String, UInt64, Account, Txn, Global, itxn
from algopy.arc4 import abimethod


class FarmerContract(ARC4Contract):

    # ── Global State ──────────────────────────────────────
    trade_id: String
    farmer_address: Account
    buyer_address: Account
    verifier_address: Account
    amount: UInt64
    delivery_deadline: UInt64          # Unix timestamp (seconds)
    state: UInt64                      # 0=CREATED 1=FUNDED 2=DELIVERED 3=RELEASED
                                       # 4=DISPUTED 5=EXPIRED 6=CANCELLED
    dispute_votes_farmer: UInt64
    dispute_votes_buyer: UInt64

    # ── Step 1: Create Trade ──────────────────────────────
    @abimethod()
    def create_trade(
        self,
        trade_id: String,
        farmer: Account,
        verifier: Account,
        amount: UInt64,
        deadline: UInt64,
    ) -> None:
        self.trade_id = trade_id
        self.buyer_address = Txn.sender
        self.farmer_address = farmer
        self.verifier_address = verifier
        self.amount = amount
        self.delivery_deadline = deadline
        self.state = UInt64(0)
        self.dispute_votes_farmer = UInt64(0)
        self.dispute_votes_buyer = UInt64(0)

    # ── Step 2: Fund Escrow ───────────────────────────────
    @abimethod()
    def fund_escrow(self) -> None:
        assert self.state == UInt64(0), "Not in CREATED state"
        assert Txn.sender == self.buyer_address, "Only buyer can fund"
        self.state = UInt64(1)

    # ── Step 3: Mark Delivered ────────────────────────────
    @abimethod()
    def mark_delivered(self) -> None:
        assert Txn.sender == self.farmer_address, "Only farmer can mark"
        assert self.state == UInt64(1), "Not in FUNDED state"
        self.state = UInt64(2)

    # ── Step 4: Confirm Delivery & Release Payment ───────
    @abimethod()
    def confirm_delivery(self) -> None:
        assert Txn.sender == self.verifier_address, "Only verifier can confirm"
        assert self.state == UInt64(2), "Not in DELIVERED state"

        itxn.Payment(
            receiver=self.farmer_address,
            amount=self.amount,
        ).submit()

        self.state = UInt64(3)

    # ── Step 5: Raise Dispute ─────────────────────────────
    @abimethod()
    def raise_dispute(self) -> None:
        assert Txn.sender == self.buyer_address, "Only buyer can dispute"
        assert (self.state == UInt64(1)) or (self.state == UInt64(2)), \
            "Can only dispute when FUNDED or DELIVERED"
        self.state = UInt64(4)
        self.dispute_votes_farmer = UInt64(0)
        self.dispute_votes_buyer = UInt64(0)

    # ── Step 6: Vote on Dispute ───────────────────────────
    @abimethod()
    def vote_dispute(self, vote_for_farmer: UInt64) -> None:
        assert self.state == UInt64(4), "Not in DISPUTED state"
        # In production: check sender is in dispute_validators list
        if vote_for_farmer == UInt64(1):
            self.dispute_votes_farmer += UInt64(1)
        else:
            self.dispute_votes_buyer += UInt64(1)

        # Auto-resolve on majority (2 out of 3)
        if self.dispute_votes_farmer >= UInt64(2):
            itxn.Payment(
                receiver=self.farmer_address,
                amount=self.amount,
            ).submit()
            self.state = UInt64(3)  # RELEASED to farmer

        if self.dispute_votes_buyer >= UInt64(2):
            itxn.Payment(
                receiver=self.buyer_address,
                amount=self.amount,
            ).submit()
            self.state = UInt64(5)  # Resolve to buyer (EXPIRED/refund)

    # ── Step 7: Claim Refund (after deadline) ─────────────
    @abimethod()
    def claim_refund(self) -> None:
        assert self.state == UInt64(1), "Must be FUNDED"
        assert Global.latest_timestamp > self.delivery_deadline, "Deadline not passed"
        assert Txn.sender == self.buyer_address, "Only buyer can refund"

        itxn.Payment(
            receiver=self.buyer_address,
            amount=self.amount,
        ).submit()

        self.state = UInt64(5)

    # ── Step 8: Cancel Trade (unfunded only) ──────────────
    @abimethod()
    def cancel_trade(self) -> None:
        assert self.state == UInt64(0), "Can only cancel CREATED trades"
        assert (Txn.sender == self.buyer_address) or \
               (Txn.sender == self.farmer_address), \
            "Only buyer or farmer can cancel"
        self.state = UInt64(6)

