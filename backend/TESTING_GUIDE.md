# FarmerPay Backend Testing Guide 🧪

## Step 1: Start the Backend

```bash
cd backend
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:4000
✅ MongoDB connected
```

---

## Step 2: Health Check (Basic Connectivity)

```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "healthy",
  "contract_app_id": 757797076
}
```

---

## Step 3: Test API Endpoints

### 3a. Create a Trade

```bash
curl -X POST http://localhost:4000/api/trades \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "farmer_address": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY",
    "verifier_address": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBY2XFGQ",
    "crop_type": "rice",
    "quantity_kg": 100,
    "price_per_kg": 50.0,
    "delivery_deadline": 1704067200
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "some_mongo_id",
    "buyer_address": "YOUR_WALLET",
    "farmer_address": "FARMER_WALLET",
    "verifier_address": "VERIFIER_WALLET",
    "crop_type": "rice",
    "quantity_kg": 100,
    "price_per_kg": 50.0,
    "amount_micro_algo": 5000000000,
    "delivery_deadline": 1704067200,
    "state": "CREATED",
    "state_code": 0,
    "app_id": 757797076,
    "created_at": "2026-03-27T...",
    "updated_at": "2026-03-27T..."
  }
}
```

### 3b. Build Create Trade Transaction

```bash
curl -X POST http://localhost:4000/api/trades/{trade_id}/build-create-txn \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "unsigned_txn": "base64_encoded_transaction_bytes",
    "trade_id": "{trade_id}"
  }
}
```

### 3c. Get Trade Details

```bash
curl http://localhost:4000/api/trades/{trade_id}
```

Response shows full trade with on-chain state sync if available.

### 3d. List Trades

```bash
curl "http://localhost:4000/api/trades?status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Step 4: Verify Blockchain Connection

### 4a. Check Algorand Testnet Access

```bash
curl https://testnet-api.algonode.cloud/health
```

Response should show:
```json
{"round": 12345678, "lastRound": 12345678}
```

### 4b. Verify Contract App Exists on Chain

```bash
curl https://testnet-api.algonode.cloud/v2/applications/757797076
```

Response should show your contract's global state.

### 4c. Test Transaction Submission (Dummy)

Backend can submit pre-signed transactions. You'll do this from frontend:
1. Get unsigned txn from backend
2. Sign with Pera Wallet in frontend
3. Submit back to `/submit-txn` endpoint

---

## Step 5: Database Verification

### 5a. Check MongoDB Connection

Backend logs should show:
```
✅ MongoDB connected
```

### 5b. Query Trades Collection

```bash
# In MongoDB Compass or mongo shell
db.farmerpay.trades.find()
```

Should show trades you created via API.

### 5c. Check Users Collection

```bash
db.farmerpay.users.find()
```

Should show user profiles after authentication.

---

## Step 6: Transaction Flow Test (Manual)

### Flow: Create → Accept → Fund → Deliver → Confirm

```
1. POST /api/trades                     → Create trade (DB only)
2. POST /api/trades/{id}/build-create-txn → Get unsigned txn for buyer
3. [Frontend]: Sign with Pera Wallet
4. POST /api/trades/{id}/submit-txn     → Submit signed txn
   ├─ Verifies signature
   ├─ Submits to Algorand testnet
   └─ Syncs state back to MongoDB

5. POST /api/trades/{id}/accept         → Farmer accepts
6. POST /api/trades/{id}/fund           → Get fund transaction
7. [Frontend]: Sign + submit fund txn
8. POST /api/trades/{id}/deliver        → Mark delivered
9. POST /api/trades/{id}/confirm        → Get confirm txn
10. [Frontend]: Verifier signs + submits
    → Payment sent to farmer on-chain ✅
```

---

## Step 7: Debugging & Logs

### Check Backend Logs

```
[INFO] POST /api/trades created trade 507f1f77bcf86cd799439011
[INFO] /api/trades/507f1f77bcf86cd799439011/submit-txn: tx confirmed in round 38594820
[DEBUG] On-chain state synced: state=RELEASED
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `MongoDB not connected` | Check `MONGO_URI` in `.env` and ensure MongoDB is running |
| `CONTRACT_APP_ID not found` | Verify APP_ID=757797076 is correct and deployed on testnet |
| `Transaction failed: account not found` | Ensure wallet addresses exist on testnet |
| `CORS error from frontend` | Check `FRONTEND_URL` in `.env` matches your frontend origin |
| `JWT token invalid` | Generate new token or check `JWT_SECRET` |

---

## Step 8: Full Integration Test Script

Create `test_flow.py`:

```python
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:4000"
BUYER_WALLET = "YOUR_BUYER_ADDRESS"
FARMER_WALLET = "YOUR_FARMER_ADDRESS"
VERIFIER_WALLET = "YOUR_VERIFIER_ADDRESS"

# 1. Create trade
resp = requests.post(f"{BASE_URL}/api/trades", json={
    "farmer_address": FARMER_WALLET,
    "verifier_address": VERIFIER_WALLET,
    "crop_type": "rice",
    "quantity_kg": 100,
    "price_per_kg": 50.0,
    "delivery_deadline": int((datetime.now() + timedelta(days=30)).timestamp()),
})

trade = resp.json()["data"]
trade_id = trade["_id"]
print(f"✅ Created trade: {trade_id}")

# 2. Get status
resp = requests.get(f"{BASE_URL}/api/trades/{trade_id}/status")
status = resp.json()["data"]
print(f"✅ Trade status: {status['state']}")

# 3. Build transaction
resp = requests.post(f"{BASE_URL}/api/trades/{trade_id}/build-create-txn")
unsigned_txn = resp.json()["data"]["unsigned_txn"]
print(f"✅ Got unsigned transaction: {unsigned_txn[:50]}...")

print("\n🎉 Basic flow works! Now connect frontend to sign & submit transactions.")
```

Run:
```bash
python test_flow.py
```

---

## Step 9: Frontend Integration Readiness Checklist

- [ ] Backend running on port 4000
- [ ] Health check returns correct APP_ID
- [ ] Can create trade and get MongoDB ID
- [ ] Can build unsigned transactions
- [ ] CORS allows frontend origin
- [ ] JWT authentication ready (currently bypass-able for testing)
- [ ] Contract works on testnet (verify with explorer: https://testnet.explorer.perawallet.app)

---

## Step 10: Production Checklist

- [ ] Use environment-specific configs (testnet vs mainnet)
- [ ] Enable JWT authentication with real tokens
- [ ] Setup Pinata IPFS keys for proof photos
- [ ] Monitor transaction failures and retry logic
- [ ] Setup error tracking (Sentry)
- [ ] Rate limit API endpoints
- [ ] Add request logging middleware
- [ ] Setup database backups
- [ ] Test with real wallet signatures from frontend
