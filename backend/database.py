"""
Async MongoDB connection via Motor.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

_client: AsyncIOMotorClient | None = None


async def connect_db():
    global _client
    settings = get_settings()
    
    try:
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=3000,
            tlsInsecure=True,
            connectTimeoutMS=3000,
            socketTimeoutMS=3000,
        )
        await _client.admin.command("ping")
        print("✅ MongoDB connected")
    except Exception as e:
        print(f"⚠️  MongoDB connection failed: {e}")
        print("   Starting server without database...")
        # Initialize empty client as fallback
        _client = None


async def close_db():
    global _client
    if _client:
        _client.close()
        print("🔌 MongoDB disconnected")


def get_db():
    """Return the farmerpay database instance."""
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _client["farmerpay"]

