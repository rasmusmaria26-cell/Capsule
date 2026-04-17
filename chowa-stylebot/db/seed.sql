-- ============================================================
-- Chowa StyleBot — Seed Data (development only)
-- ============================================================

-- Test user (password hash for 'testpass123' with bcrypt)
INSERT INTO users (user_id, email, hashed_password, chowa_profile) VALUES
(
    'a1b2c3d4-0000-0000-0000-000000000001',
    'test@chowa.dev',
    '$2b$12$LQv3c1yqBwFQ0K/3I86yT.VqSlHE3Bz/gxRHSYcJJGcFg3P5kVZgi',
    'tonal_minimalist'
),
(
    'a1b2c3d4-0000-0000-0000-000000000002',
    'test2@chowa.dev',
    '$2b$12$LQv3c1yqBwFQ0K/3I86yT.VqSlHE3Bz/gxRHSYcJJGcFg3P5kVZgi',
    'high_contrast'
),
(
    'a1b2c3d4-0000-0000-0000-000000000003',
    'test3@chowa.dev',
    '$2b$12$LQv3c1yqBwFQ0K/3I86yT.VqSlHE3Bz/gxRHSYcJJGcFg3P5kVZgi',
    'neutral_anchored'
)
ON CONFLICT DO NOTHING;

-- Seed garments for test user 1
-- Navy shirt (top) — OKLCH: L=0.26 C=0.06 H=259
INSERT INTO garments (garment_id, user_id, category, sub_category, occasion_tags, season_tags,
    dominant_hex, oklch_l, oklch_c, oklch_h, image_url, confidence, is_confirmed) VALUES
(
    'b1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Top', 'Oxford Shirt', ARRAY['office','casual'], ARRAY['all_season'],
    '#1C2B4A', 0.26, 0.06, 259.0,
    'https://placeholder.chowa.dev/navy_shirt.jpg', 0.95, TRUE
),
-- White shirt (top)
(
    'b1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Top', 'Dress Shirt', ARRAY['office','formal'], ARRAY['all_season'],
    '#F2F2F0', 0.96, 0.01, 95.0,
    'https://placeholder.chowa.dev/white_shirt.jpg', 0.98, TRUE
),
-- Charcoal trousers (bottom)
(
    'b1000000-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Bottom', 'Chino Trousers', ARRAY['office','casual'], ARRAY['all_season'],
    '#3D3D3D', 0.30, 0.01, 0.0,
    'https://placeholder.chowa.dev/charcoal_trousers.jpg', 0.96, TRUE
),
-- Beige trousers (bottom)
(
    'b1000000-0000-0000-0000-000000000004',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Bottom', 'Slim Chino', ARRAY['casual','date_night'], ARRAY['spring','summer'],
    '#C9B99A', 0.76, 0.06, 75.0,
    'https://placeholder.chowa.dev/beige_chino.jpg', 0.92, TRUE
),
-- White sneakers (shoes)
(
    'b1000000-0000-0000-0000-000000000005',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Shoes', 'Sneakers', ARRAY['casual'], ARRAY['all_season'],
    '#EFEFEF', 0.95, 0.01, 0.0,
    'https://placeholder.chowa.dev/white_sneakers.jpg', 0.97, TRUE
),
-- Oxford brogues (shoes)
(
    'b1000000-0000-0000-0000-000000000006',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Shoes', 'Oxford Brogues', ARRAY['office','formal'], ARRAY['all_season'],
    '#5C3D1E', 0.32, 0.09, 47.0,
    'https://placeholder.chowa.dev/brown_brogues.jpg', 0.94, TRUE
)
ON CONFLICT DO NOTHING;
