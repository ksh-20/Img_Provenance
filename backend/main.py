"""
FakeLineage FastAPI Application Entry Point
Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics
"""

import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv
load_dotenv()

# Import DB and create tables before routers
from database import engine        # noqa: E402
from models import db_models       # noqa: E402 (registers all ORM classes)
db_models.Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager
from routers import analysis, provenance, social, reports
from routers.auth import router as auth_router
from services.cleanup import cleanup_task

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start background cleanup task
    bg_cleanup = asyncio.create_task(cleanup_task())
    yield
    # Shutdown: Cancel background cleanup task
    bg_cleanup.cancel()

app = FastAPI(
    title="FakeLineage API",
    description="Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth router
app.include_router(auth_router)

# Core feature routers
app.include_router(analysis.router)
app.include_router(provenance.router)
app.include_router(social.router)
app.include_router(reports.router)

# Serve uploaded images statically
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    return {
        "name": "FakeLineage API",
        "version": "1.0.0",
        "description": "Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics",
        "endpoints": {
            "docs":      "/docs",
            "auth":      "POST /api/auth/register | POST /api/auth/login | GET /api/auth/me",
            "upload":    "POST /api/images/upload",
            "analyze":   "POST /api/images/analyze/{image_id}",
            "provenance":"GET /api/provenance/graph/{image_id}",
            "social":    "GET /api/social/spread/{image_id}",
            "report":    "GET /api/reports/{image_id}",
            "dashboard": "GET /api/reports/dashboard/stats",
        }
    }


@app.get("/health")
async def health():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "healthy", "service": "FakeLineage", "database": db_status}
