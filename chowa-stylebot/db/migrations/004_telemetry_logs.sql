CREATE TABLE IF NOT EXISTS outfit_telemetry_logs (
    log_id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    event_type              TEXT        NOT NULL
                                        CHECK (event_type IN ('ACCEPTED','REROLLED','MANUAL_EDIT')),

    outfit_seed             JSONB       NOT NULL,
    item_swapped_id         UUID,
    chowa_scores_snapshot   JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user ON outfit_telemetry_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event ON outfit_telemetry_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_scores
    ON outfit_telemetry_logs USING GIN (chowa_scores_snapshot);
