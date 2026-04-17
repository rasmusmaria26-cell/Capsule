"""
oklch_utils.py — Hex → OKLCH conversion + circular hue arc distance.

OKLCH is a perceptually uniform color space:
  L = Lightness   (0 → 1)
  C = Chroma      (0 → ~0.4)
  H = Hue angle   (0 → 360°)

All engine math is done in OKLCH to ensure perceptually accurate distances.
"""

from __future__ import annotations
import math


# ── Hex → Linear RGB ──────────────────────────────────────────────────────────

def _hex_to_linear_rgb(hex_color: str) -> tuple[float, float, float]:
    """Convert hex string (#RRGGBB) to linear-light RGB values in [0,1]."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)

    r8, g8, b8 = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)

    def to_linear(c: int) -> float:
        v = c / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    return to_linear(r8), to_linear(g8), to_linear(b8)


# ── Linear RGB → OKLab ────────────────────────────────────────────────────────

def _linear_rgb_to_oklab(r: float, g: float, b: float) -> tuple[float, float, float]:
    """
    Convert linear RGB to OKLab via the Björn Ottosson matrix method.
    Reference: https://bottosson.github.io/posts/oklab/
    """
    # Step 1: RGB → LMS (cone responses) via M1 matrix
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

    # Step 2: Cube root (perceptual non-linearity)
    l_ = l ** (1 / 3)
    m_ = m ** (1 / 3)
    s_ = s ** (1 / 3)

    # Step 3: LMS → Lab via M2 matrix
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b_val = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

    return L, a, b_val


# ── OKLab → OKLCH ─────────────────────────────────────────────────────────────

def _oklab_to_oklch(L: float, a: float, b: float) -> tuple[float, float, float]:
    """Convert OKLab (L, a, b) to OKLCH (L, C, H)."""
    C = math.sqrt(a ** 2 + b ** 2)
    H = math.degrees(math.atan2(b, a)) % 360
    return L, C, H


# ── Public API ────────────────────────────────────────────────────────────────

def hex_to_oklch(hex_color: str) -> tuple[float, float, float]:
    """
    Convert a hex color string to OKLCH.

    Returns:
        (L, C, H) where:
            L ∈ [0, 1]     — perceptual lightness
            C ∈ [0, ~0.4]  — chroma (colorfulness)
            H ∈ [0, 360)   — hue angle in degrees
    """
    r, g, b = _hex_to_linear_rgb(hex_color)
    L, a, b_val = _linear_rgb_to_oklab(r, g, b)
    return _oklab_to_oklch(L, a, b_val)


def delta_h_arc(h1: float, h2: float) -> float:
    """
    Shortest circular arc distance between two hue angles (degrees).

    Handles wraparound: e.g. 350° and 10° → 20°, not 340°.

    Formula from PRD Appendix A:
        Δh_arc = min(|Δh|, 360 − |Δh|)
    """
    diff = abs(h1 - h2)
    return min(diff, 360.0 - diff)


def oklch_distance(
    l1: float, c1: float, h1: float,
    l2: float, c2: float, h2: float,
) -> float:
    """
    Perceptual OKLCH distance between two colors.

    Formula from PRD Appendix A:
        D = √(ΔL² + ΔC² + Δh_arc²)

    Hue is normalized by /360 so all three components share the [0, 1] scale.
    This ensures the clash zone thresholds (0.05 < D < 0.15) are meaningful
    — otherwise raw hue deltas (0–180°) would dominate the distance.
    """
    dL = l1 - l2
    dC = c1 - c2
    dH = delta_h_arc(h1, h2) / 360.0   # normalize to [0, 0.5]
    return math.sqrt(dL ** 2 + dC ** 2 + dH ** 2)
