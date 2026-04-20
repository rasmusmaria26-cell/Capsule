from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Literal
from app.deps import get_db, get_current_user_id

router = APIRouter()

VALID_PROFILES = ("tonal_minimalist", "high_contrast", "neutral_anchored")

class OnboardingProfileIn(BaseModel):
    chowa_profile: Literal["tonal_minimalist", "contrast_bold", "analogous_soft"]
    display_name: str | None = None


@router.post("/profile", status_code=status.HTTP_200_OK)
def save_profile(
    body: OnboardingProfileIn,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """POST /onboarding/profile — persist Chowa profile type chosen during onboarding quiz."""
    # Upsert profile — user row created by auth flow; just update chowa_profile
    result = db.execute(text("""
        UPDATE users SET chowa_profile = :profile, updated_at = NOW()
        WHERE user_id = :uid
        RETURNING user_id, chowa_profile
    """), {"profile": body.chowa_profile, "uid": user_id})
    row = result.mappings().fetchone()
    db.commit()

    if not row:
        # User doesn't exist yet — insert a minimal row
        db.execute(text("""
            INSERT INTO users (user_id, email, chowa_profile)
            VALUES (:uid, :email, :profile)
            ON CONFLICT (user_id) DO UPDATE SET chowa_profile = EXCLUDED.chowa_profile
        """), {"uid": user_id, "email": f"{user_id}@chowa.dev", "profile": body.chowa_profile})
        db.commit()

    return {"user_id": user_id, "chowa_profile": body.chowa_profile}


@router.post("/quiz")
def submit_quiz(db: Session = Depends(get_db)):
    """POST /onboarding/quiz — legacy stub."""
    return {"detail": "Use POST /onboarding/profile instead"}
