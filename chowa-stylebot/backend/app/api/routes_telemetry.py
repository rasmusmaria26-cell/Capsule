from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid

from app.deps import get_db, get_current_user_id


router = APIRouter()


class TelemetryLogRequest(BaseModel):
    outfit_id: str
    action: str  # "worn", "rejected", "favorited"
    feedback_notes: str = None


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

    # Insert into outfit_telemetry_logs
    # Note: the generative snapshot is created during generation, 
    # but we can append another log row for the user's explicit action.
    log_id = str(uuid.uuid4())
    
    db.execute(text("""
        INSERT INTO outfit_telemetry_logs (
            log_id, outfit_id, user_id, algorithm_version, score_snapshot
        ) VALUES (
            :lid, :oid, :uid, 'v1.0_feedback', :snapshot
        )
    """), {
        "lid": log_id,
        "oid": req.outfit_id,
        "uid": user_id,
        # In a real app we'd augment the existing snapshot, but for MVP
        # we log the action and notes in the JSONB column.
        "snapshot": f'{{"action": "{req.action}", "notes": "{req.feedback_notes or ""}"}}'
    })
    
    db.commit()

    return {"status": "success", "log_id": log_id}
