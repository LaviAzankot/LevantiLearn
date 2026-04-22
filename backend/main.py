"""
LevantiLearn Backend — FastAPI
Levantine/Palestinian Arabic learning app API
"""

from dotenv import load_dotenv
load_dotenv()   # must be first — loads .env before any module reads os.getenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.lessons  import router as lessons_router
from api.tts      import router as tts_router
from api.stt      import router as stt_router
from api.progress import router as progress_router
from api.vocab    import router as vocab_router
from api.auth     import router as auth_router
from api.payments import router as payments_router
from api.audio    import router as audio_router

app = FastAPI(
    title="LevantiLearn API",
    description="Palestinian/Levantine Arabic learning platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Restrict origins in production — never use "*" when credentials are in play
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:8081")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(lessons_router,  prefix="/api/lessons",  tags=["Lessons"])
app.include_router(tts_router,      prefix="/api/tts",      tags=["Text-to-Speech"])
app.include_router(stt_router,      prefix="/api/stt",      tags=["Speech Recognition"])
app.include_router(progress_router, prefix="/api/progress", tags=["Progress"])
app.include_router(vocab_router,    prefix="/api/vocab",    tags=["Vocabulary"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(audio_router,    prefix="/api/audio",    tags=["Audio"])


@app.get("/")
def root():
    return {"app": "LevantiLearn", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
