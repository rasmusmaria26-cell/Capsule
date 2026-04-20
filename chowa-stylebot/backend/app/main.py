from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import routes_outfit, routes_wardrobe, routes_onboarding, routes_telemetry, routes_auth

app = FastAPI(
    title="Chowa StyleBot API",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────────
app.include_router(routes_auth.router,        prefix="/auth",        tags=["Auth"])
app.include_router(routes_onboarding.router,  prefix="/onboarding",  tags=["Onboarding"])
app.include_router(routes_wardrobe.router,    prefix="/wardrobe",    tags=["Wardrobe"])
app.include_router(routes_outfit.router,      prefix="/outfit",      tags=["Outfit"])
app.include_router(routes_telemetry.router,   prefix="/telemetry",   tags=["Telemetry"])

# ── Local image serving (dev) ───────────────────────────────────────────────────
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads" / "wardrobe"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/wardrobe/images", StaticFiles(directory=str(UPLOADS_DIR)), name="wardrobe_images")


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "chowa-stylebot-backend"}
