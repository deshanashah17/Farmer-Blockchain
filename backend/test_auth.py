#!/usr/bin/env python3
"""Quick test of authentication flow."""

import requests
import json

BASE_URL = "http://localhost:4000"

# Test 1: Check if server is responding
print("Test 1: Ping test...")
try:
    r = requests.get(f"{BASE_URL}/api/trades/test/ping", timeout=5)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.json()}")
except Exception as e:
    print(f"  ❌ Error: {e}")

# Test 2: Try to verify wallet (authenticate)
print("\nTest 2: Verify wallet...")
try:
    payload = {
        "wallet_address": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HVY",
        "role": "buyer"
    }
    r = requests.post(f"{BASE_URL}/api/auth/verify-wallet", json=payload, timeout=5)
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.json()}")
    if r.status_code == 200:
        token = r.json().get("data", {}).get("access_token")
        print(f"  ✅ Got token: {token[:50]}...")
except Exception as e:
    print(f"  ❌ Error: {e}")

print("\n✅ Auth tests complete!")
