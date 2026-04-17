CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    user_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    hashed_password TEXT,
    chowa_profile   TEXT        NOT NULL DEFAULT 'neutral_anchored'
                                CHECK (chowa_profile IN (
                                    'tonal_minimalist',
                                    'high_contrast',
                                    'neutral_anchored'
                                )),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
