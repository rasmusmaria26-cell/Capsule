from typing import List, Dict

# Occasion rules based on clothing sub_category or category.
# These act as a simple boolean gate to prune the wardrobe before N^3 combinatorics.

OCCASION_RULES = {
    "work": {
        "allowed_categories": ["Top", "Bottom", "Shoes", "Outerwear"],
        "forbidden_sub_categories": [
            "t-shirt", "shorts", "sneaker", "sweatpants", "hoodie", "flip-flops", "tank top"
        ]
    },
    "casual": {
        "allowed_categories": ["Top", "Bottom", "Shoes", "Outerwear"],
        "forbidden_sub_categories": [] # Anything goes
    },
    "night_out": {
        "allowed_categories": ["Top", "Bottom", "Shoes", "Outerwear"],
        "forbidden_sub_categories": ["sweatpants", "flip-flops", "hoodie"]
    }
}

WEATHER_RULES = {
    "hot": { # > 25C / 77F
        "forbidden_sub_categories": ["coat", "sweater", "jacket", "boot", "beanie", "scarf", "turtleneck"],
        "forbidden_categories": ["Outerwear"]
    },
    "cold": { # < 15C / 59F
        "forbidden_sub_categories": ["shorts", "tank top", "sandals", "flip-flops", "t-shirt"],
        "forbidden_categories": []
    },
    "mild": { # 15-25C
        "forbidden_sub_categories": ["coat"], # heavy coats only
        "forbidden_categories": []
    }
}


def filter_garments(
    garments: List[Dict], 
    occasion: str, 
    weather_desc: str = "mild"
) -> List[Dict]:
    """
    Stage 1 Boolean Gate: Prunes garments that violate the occasion or weather rules.
    Returns the filtered list of garments ready for Stage 2 combinatorics.
    """
    filtered = []
    
    # Normalize inputs
    occasion = occasion.lower()
    weather_desc = weather_desc.lower()
    
    occ_rule = OCCASION_RULES.get(occasion, OCCASION_RULES["casual"])
    wea_rule = WEATHER_RULES.get(weather_desc, WEATHER_RULES["mild"])
    
    for g in garments:
        cat = g.get("category", "")
        sub = g.get("sub_category", "") or ""
        sub = sub.lower()
        
        # 1. Check Category Allowlist (Occasion)
        if cat not in occ_rule["allowed_categories"]:
            continue
            
        # 1b. Check Category Blocklist (Weather)
        if cat in wea_rule["forbidden_categories"]:
            continue
            
        # 2. Check SubCategory Blocklist (Occasion)
        is_forbidden_occ = any(forbidden in sub for forbidden in occ_rule["forbidden_sub_categories"])
        if is_forbidden_occ:
            continue
            
        # 3. Check SubCategory Blocklist (Weather)
        is_forbidden_wea = any(forbidden in sub for forbidden in wea_rule["forbidden_sub_categories"])
        if is_forbidden_wea:
            continue
            
        # Passed all gates
        filtered.append(g)
        
    return filtered
