from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
import json

from app.deps import get_db, get_current_user_id


router = APIRouter()


class TelemetryLogRequest(BaseModel):
    outfit_id: str
    action: str  # "worn", "rejected", "favorited"
    feedback_notes: str | None = None


@router.post("/log", status_code=status.HTTP_201_CREATED)
def log_telemetry(
    req: TelemetryLogRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Phase 3: Telemetry Feedback
    Logs user interaction (wear/reject) with a generated outfit.
    This data fuels Phase 5 (Algorithmic Tuning).
    """

    # Ensure the outfit exists and belongs to the user
    outfit = db.execute(
        text("SELECT * FROM outfits WHERE outfit_id = :oid AND user_id = :uid"),
        {"oid": req.outfit_id, "uid": user_id}
    ).mappings().first()

    if not outfit:
        raise HTTPException(
            status_code=404, 
            detail="Outfit not found or does not belong to user."
        )

    # Map ui actions to strict DB ENUM string constraints
    db_event_type = 'ACCEPTED' if req.action in ['worn', 'favorited'] else 'REROLLED'

    # Reconstruct JSONB payloads from the outfit record
    outfit_seed = json.dumps({
        "top_id": str(outfit["top_id"]),
        "bottom_id": str(outfit["bottom_id"]),
        "shoes_id": str(outfit["shoes_id"])
    })
    
    chowa_scores_snapshot = json.dumps({
        "s_raw": outfit["s_raw"],
        "clash_modifier": outfit["clash_modifier"],
        "profile_multiplier": outfit["profile_multiplier"],
        "final_score": outfit["final_score"],
        "d_tb": outfit["d_tb"],
        "d_bs": outfit["d_bs"],
        "d_ts": outfit["d_ts"],
        "ui_notes": req.feedback_notes or ""
    })

    log_id = str(uuid.uuid4())
    
    db.execute(text("""
        INSERT INTO outfit_telemetry_logs (
            log_id, user_id, event_type, outfit_seed, chowa_scores_snapshot
        ) VALUES (
            :lid, :uid, :evt, :seed, :snapshot
        )
    """), {
        "lid": log_id,
        "uid": user_id,
        "evt": db_event_type,
        "seed": outfit_seed,
        "snapshot": chowa_scores_snapshot
    })
    
    db.commit()

    return {"status": "success", "log_id": log_id}
