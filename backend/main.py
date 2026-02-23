"""
FakeLineage FastAPI Application Entry Point
Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import analysis, provenance, social, reports

app = FastAPI(
    title="FakeLineage API",
    description="Image Provenance Graph Construction for Deepfake-Aware Social Media Forensics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
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
            "docs": "/docs",
            "upload": "POST /api/images/upload",
            "analyze": "POST /api/images/analyze/{image_id}",
            "provenance": "GET /api/provenance/graph/{image_id}",
            "social": "GET /api/social/spread/{image_id}",
            "report": "GET /api/reports/{image_id}",
            "dashboard": "GET /api/reports/dashboard/stats",
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "FakeLineage"}
