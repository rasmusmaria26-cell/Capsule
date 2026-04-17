import os
from dotenv import load_dotenv
# Load example env vars so Pydantic Settings doesn't crash on import
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env.example"))

import pytest
from pprint import pprint
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.deps import get_db, get_current_user_id
from app.ingestion.vision_extractor import VisionExtractionResult, ExtractedColor
from app.ingestion.confidence_gate import GatedResult

# ── Test Database Setup ───────────────────────────────────────────────────────

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user_id():
    # Use the test user ID from seed.sql: test-user-tonal
    return "test-user-tonal"

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_id] = override_get_current_user_id

client = TestClient(app)

# ── Test Setup / Teardown ─────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def setup_database():
    # Create tables compatible with SQLite
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT,
                chowa_profile TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS garments (
                garment_id TEXT PRIMARY KEY,
                user_id TEXT,
                category TEXT,
                sub_category TEXT,
                dominant_hex TEXT,
                secondary_hex TEXT,
                oklch_l REAL,
                oklch_c REAL,
                oklch_h REAL,
                image_url TEXT,
                confidence REAL,
                is_confirmed BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

    # Insert test user
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO users (user_id, email, chowa_profile) 
            VALUES ('test-user-tonal', 'tonal@test.com', 'tonal_minimalist')
        """))
        conn.commit()
        
    yield
    
    # Drop tables after test
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS outfit_telemetry_logs;"))
        conn.execute(text("DROP TABLE IF EXISTS outfits;"))
        conn.execute(text("DROP TABLE IF EXISTS garments;"))
        conn.execute(text("DROP TABLE IF EXISTS users;"))
        conn.commit()


# ── Mocks ─────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_pipeline():
    with patch("app.api.routes_wardrobe.remove_background_async") as mock_bg, \
         patch("app.api.routes_wardrobe.upload_image") as mock_upload, \
         patch("app.api.routes_wardrobe.extract_garment_tags") as mock_vision, \
         patch("app.api.routes_wardrobe.evaluate_confidence") as mock_gate:
         
        # Setup mock returns
        mock_bg.return_value = b"processed_image_bytes"
        mock_upload.return_value = "https://mock.storage.com/image.png"
        
        mock_vision.return_value = VisionExtractionResult(
            category="Outerwear",
            sub_category="Denim Jacket",
            confidence=0.95,
            dominant_color=ExtractedColor(hex_code="#4A75A3", score=0.8, pixel_fraction=0.7),
            secondary_color=ExtractedColor(hex_code="#FFFFFF", score=0.1, pixel_fraction=0.1),
            all_labels=["jacket", "denim", "blue"]
        )
        
        mock_gate.return_value = GatedResult(
            is_confirmed=True,
            requires_manual_check=False,
            reason=None
        )
        
        yield {
            "bg": mock_bg,
            "upload": mock_upload,
            "vision": mock_vision,
            "gate": mock_gate
        }


# ── Tests ─────────────────────────────────────────────────────────────────────

from sqlalchemy import text # need to import text for raw SQL

def test_upload_wardrobe_item_success(mock_pipeline):
    """
    Test uploading a valid image. The endpoint should orchestrate:
    bg_removal -> upload + vision -> confidence_gate -> OKLCH conv -> DB persist.
    """
    
    response = client.post(
        "/wardrobe/upload",
        files={"file": ("test_jacket.jpg", b"fake_image_bytes", "image/jpeg")}
    )
    
    assert response.status_code == 201
    data = response.json()
    
    assert data["category"] == "Outerwear"
    assert data["sub_category"] == "Denim Jacket"
    assert data["dominant_color"] == "#4A75A3"
    assert data["secondary_color"] == "#FFFFFF"
    assert data["image_url"] == "https://mock.storage.com/image.png"
    assert data["needs_manual_review"] is False
    assert "garment_id" in data
    
    # Verify DB persistence
    with override_get_db().__next__() as db:
        res = db.execute(text("SELECT * FROM garments WHERE garment_id = :id"), {"id": data["garment_id"]}).mappings().first()
        
        assert res is not None
        assert res["user_id"] == "test-user-tonal"
        assert res["category"] == "Outerwear"
        # Verify OKLCH was explicitly calculated and stored
        assert isinstance(res["oklch_l"], float)
        assert isinstance(res["oklch_c"], float)
        assert isinstance(res["oklch_h"], float)
        assert bool(res["is_confirmed"]) is True


def test_upload_wardrobe_item_low_confidence(mock_pipeline):
    """
    Test uploading an image that falls below the 85% confidence threshold limit.
    """
    # Adjust mock to simulate low confidence
    mock_pipeline["gate"].return_value = GatedResult(
        is_confirmed=False,
        requires_manual_check=True,
        reason="Category classification confidence (80%) below 85% threshold."
    )
    
    response = client.post(
        "/wardrobe/upload",
        files={"file": ("test_fuzzy_item.jpg", b"fake_image_bytes", "image/jpeg")}
    )
    
    assert response.status_code == 201
    data = response.json()
    
    # The flag should be exposed to the UI so it can trigger the Confirm Modal
    assert data["needs_manual_review"] is True
    assert data["review_reason"] == "Category classification confidence (80%) below 85% threshold."
    
    # Verify DB persistence — is_confirmed should be False
    with override_get_db().__next__() as db:
        res = db.execute(text("SELECT is_confirmed FROM garments WHERE garment_id = :id"), {"id": data["garment_id"]}).mappings().first()
        assert bool(res["is_confirmed"]) is False


def test_upload_rejects_non_images():
    response = client.post(
        "/wardrobe/upload",
        # Use application/pdf content type
        files={"file": ("document.pdf", b"fake_pdf_bytes", "application/pdf")}
    )
    assert response.status_code == 400
    assert "image" in response.json()["detail"].lower()
