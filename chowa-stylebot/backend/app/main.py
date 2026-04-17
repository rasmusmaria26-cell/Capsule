from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_outfit, routes_wardrobe, routes_onboarding, routes_telemetry

app = FastAPI(
    title="Chowa StyleBot API",
    description="Outfit recommendation engine using OKLCH color harmony (Shikisai Chowa).",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(routes_onboarding.router,  prefix="/onboarding",  tags=["Onboarding"])
app.include_router(routes_wardrobe.router,    prefix="/wardrobe",    tags=["Wardrobe"])
app.include_router(routes_outfit.router,      prefix="/outfit",      tags=["Outfit"])
app.include_router(routes_telemetry.router,   prefix="/telemetry",   tags=["Telemetry"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "chowa-stylebot"}
