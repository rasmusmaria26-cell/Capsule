"""
Tests for the Chowa Ranker — covers all 4 modifier matrix states from PRD Appendix E.

Modifier matrix:
  State 1: clash=1.0, profile=1.0  →  1.0×  neutral
  State 2: clash=0.5, profile=1.0  →  0.5×  penalised clash
  State 3: clash=1.0, profile=1.5  →  1.5×  profile-boosted
  State 4: clash=0.5, profile=1.5  →  0.75× ⚠ clash + boost (monitor)
"""

import pytest
from app.engine.scoring import GarmentColor, score_outfit, is_clash, is_complementary
from app.engine.profile_multipliers import apply_profile_multiplier


# ── Helper: build GarmentColor from OKLCH values ──────────────────────────────

def color(l: float, c: float, h: float) -> GarmentColor:
    return GarmentColor(l=l, c=c, h=h)


# ── Fixture garments ──────────────────────────────────────────────────────────

# Tonal set — ΔL=0.01 between each pair → D ≈ 0.01 < 0.05 (tonal match ✓)
NAVY_SHIRT   = color(l=0.25, c=0.06, h=259.0)
NAVY_TROUSER = color(l=0.26, c=0.06, h=259.0)
NAVY_SHOE    = color(l=0.24, c=0.06, h=259.0)

# Clean neutral set — moderate distances, no clash, no profile boost
WHITE_SHIRT      = color(l=0.95, c=0.005, h=90.0)
CHARCOAL_TROUSER = color(l=0.70, c=0.005, h=90.0)   # ΔL=0.25 → D=0.25 > 0.15 (no clash)
BROWN_SHOE       = color(l=0.45, c=0.005, h=90.0)   # ΔL=0.25 from trouser → D=0.25

# Clash set — ΔL=0.08 per pair → D ≈ 0.08, in clash zone (0.05 < D < 0.15)
CLASH_TOP    = color(l=0.50, c=0.06, h=180.0)
CLASH_BOTTOM = color(l=0.58, c=0.06, h=180.0)  # ΔL=0.08 → D≈0.08 ✓
CLASH_SHOE   = color(l=0.66, c=0.06, h=180.0)  # ΔL=0.08 from bottom → D≈0.08 ✓

# Complementary set — hue arc ≈ 180° between top and bottom
COMP_TOP    = color(l=0.50, c=0.15, h=30.0)    # warm
COMP_BOTTOM = color(l=0.50, c=0.15, h=210.0)   # cool (~180° away)
COMP_SHOE   = color(l=0.50, c=0.15, h=30.0)    # same as top → all D > 0.15 (no clash)

# Neutral-anchored set — 1 accent (C=0.15), 2 achromatics (C=0.005)
ACCENT_TOP     = color(l=0.60, c=0.15, h=150.0)
ACHROMATIC_BOT = color(l=0.35, c=0.005, h=0.0)
ACHROMATIC_SHO = color(l=0.95, c=0.005, h=0.0)


# ── State 1: No clash, no profile boost → 1.0× ───────────────────────────────

class TestState1Neutral:
    def test_neutral_ancored_profile_no_boost(self):
        """neutral_anchored profile but outfit doesn't meet condition → 1.0× profile."""
        scoring = score_outfit(WHITE_SHIRT, CHARCOAL_TROUSER, BROWN_SHOE)
        result = apply_profile_multiplier(scoring, "neutral_anchored",
                                          WHITE_SHIRT, CHARCOAL_TROUSER, BROWN_SHOE)
        assert result.clash_modifier == 1.0
        assert result.profile_multiplier == 1.0
        assert result.final_score == pytest.approx(result.s_raw * 1.0 * 1.0)

    def test_s_raw_between_0_and_100(self):
        scoring = score_outfit(WHITE_SHIRT, CHARCOAL_TROUSER, BROWN_SHOE)
        assert 0.0 <= scoring.s_raw <= 100.0


# ── State 2: Clash, no profile boost → 0.5× ──────────────────────────────────

class TestState2ClashOnly:
    def test_clash_triggered(self):
        scoring = score_outfit(CLASH_TOP, CLASH_BOTTOM, CLASH_SHOE)
        # At least one pair must be in the clash zone
        assert scoring.clash_triggered is True
        assert scoring.clash_modifier == 0.5

    def test_profile_not_boosted(self):
        """Profile condition not met → profile_multiplier stays 1.0."""
        scoring = score_outfit(CLASH_TOP, CLASH_BOTTOM, CLASH_SHOE)
        result = apply_profile_multiplier(scoring, "tonal_minimalist",
                                          CLASH_TOP, CLASH_BOTTOM, CLASH_SHOE)
        assert result.profile_multiplier == 1.0
        assert result.final_score == pytest.approx(result.s_raw * 0.5)

    def test_final_score_halved(self):
        scoring = score_outfit(CLASH_TOP, CLASH_BOTTOM, CLASH_SHOE)
        result = apply_profile_multiplier(scoring, "high_contrast",
                                          CLASH_TOP, CLASH_BOTTOM, CLASH_SHOE)
        assert result.final_score < result.s_raw


