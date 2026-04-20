from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt

from app.config import settings

router = APIRouter()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

@router.post("/token", status_code=status.HTTP_200_OK)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Phase 5: JWT Auth Endpoint
    Validates user credentials and issues a signed JWT Token.
    For this MVP, any username/password works, and the username becomes the user_id.
    """
    if not form_data.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Phase 5: Map dev username to valid Seed UUID to avoid Postgres cast errors
    subject_uid = form_data.username
    if subject_uid == "chowa-test-user-001":
        subject_uid = "a1b2c3d4-0000-0000-0000-000000000001"

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": subject_uid}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}
