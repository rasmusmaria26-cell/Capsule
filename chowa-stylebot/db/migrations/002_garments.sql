CREATE TABLE IF NOT EXISTS garments (
    garment_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    category        TEXT        NOT NULL,
    sub_category    TEXT,
    occasion_tags   TEXT[]      NOT NULL DEFAULT '{}',
    season_tags     TEXT[]      NOT NULL DEFAULT '{}',

    dominant_hex    TEXT        NOT NULL,
    secondary_hex   TEXT,
    oklch_l         FLOAT       NOT NULL,
    oklch_c         FLOAT       NOT NULL,
    oklch_h         FLOAT       NOT NULL,

    image_url       TEXT        NOT NULL,
    thumbnail_url   TEXT,
    confidence      FLOAT       NOT NULL DEFAULT 1.0,
    is_confirmed    BOOLEAN     NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garments_user ON garments(user_id);
CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(user_id, category);
