-- ============================================================
-- Chowa StyleBot — Full Database Schema
-- PostgreSQL 15
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── 1. users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    hashed_password TEXT,                        -- null if using OAuth
    chowa_profile   TEXT        NOT NULL DEFAULT 'neutral_anchored'
                                CHECK (chowa_profile IN (
                                    'tonal_minimalist',
                                    'high_contrast',
                                    'neutral_anchored'
                                )),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. garments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garments (
    garment_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Classification
    category        TEXT        NOT NULL,        -- Top / Bottom / Shoes / Outerwear / Accessory
    sub_category    TEXT,                         -- e.g. "Oxford Shirt", "Chino Trousers"
    occasion_tags   TEXT[]      NOT NULL DEFAULT '{}',  -- ["casual","office","date_night"]
    season_tags     TEXT[]      NOT NULL DEFAULT '{}',  -- ["spring","summer","all_season"]

    -- Color (raw hex + OKLCH decomposed for engine)
    dominant_hex    TEXT        NOT NULL,         -- e.g. "#1A2B3C"
    secondary_hex   TEXT,
    oklch_l         FLOAT       NOT NULL,         -- Lightness  0–1
    oklch_c         FLOAT       NOT NULL,         -- Chroma     0–0.4 approx
    oklch_h         FLOAT       NOT NULL,         -- Hue        0–360

    -- Image
    image_url       TEXT        NOT NULL,         -- public S3/GCS URL
    thumbnail_url   TEXT,
    confidence      FLOAT       NOT NULL DEFAULT 1.0,  -- Vision API confidence
    is_confirmed    BOOLEAN     NOT NULL DEFAULT FALSE, -- human-confirmed tag

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(user_id, category);

-- ── 3. outfits ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outfits (
    outfit_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Garment composition
    top_id          UUID        REFERENCES garments(garment_id),
    bottom_id       UUID        REFERENCES garments(garment_id),
    shoes_id        UUID        REFERENCES garments(garment_id),

    -- Scoring snapshot
    s_raw           FLOAT       NOT NULL,
    clash_modifier  FLOAT       NOT NULL DEFAULT 1.0,
    profile_multiplier FLOAT    NOT NULL DEFAULT 1.0,
    final_score     FLOAT       NOT NULL,
    d_tb            FLOAT       NOT NULL,         -- top↔bottom distance
    d_bs            FLOAT       NOT NULL,         -- bottom↔shoes distance
    d_ts            FLOAT       NOT NULL,         -- top↔shoes distance

    -- Context
    occasion        TEXT        NOT NULL,
    weather_desc    TEXT,                          -- e.g. "cold", "warm", "rainy"

    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);

-- ── 4. outfit_telemetry_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outfit_telemetry_logs (
    log_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    event_type          TEXT        NOT NULL
                                    CHECK (event_type IN ('ACCEPTED','REROLLED','MANUAL_EDIT')),

    -- Outfit seed snapshot (IDs at generation time)
    outfit_seed         JSONB       NOT NULL,     -- {top_id, bottom_id, shoes_id}

    -- Only populated for MANUAL_EDIT
    item_swapped_id     UUID,

    -- Full score snapshot for algorithm tuning
    chowa_scores_snapshot JSONB    NOT NULL
        -- {s_raw, clash_modifier, profile_multiplier, final_score, d_tb, d_bs, d_ts}
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user ON outfit_telemetry_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event ON outfit_telemetry_logs(event_type);
-- Index for the 0.75× monitor query (clash + profile boost)
CREATE INDEX IF NOT EXISTS idx_telemetry_scores
    ON outfit_telemetry_logs USING GIN (chowa_scores_snapshot);
