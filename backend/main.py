from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from database import connect_db, close_db
from routes import trades, users, auth, verifiers
from config import get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting FastAPI server...")
    await connect_db()
    yield
    # Shutdown
    logger.info("🛑 Shutting down...")
    await close_db()


app = FastAPI(
    title="FarmerPay Backend",
    description="Algorand-based escrow for farmer-buyer trades",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(trades.router)
app.include_router(verifiers.router)


@app.get("/")
def root():
    return {
        "message": "FarmerPay Backend 🌾",
        "api_version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "contract_app_id": settings.CONTRACT_APP_ID}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )