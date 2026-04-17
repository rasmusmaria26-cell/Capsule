from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.deps import get_db

router = APIRouter()


@router.post("/quiz")
def submit_quiz(db: Session = Depends(get_db)):
    """POST /onboarding/quiz — save Chowa profile from quiz answers."""
    return {"detail": "Phase 4 — not yet implemented"}
