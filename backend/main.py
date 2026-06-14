"""
ExamGuard Pro - FastAPI Main Application
==========================================
Entry point. Run with:
  uvicorn main:app --reload --port 8000

API Docs: http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from database import init_db
from routes.auth import router as sessions_router
from routes.alerts import router as alerts_router
from routes.blockchain import router as blockchain_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    print("[OK] ExamGuard Pro backend started.")
    print("[OK] Database initialized.")
    print("[OK] Blockchain loaded.")
    yield
    print("[--] ExamGuard Pro shutting down.")


app = FastAPI(
    title="ExamGuard Pro API",
    description="""
## Remote Exam Proctoring System

Built for rural India with offline-first architecture.

### Features
- 🤖 **AI Detection** – MediaPipe face & pose analysis (frontend)
- ⛓️ **Mock Blockchain** – SHA-256 Merkle Tree immutable audit log
- 📡 **Store & Forward** – Offline caching, auto-sync when connected
- 📊 **Risk Scoring** – Weighted anomaly scoring per session
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
# Allow React dev server on port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(sessions_router)
app.include_router(alerts_router)
app.include_router(blockchain_router)


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "app": "ExamGuard Pro",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "AI face & pose detection (MediaPipe)",
            "Mock Merkle Tree blockchain",
            "Offline Store-and-Forward",
            "Risk scoring engine",
        ],
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
