#!/usr/bin/env python3
"""
Quick integration test script.
Run: python verify_integration.py
"""

import requests
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:4000"

def test_health():
    """Test 1: Basic health check"""
    print("\n🔍 Test 1: Health Check")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            app_id = data.get("contract_app_id")
            print(f"  ✅ Backend is running")
            print(f"  ✅ Contract APP_ID: {app_id}")
            return app_id == 757797076
        else:
            print(f"  ❌ Unexpected status: {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Cannot connect to backend: {e}")
        print(f"     Make sure backend is running: python main.py")
        return False


def test_create_trade():
    """Test 2: Create a trade"""
    print("\n🔍 Test 2: Create Trade")
    try:
        payload = {
            "farmer_address": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY",
            "verifier_address": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBY2XFGQ",
            "crop_type": "rice",
            "quantity_kg": 100,
            "price_per_kg": 50.0,
            "delivery_deadline": int((datetime.now() + timedelta(days=30)).timestamp()),
        }
        
        # For now, bypass auth - in production use proper JWT
        headers = {"Content-Type": "application/json"}
        
        resp = requests.post(
            f"{BASE_URL}/api/trades",
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                trade = data["data"]
                trade_id = trade["_id"]
                print(f"  ✅ Trade created successfully")
                print(f"     Trade ID: {trade_id}")
                print(f"     State: {trade['state']}")
                print(f"     Amount: {trade['amount_micro_algo']} µALGO")
                return trade_id
            else:
                print(f"  ❌ API returned success=false")
                print(f"     Response: {data}")
                return None
        else:
            print(f"  ❌ Status {resp.status_code}: {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"  ❌ Error creating trade: {e}")
        return None


def test_build_transaction(trade_id):
    """Test 3: Build unsigned transaction"""
    print("\n🔍 Test 3: Build Transaction")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/trades/{trade_id}/build-create-txn",
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                txn_bytes = data["data"]["unsigned_txn"]
                print(f"  ✅ Unsigned transaction built")
                print(f"     Txn (first 50 chars): {txn_bytes[:50]}...")
                print(f"     Full length: {len(txn_bytes)} characters (base64)")
                return True
            else:
                print(f"  ❌ API returned success=false: {data}")
                return False
        else:
            print(f"  ❌ Status {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"  ❌ Error building transaction: {e}")
        return False


def test_get_trade(trade_id):
    """Test 4: Retrieve trade details"""
    print("\n🔍 Test 4: Get Trade Details")
    try:
        resp = requests.get(
            f"{BASE_URL}/api/trades/{trade_id}",
            timeout=10
        )
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                trade = data["data"]
                print(f"  ✅ Trade retrieved successfully")
                print(f"     Crop: {trade['crop_type']}")
                print(f"     Quantity: {trade['quantity_kg']} kg")
                print(f"     Price: {trade['price_per_kg']} per kg")
                print(f"     Total: {trade['amount_micro_algo'] / 1e6} ALGO")
                return True
            else:
                print(f"  ❌ API returned success=false: {data}")
                return False
        else:
            print(f"  ❌ Status {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"  ❌ Error retrieving trade: {e}")
        return False


def test_algorand_connection():
    """Test 5: Verify Algorand testnet connectivity"""
    print("\n🔍 Test 5: Algorand Testnet Connection")
    try:
        resp = requests.get(
            "https://testnet-api.algonode.cloud/health",
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"  ✅ Connected to Algorand testnet")
            print(f"     Round: {data.get('round')}")
            return True
        else:
            print(f"  ❌ Testnet health check failed: {resp.status_code}")
            return False
    except Exception as e:
        print(f"  ⚠️  Cannot reach testnet (may be network issue): {e}")
        return False


def main():
    print("=" * 60)
    print("  FarmerPay Backend Integration Tests")
    print("=" * 60)
    
    results = []
    
    # Test 1: Health check
    health_ok = test_health()
    results.append(("Health Check", health_ok))
    if not health_ok:
        print("\n❌ Backend not running. Start with: python main.py")
        return False
    
    # Test 2: Create trade
    trade_id = test_create_trade()
    results.append(("Create Trade", trade_id is not None))
    if not trade_id:
        print("\n⚠️  Could not create trade (DB connection issue?)")
        return False
    
    # Test 3: Build transaction
    build_ok = test_build_transaction(trade_id)
    results.append(("Build Transaction", build_ok))
    
    # Test 4: Get trade
    get_ok = test_get_trade(trade_id)
    results.append(("Get Trade", get_ok))
    
    # Test 5: Algorand connection
    algo_ok = test_algorand_connection()
    results.append(("Algorand Connection", algo_ok))
    
    # Summary
    print("\n" + "=" * 60)
    print("  Test Results")
    print("=" * 60)
    passed = sum(1 for _, ok in results if ok)
    total = len(results)
    
    for test_name, ok in results:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"{test_name:<30} {status}")
    
    print("=" * 60)
    print(f"Total: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("\n🎉 All tests passed! Your backend is integrated successfully!")
        print("\n📝 Next steps:")
        print("   1. Connect your React frontend to the backend")
        print("   2. Implement wallet connection (Pera Wallet)")
        print("   3. Sign unsigned transactions from frontend")
        print("   4. Submit signed transactions via /submit-txn")
        print("   5. implement real JWT authentication")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the logs above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
