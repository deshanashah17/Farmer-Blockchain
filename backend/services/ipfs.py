"""
IPFS upload via Pinata.
"""

import httpx
from config import get_settings

PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"


async def upload_to_ipfs(file_bytes: bytes, filename: str, trade_id: str) -> str:
    """
    Upload a file to IPFS via Pinata.
    Returns the IPFS CID (content hash).
    """
    settings = get_settings()

    if not settings.PINATA_API_KEY or settings.PINATA_API_KEY == "your_key":
        # Pinata not configured — return a placeholder
        return f"placeholder_cid_{trade_id}"

    headers = {
        "pinata_api_key": settings.PINATA_API_KEY,
        "pinata_secret_api_key": settings.PINATA_SECRET,
    }

    # Pinata metadata
    import json

    pinata_options = json.dumps({"cidVersion": 1})
    pinata_metadata = json.dumps(
        {"name": f"delivery_proof_{trade_id}_{filename}"}
    )

    async with httpx.AsyncClient(timeout=60) as client:
        files = {
            "file": (filename, file_bytes),
        }
        data = {
            "pinataOptions": pinata_options,
            "pinataMetadata": pinata_metadata,
        }
        response = await client.post(
            PINATA_PIN_URL, headers=headers, files=files, data=data
        )
        response.raise_for_status()
        result = response.json()
        return result["IpfsHash"]