# ── State 3: No clash, profile boost → 1.5× ──────────────────────────────────

class TestState3ProfileBoost:
    def test_tonal_minimalist_boosted(self):
        scoring = score_outfit(NAVY_SHIRT, NAVY_TROUSER, NAVY_SHOE)
        result = apply_profile_multiplier(scoring, "tonal_minimalist",
                                          NAVY_SHIRT, NAVY_TROUSER, NAVY_SHOE)
        assert scoring.clash_triggered is False
        assert result.profile_condition_met is True
        assert result.profile_multiplier == 1.5
        assert result.final_score == pytest.approx(result.s_raw * 1.5)

    def test_high_contrast_boosted(self):
        scoring = score_outfit(COMP_TOP, COMP_BOTTOM, COMP_SHOE)
        result = apply_profile_multiplier(scoring, "high_contrast",
                                          COMP_TOP, COMP_BOTTOM, COMP_SHOE)
        assert result.profile_condition_met is True
        assert result.profile_multiplier == 1.5

    def test_neutral_anchored_boosted(self):
        scoring = score_outfit(ACCENT_TOP, ACHROMATIC_BOT, ACHROMATIC_SHO)
        result = apply_profile_multiplier(scoring, "neutral_anchored",
                                          ACCENT_TOP, ACHROMATIC_BOT, ACHROMATIC_SHO)
        assert result.profile_condition_met is True
        assert result.profile_multiplier == 1.5


# ── State 4: Clash + profile boost → 0.75× ────────────────────────────────────

class TestState4ClashAndBoost:
    def test_075x_net_effect(self):
        """
        Construct an outfit where:
          - top↔shoes ΔL=0.08 → D_TS=0.08, triggers clash zone (0.5 modifier)
          - top↔bottom are complementary (hue arc ≈180°) → high_contrast (1.5 multiplier)
        Net = 0.5 × 1.5 = 0.75×
        """
        # top and bottom: identical L/C, complementary hue → is_complementary(TB) = True
        # D_TB ≈ 180/360 = 0.5 (hue dominates — well outside clash zone)
        top    = color(l=0.50, c=0.10, h=30.0)
        bottom = color(l=0.50, c=0.10, h=210.0)  # hue arc = 180° → complementary ✓
        # shoes: same hue/C as top but ΔL=0.08 → D_TS = 0.08 (clash zone ✓)
        shoes  = color(l=0.58, c=0.10, h=30.0)

        from app.engine.oklch_utils import oklch_distance
        d_ts = oklch_distance(top.l, top.c, top.h, shoes.l, shoes.c, shoes.h)
        assert 0.05 < d_ts < 0.15, f"D_TS={d_ts} not in clash zone — adjust fixture"

        from app.engine.scoring import is_complementary as ic
        assert ic(top.h, bottom.h), "TB pair not complementary — adjust fixture"

        scoring = score_outfit(top, bottom, shoes)
        result = apply_profile_multiplier(scoring, "high_contrast", top, bottom, shoes)

        assert result.clash_modifier == 0.5
        assert result.profile_multiplier == 1.5
        assert result.clash_modifier * result.profile_multiplier == pytest.approx(0.75)
        assert result.final_score == pytest.approx(result.s_raw * 0.75)



# ── scores_snapshot() ────────────────────────────────────────────────────────

class TestScoresSnapshot:
    def test_snapshot_has_required_keys(self):
        scoring = score_outfit(WHITE_SHIRT, CHARCOAL_TROUSER, BROWN_SHOE)
        result = apply_profile_multiplier(scoring, "tonal_minimalist",
                                          WHITE_SHIRT, CHARCOAL_TROUSER, BROWN_SHOE)
        snapshot = result.scores_snapshot()
        required = {"s_raw", "clash_modifier", "profile_multiplier", "final_score",
                    "d_tb", "d_bs", "d_ts"}
        assert required.issubset(snapshot.keys())

    def test_snapshot_values_are_numeric(self):
        scoring = score_outfit(NAVY_SHIRT, NAVY_TROUSER, NAVY_SHOE)
        result = apply_profile_multiplier(scoring, "tonal_minimalist",
                                          NAVY_SHIRT, NAVY_TROUSER, NAVY_SHOE)
        for k, v in result.scores_snapshot().items():
            assert isinstance(v, (int, float)), f"Non-numeric value for {k}: {v}"
