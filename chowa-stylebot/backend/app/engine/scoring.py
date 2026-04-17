"""
scoring.py — S_raw composite score from pairwise OKLCH distances.

Implements PRD Appendix A, sections A & B:
  - f(D) = 1 − min(D, 1)        inverse distance → harmony score
  - S_raw = (0.5·f(D_TB) + 0.3·f(D_BS) + 0.2·f(D_TS)) × 100
  - Clash zone: 0.05 < D < 0.15 → clash_modifier = 0.5
"""

from __future__ import annotations
from dataclasses import dataclass

from app.engine.oklch_utils import oklch_distance


# ── Thresholds (from PRD Appendix A, section C) ───────────────────────────────
TONAL_MATCH_MAX = 0.05      # D < 0.05   → tonal match (very similar)
CLASH_ZONE_MAX  = 0.15      # 0.05 < D < 0.15 → clash zone (uncanny valley)
COMPLEMENT_ARC  = 180.0     # hue arc ≈ 180° (±15°) → complementary
COMPLEMENT_TOL  = 15.0

CLASH_MODIFIER  = 0.5


@dataclass
class GarmentColor:
    """Minimal color struct consumed by the scoring engine."""
    l: float   # Lightness
    c: float   # Chroma
    h: float   # Hue


@dataclass
class PairwiseDistances:
    d_tb: float    # top ↔ bottom
    d_bs: float    # bottom ↔ shoes
    d_ts: float    # top ↔ shoes


@dataclass
class ScoringResult:
    d_tb: float
    d_bs: float
    d_ts: float
    s_raw: float
    clash_triggered: bool
    clash_modifier: float


def _f(d: float) -> float:
    """Inverse distance → harmony score, bounded to [0, 1]."""
    return 1.0 - min(d, 1.0)


def is_clash(d: float) -> bool:
    """True if pairwise distance falls in the clash zone (uncanny valley)."""
    return TONAL_MATCH_MAX < d < CLASH_ZONE_MAX


def is_complementary(h1: float, h2: float) -> bool:
    """True if the hue arc between two colors is ~180° ±15°."""
    from app.engine.oklch_utils import delta_h_arc
    arc = delta_h_arc(h1, h2)
    return abs(arc - COMPLEMENT_ARC) <= COMPLEMENT_TOL


def compute_distances(top: GarmentColor, bottom: GarmentColor, shoes: GarmentColor) -> PairwiseDistances:
    """Compute the three weighted pairwise OKLCH distances for an outfit."""
    return PairwiseDistances(
        d_tb=oklch_distance(top.l, top.c, top.h, bottom.l, bottom.c, bottom.h),
        d_bs=oklch_distance(bottom.l, bottom.c, bottom.h, shoes.l, shoes.c, shoes.h),
        d_ts=oklch_distance(top.l, top.c, top.h, shoes.l, shoes.c, shoes.h),
    )


def compute_s_raw(d: PairwiseDistances) -> float:
    """
    Weighted composite harmony score.

    S_raw = (0.5·f(D_TB) + 0.3·f(D_BS) + 0.2·f(D_TS)) × 100
    """
    return (0.5 * _f(d.d_tb) + 0.3 * _f(d.d_bs) + 0.2 * _f(d.d_ts)) * 100.0


def score_outfit(top: GarmentColor, bottom: GarmentColor, shoes: GarmentColor) -> ScoringResult:
    """
    Full Phase-1 scoring: compute distances → S_raw → clash detection.

    Profile multipliers are applied separately in profile_multipliers.py.
    """
    d = compute_distances(top, bottom, shoes)
    s_raw = compute_s_raw(d)

    clash = any(is_clash(dist) for dist in (d.d_tb, d.d_bs, d.d_ts))
    modifier = CLASH_MODIFIER if clash else 1.0

    return ScoringResult(
        d_tb=d.d_tb,
        d_bs=d.d_bs,
        d_ts=d.d_ts,
        s_raw=s_raw,
        clash_triggered=clash,
        clash_modifier=modifier,
    )
