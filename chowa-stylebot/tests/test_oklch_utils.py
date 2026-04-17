"""
Tests for oklch_utils.py — math correctness.
"""

import math
import pytest
from app.engine.oklch_utils import hex_to_oklch, delta_h_arc, oklch_distance


class TestHexToOklch:
    def test_black(self):
        L, C, H = hex_to_oklch("#000000")
        assert L == pytest.approx(0.0, abs=1e-4)
        assert C == pytest.approx(0.0, abs=1e-4)

    def test_white(self):
        L, C, H = hex_to_oklch("#ffffff")
        assert L == pytest.approx(1.0, abs=1e-3)
        assert C == pytest.approx(0.0, abs=1e-3)

    def test_pure_red_has_hue_near_30(self):
        # Red (#ff0000) in OKLCH has H ≈ 29°
        L, C, H = hex_to_oklch("#ff0000")
        assert L > 0.4
        assert C > 0.1
        assert 20.0 < H < 40.0

    def test_shorthand_hex(self):
        L3, C3, H3 = hex_to_oklch("#fff")
        L6, C6, H6 = hex_to_oklch("#ffffff")
        assert L3 == pytest.approx(L6, abs=1e-6)

    def test_returns_tuple_of_three_floats(self):
        result = hex_to_oklch("#1A2B3C")
        assert len(result) == 3
        assert all(isinstance(v, float) for v in result)

    def test_lightness_bounded(self):
        for hex_val in ("#000000", "#888888", "#ffffff", "#ff0000", "#00ff00", "#0000ff"):
            L, C, H = hex_to_oklch(hex_val)
            assert 0.0 <= L <= 1.0, f"Lightness out of range for {hex_val}: {L}"

    def test_hue_bounded(self):
        for hex_val in ("#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"):
            L, C, H = hex_to_oklch(hex_val)
            assert 0.0 <= H < 360.0, f"Hue out of range for {hex_val}: {H}"


class TestDeltaHArc:
    def test_zero_arc(self):
        assert delta_h_arc(45.0, 45.0) == pytest.approx(0.0)

    def test_simple_arc(self):
        assert delta_h_arc(10.0, 50.0) == pytest.approx(40.0)

    def test_wraparound(self):
        # 350° and 10° → 20°, not 340°
        assert delta_h_arc(350.0, 10.0) == pytest.approx(20.0)

    def test_wraparound_reverse(self):
        assert delta_h_arc(10.0, 350.0) == pytest.approx(20.0)

    def test_complementary_180(self):
        assert delta_h_arc(0.0, 180.0) == pytest.approx(180.0)

    def test_always_le_180(self):
        for h1, h2 in [(0, 270), (90, 300), (45, 225)]:
            assert delta_h_arc(h1, h2) <= 180.0


class TestOklchDistance:
    def test_identical_colors_zero_distance(self):
        d = oklch_distance(0.5, 0.1, 45.0, 0.5, 0.1, 45.0)
        assert d == pytest.approx(0.0)

    def test_distance_is_euclidean(self):
        # With h1=h2, distance reduces to sqrt(dL² + dC²)
        d = oklch_distance(0.8, 0.05, 100.0, 0.6, 0.05, 100.0)
        expected = math.sqrt((0.8 - 0.6) ** 2)
        assert d == pytest.approx(expected, abs=1e-6)

    def test_uses_arc_for_hue(self):
        # hue 350 vs 10 → arc is 20°/360 = 0.0556, not 340°/360 = 0.944
        d_arc = oklch_distance(0.5, 0.0, 350.0, 0.5, 0.0, 10.0)
        d_large = oklch_distance(0.5, 0.0, 10.0, 0.5, 0.0, 350.0)
        # Both should be equal (symmetry) and use the short arc
        assert d_arc == pytest.approx(d_large)
        assert d_arc == pytest.approx(20.0 / 360.0, abs=1e-6)

    def test_symmetric(self):
        d1 = oklch_distance(0.3, 0.08, 200.0, 0.7, 0.15, 50.0)
        d2 = oklch_distance(0.7, 0.15, 50.0, 0.3, 0.08, 200.0)
        assert d1 == pytest.approx(d2)
