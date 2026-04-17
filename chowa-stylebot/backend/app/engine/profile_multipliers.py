"""
profile_multipliers.py — Chowa Profile conditions + final_score assembly.

Implements PRD Appendix A, sections D & E.

Three profiles, each granting a 1.5× multiplier when their conditions are met:

  Tonal Minimalist  — ALL pairwise D < 0.05 (every pair is a tonal match)
  High-Contrast     — D_TB OR D_BS satisfies complementary match (arc ≈ 180° ±15°)
  Neutral-Anchored  — Exactly 1 item has C > 0.1 AND all others have C < 0.02

Multipliers are applied *alongside* the clash modifier, not instead of it.

  final_score = S_raw × clash_modifier × profile_multiplier

Modifier matrix (Appendix E):
  clash=1.0, profile=1.0  →  1.0×  neutral
  clash=0.5, profile=1.0  →  0.5×  penalised
  clash=1.0, profile=1.5  →  1.5×  boosted
  clash=0.5, profile=1.5  →  0.75× ⚠ monitor via telemetry
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Literal

from app.engine.scoring import GarmentColor, ScoringResult, is_complementary, TONAL_MATCH_MAX

ChowProfileType = Literal["tonal_minimalist", "high_contrast", "neutral_anchored"]

PROFILE_MULTIPLIER = 1.5
CHROMA_ACCENT_MIN  = 0.1    # item is considered "colourful"
CHROMA_NEUTRAL_MAX = 0.02   # item is considered achromatic


@dataclass
class FinalScore:
    s_raw: float
    clash_modifier: float
    profile_multiplier: float
    final_score: float
    d_tb: float
    d_bs: float
    d_ts: float
    profile_condition_met: bool
    clash_triggered: bool

    def scores_snapshot(self) -> dict:
        """JSON-serialisable dict for telemetry logging."""
        return {
            "s_raw": round(self.s_raw, 4),
            "clash_modifier": self.clash_modifier,
            "profile_multiplier": self.profile_multiplier,
            "final_score": round(self.final_score, 4),
            "d_tb": round(self.d_tb, 6),
            "d_bs": round(self.d_bs, 6),
            "d_ts": round(self.d_ts, 6),
        }


# ── Profile condition checks ───────────────────────────────────────────────────

def _is_tonal_minimalist(scoring: ScoringResult) -> bool:
    """All three pairwise distances must be tonal matches (D < 0.05)."""
    return all(d < TONAL_MATCH_MAX for d in (scoring.d_tb, scoring.d_bs, scoring.d_ts))


def _is_high_contrast(
    scoring: ScoringResult,
    top: GarmentColor,
    bottom: GarmentColor,
    shoes: GarmentColor,
) -> bool:
    """D_TB OR D_BS must satisfy the complementary match threshold (≈180° ±15°)."""
    return is_complementary(top.h, bottom.h) or is_complementary(bottom.h, shoes.h)


def _is_neutral_anchored(top: GarmentColor, bottom: GarmentColor, shoes: GarmentColor) -> bool:
    """Exactly 1 item has C > 0.1; all others have C < 0.02 (achromatic)."""
    chromas = [top.c, bottom.c, shoes.c]
    accents = sum(1 for c in chromas if c > CHROMA_ACCENT_MIN)
    neutrals = sum(1 for c in chromas if c < CHROMA_NEUTRAL_MAX)
    return accents == 1 and neutrals == 2


# ── Public API ────────────────────────────────────────────────────────────────

def apply_profile_multiplier(
    scoring: ScoringResult,
    profile: ChowProfileType,
    top: GarmentColor,
    bottom: GarmentColor,
    shoes: GarmentColor,
) -> FinalScore:
    """
    Apply the Chowa profile multiplier to produce final_score.

    Args:
        scoring:  Output from scoring.score_outfit()
        profile:  User's Chowa profile from onboarding quiz
        top/bottom/shoes: The same garment colors used for scoring

    Returns:
        FinalScore dataclass with all breakdown fields + scores_snapshot()
    """
    condition_met = False

    if profile == "tonal_minimalist":
        condition_met = _is_tonal_minimalist(scoring)
    elif profile == "high_contrast":
        condition_met = _is_high_contrast(scoring, top, bottom, shoes)
    elif profile == "neutral_anchored":
        condition_met = _is_neutral_anchored(top, bottom, shoes)

    profile_mult = PROFILE_MULTIPLIER if condition_met else 1.0
    final = scoring.s_raw * scoring.clash_modifier * profile_mult

    return FinalScore(
        s_raw=scoring.s_raw,
        clash_modifier=scoring.clash_modifier,
        profile_multiplier=profile_mult,
        final_score=final,
        d_tb=scoring.d_tb,
        d_bs=scoring.d_bs,
        d_ts=scoring.d_ts,
        profile_condition_met=condition_met,
        clash_triggered=scoring.clash_triggered,
    )
