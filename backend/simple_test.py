#!/usr/bin/env python3
"""
Minimal connection test - debug what's going wrong
"""

print("🔧 Starting minimal test...\n")

# Test 1: Check imports
print("1️⃣ Checking Python imports...")
try:
    import requests
    print("   ✅ requests OK")
except ImportError as e:
    print(f"   ❌ requests FAILED: {e}")
    exit(1)

try:
    import dotenv
    print("   ✅ python-dotenv OK")
except ImportError as e:
    print(f"   ❌ python-dotenv FAILED: {e}")
    exit(1)

# Test 2: Check backend connection
print("\n2️⃣ Connecting to backend...")
try:
    resp = requests.get("http://localhost:4000/health", timeout=3)
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.json()}")
    print("   ✅ Backend running!")
except requests.exceptions.ConnectionError:
    print("   ❌ Cannot connect to backend")
    print("   Is it running? Try: python main.py")
    exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

print("\n✅ Basic connectivity works!")
