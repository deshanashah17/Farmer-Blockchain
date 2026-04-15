"""
Pydantic Settings — reads all values from .env automatically.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"

    # Algorand TestNet
    ALGORAND_NODE: str = "https://testnet-api.algonode.cloud"
    ALGORAND_INDEXER: str = "https://testnet-idx.algonode.cloud"

    # Deployed contract App ID
    CONTRACT_APP_ID: int = 757797076

    # Pinata IPFS
    PINATA_API_KEY: str = ""
    PINATA_SECRET: str = ""

    # JWT
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24

    # Server
    PORT: int = 4000

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
