import os
from dotenv import load_dotenv

# Load example env vars so Pydantic Settings doesn't crash on import
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env.example"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.deps import get_db, get_current_user_id

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
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS outfits (
                outfit_id TEXT PRIMARY KEY,
                user_id TEXT,
                top_id TEXT,
                bottom_id TEXT,
                shoe_id TEXT,
                occasion TEXT,
                weather_context TEXT,
                final_score REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS outfit_telemetry_logs (
                log_id TEXT PRIMARY KEY,
                outfit_id TEXT,
                user_id TEXT,
                algorithm_version TEXT,
                score_snapshot TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        conn.commit()

    # Insert test user and 3 garments
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO users (user_id, email, chowa_profile) 
            VALUES ('test-user-tonal', 'tonal@test.com', 'tonal_minimalist')
        """))
        
        conn.execute(text("""
            INSERT INTO garments (garment_id, user_id, category, sub_category, oklch_l, oklch_c, oklch_h, is_confirmed)
            VALUES 
            ('top-1', 'test-user-tonal', 'Top', 'Shirt', 0.8, 0.05, 120, 1),
            ('bot-1', 'test-user-tonal', 'Bottom', 'Pants', 0.3, 0.05, 120, 1),
            ('sho-1', 'test-user-tonal', 'Shoes', 'Sneaker', 0.1, 0.0, 0, 1)
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


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_generate_outfits_success():
    """
    Test generating outfits from a valid wardrobe.
    """
    response = client.post(
        "/outfit/generate",
        json={"occasion": "casual", "weather": "mild"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["occasion"] == "casual"
    assert data["weather"] == "mild"
    assert data["user_profile"] == "tonal_minimalist"
    assert len(data["generated_outfits"]) == 1
    
    outfit = data["generated_outfits"][0]
    assert outfit["rank"] == 1
    assert "final_score" in outfit
    assert outfit["items"]["top"]["garment_id"] == "top-1"

    # Verify DB persistence for outfits and telemetry
    with override_get_db().__next__() as db:
        # Check outfits table
        outfit_res = db.execute(
            text("SELECT * FROM outfits WHERE outfit_id = :oid"), 
            {"oid": outfit["outfit_id"]}
        ).mappings().first()
        assert outfit_res is not None
        assert outfit_res["top_id"] == "top-1"
        assert outfit_res["occasion"] == "casual"
        
        # Check telemetry logs
        log_res = db.execute(
            text("SELECT * FROM outfit_telemetry_logs WHERE outfit_id = :oid"), 
            {"oid": outfit["outfit_id"]}
        ).mappings().first()
        assert log_res is not None
        assert "v1.0" in log_res["algorithm_version"]


def test_generate_outfits_filtered_out():
    """
    Test generating outfits where the occasion filter removes the shoe, triggering graceful partial degradation.
    """
    # The DB has a 'Sneaker' shoe. The 'work' occasion filter blocks 'sneaker'.
    response = client.post(
        "/outfit/generate",
        json={"occasion": "work", "weather": "mild"}
    )
    
    assert response.status_code == 200
    data = response.json()
    outfit = data["generated_outfits"][0]
    
    assert outfit["is_partial_style"] is True
    assert outfit["items"]["shoes"] is None


def test_generate_outfits_layering():
    """
    Test that outerwear replaces the top visually for math, but both are returned in the payload.
    """
    # Insert an outerwear piece that scores perfectly, and make the top terrible so the layered version wins
    with override_get_db().__next__() as db:
        # Give top-1 an awful score by setting it to a harsh clashing hue vs bottom (bot-1 is h=120)
        db.execute(text("UPDATE garments SET oklch_h = 300, oklch_c = 0.3 WHERE garment_id = 'top-1'"))
        db.execute(text("UPDATE garments SET oklch_h = 120, oklch_c = 0.1 WHERE garment_id = 'bot-1'"))
        db.execute(text("""
            INSERT INTO garments (garment_id, user_id, category, sub_category, oklch_l, oklch_c, oklch_h, is_confirmed)
            VALUES ('out-1', 'test-user-tonal', 'Outerwear', 'Jacket', 0.2, 0.1, 120, 1)
        """))
        db.commit()
        
    response = client.post(
        "/outfit/generate",
        json={"occasion": "casual", "weather": "mild"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    print("\n=== DEBUG: GENERATED OUTFITS ===")
    import pprint
    pprint.pprint(data["generated_outfits"])
    print("================================\n")
    
    outfit = data["generated_outfits"][0]
    
    # Payload should contain both top and outerwear since outerwear won the score
    assert outfit["items"]["top"]["garment_id"] == "top-1"
    assert "outerwear" in outfit["items"], f"Outerwear missing! Keys: {outfit['items'].keys()}"
    assert outfit["items"]["outerwear"]["garment_id"] == "out-1"


def test_generate_outfits_partial_style():
    """
    Test graceful degradation when exactly 1 category is missing.
    """
    # Delete the shoe so the wardrobe is incomplete
    with override_get_db().__next__() as db:
        db.execute(text("DELETE FROM garments WHERE category = 'Shoes'"))
        db.commit()
        
    response = client.post(
        "/outfit/generate",
        json={"occasion": "casual", "weather": "mild"}
    )
    
    assert response.status_code == 200
    data = response.json()
    outfit = data["generated_outfits"][0]
    
    assert outfit["is_partial_style"] is True
    assert outfit["items"]["top"] is not None
    assert outfit["items"]["bottom"] is not None
    assert outfit["items"]["shoes"] is None  # Omitted gracefully

