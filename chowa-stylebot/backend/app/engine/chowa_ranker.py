import itertools
from typing import List, Dict, Any

from app.engine.scoring import GarmentColor, score_outfit, ScoringResult
from app.engine.profile_multipliers import apply_profile_multiplier

def _to_color(g: Dict[str, Any]) -> GarmentColor:
    """Extract OKLCH from a garment dict into a GarmentColor struct."""
    return GarmentColor(
        l=g.get("oklch_l", 0.0),
        c=g.get("oklch_c", 0.0),
        h=g.get("oklch_h", 0.0)
    )

def rank_outfits(
    tops: List[Dict[str, Any]],
    bottoms: List[Dict[str, Any]],
    shoes: List[Dict[str, Any]],
    chowa_profile: str
) -> List[Dict[str, Any]]:
    """
    Stage 2 Engine: N^3 Combinatorics + OKLCH Math.
    Generates all valid [Top, Bottom, Shoe] combinations, scores them,
    applies the user's specific Chowa Profile modifiers, and returns them
    sorted by final_score descending.
    """
    scored_outfits = []

    # Generate all possible 3-piece combinations
    for top, bottom, shoe in itertools.product(tops, bottoms, shoes):
        
        # 1. Convert to OKLCH math structs
        c_top = _to_color(top)
        c_bot = _to_color(bottom)
        c_sho = _to_color(shoe)

        # 2. Raw math scoring (distances, S_raw, clash detection)
        base_score = score_outfit(c_top, c_bot, c_sho)

        # 3. Apply Profile Modifiers & Calculate Final Score
        final_result = apply_profile_multiplier(base_score, chowa_profile, c_top, c_bot, c_sho)

        # 4. Store outfit with complete telemetry snapshot
        scored_outfits.append({
            "items": {
                "top": top,
                "bottom": bottom,
                "shoes": shoe
            },
            "score_details": final_result.scores_snapshot(),
            "final_score": final_result.final_score
        })

    # Sort outfits strictly by the final score (highest first)
    scored_outfits.sort(key=lambda x: x["final_score"], reverse=True)
    
    return scored_outfits
