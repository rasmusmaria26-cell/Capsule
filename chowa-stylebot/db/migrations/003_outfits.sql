CREATE TABLE IF NOT EXISTS outfits (
    outfit_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    top_id             UUID        REFERENCES garments(garment_id),
    bottom_id          UUID        REFERENCES garments(garment_id),
    shoes_id           UUID        REFERENCES garments(garment_id),

    s_raw              FLOAT       NOT NULL,
    clash_modifier     FLOAT       NOT NULL DEFAULT 1.0,
    profile_multiplier FLOAT       NOT NULL DEFAULT 1.0,
    final_score        FLOAT       NOT NULL,
    d_tb               FLOAT       NOT NULL,
    d_bs               FLOAT       NOT NULL,
    d_ts               FLOAT       NOT NULL,

    occasion           TEXT        NOT NULL,
    weather_desc       TEXT,

    generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);
