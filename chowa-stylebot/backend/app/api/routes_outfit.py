import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.deps import get_db, get_current_user_id
from app.engine.occasion_filter import filter_garments
from app.engine.chowa_ranker import rank_outfits


router = APIRouter()


class GenerateRequest(BaseModel):
    occasion: str
    weather: str = "mild"


@router.post("/generate", status_code=status.HTTP_200_OK)
def generate_outfits(
    request: Request,
    req: GenerateRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Phase 3: Two-Stage Outfit Generation Pipeline
    1. Fetch user's confirmed wardrobe & Chowa profile
    2. Stage 1: Boolean Occasion/Weather filter
    3. Stage 2: N^3 OKLCH Ranker
    4. Return Top 3 & Log Telemetry
    """
    
    # 1. Fetch user profile
    user = db.execute(
        text("SELECT chowa_profile FROM users WHERE user_id = :uid"), 
        {"uid": user_id}
    ).mappings().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    chowa_profile = user["chowa_profile"]
    
    # 2. Fetch all confirmed garments for this user
    raw_garments = db.execute(
        text("""
            SELECT * FROM garments 
            WHERE user_id = :uid AND is_confirmed = TRUE
        """), 
        {"uid": user_id}
    ).mappings().fetchall()
    
    garments = [dict(g) for g in raw_garments]
    
    if not garments:
        raise HTTPException(status_code=400, detail="Wardrobe is empty or has no confirmed items.")

    # 3. Stage 1: Filter by Occasion & Weather
    filtered_garments = filter_garments(garments, req.occasion, req.weather)
    
    # Stratify by category
    raw_tops = [g for g in filtered_garments if g["category"] == "Top"]
    bottoms = [g for g in filtered_garments if g["category"] == "Bottom"]
    shoes = [g for g in filtered_garments if g["category"] == "Shoes"]
    outerwear = [g for g in garments if g["category"] == "Outerwear"] # Outerwear bypasses basic category weather filters for layering

    # Layering Resolution Rule: 
    # If outerwear is allowed and exists, create synthetic "Top" combinations 
    # where the visual color input to the ranker is the Outerwear, but the 
    # constituent items list includes both.
    tops = list(raw_tops)
    for out in outerwear:
        for t in raw_tops:
            # Create a combined layered top. Visually, the outerwear takes precedence.
            layered_top = dict(out) # copy outerwear OKLCH values
            layered_top["is_layered"] = True
            layered_top["underlayer"] = t
            tops.append(layered_top)
            
    # Graceful Degradation — Partial Style Mode
    missing_cats = []
    if not tops: missing_cats.append("Tops")
    if not bottoms: missing_cats.append("Bottoms")
    if not shoes: missing_cats.append("Shoes")
    
    # If missing 2 or more core categories, we cannot generate even a partial outfit
    if len(missing_cats) > 1:
        raise HTTPException(
            status_code=400, 
            detail=f"Not enough items to form a complete outfit for {req.occasion}/{req.weather}. "
                   f"Missing: {', '.join(missing_cats)}"
        )
        
    # If missing exactly 1 category, fill it with a neutral dummy so math works,
    # but flag it as partial for the UI.
    is_partial_style = len(missing_cats) == 1
    
    if not tops:
        tops = [{"garment_id": "dummy-top", "oklch_l": 0.5, "oklch_c": 0.0, "oklch_h": 0.0, "is_dummy": True}]
    if not bottoms:
        bottoms = [{"garment_id": "dummy-bot", "oklch_l": 0.5, "oklch_c": 0.0, "oklch_h": 0.0, "is_dummy": True}]
    if not shoes:
        shoes = [{"garment_id": "dummy-sho", "oklch_l": 0.5, "oklch_c": 0.0, "oklch_h": 0.0, "is_dummy": True}]

    # 4. Stage 2: OKLCH Combinatorics Engine
    ranked_outfits = rank_outfits(tops, bottoms, shoes, chowa_profile)
    
    # DEBUG PRINT FOR TESTS
    import os
    if os.environ.get("PYTEST_CURRENT_TEST"):
        print("\n=== RANKER OUTFITS EVALUATED ===")
        for r in ranked_outfits:
            t = r['items']['top'].get('garment_id', 'dummy')
            is_l = r['items']['top'].get('is_layered', False)
            print(f"Top: {t} Layered={is_l} Score: {r['final_score']}")
        print("================================")
    
    if not ranked_outfits:
        raise HTTPException(status_code=400, detail="No valid combinations found.")

    # 5. Take Top 3
    top_3 = ranked_outfits[:3]
    
    # 6. Persist to Outfits & Telemetry Tables
    outfit_responses = []
    
    for idx, outfit in enumerate(top_3):
        outfit_id = str(uuid.uuid4())
        
        o_top = outfit["items"]["top"]
        o_bot = outfit["items"]["bottom"]
        o_sho = outfit["items"]["shoes"]
        
        # If it's a layered top, extract the actual IDs
        top_id = o_top["garment_id"] if not o_top.get("is_dummy") else None
        outerwear_id = None
        if o_top.get("is_layered"):
            outerwear_id = o_top["garment_id"]
            top_id = o_top["underlayer"]["garment_id"]
            
        bottom_id = o_bot["garment_id"] if not o_bot.get("is_dummy") else None
        shoe_id = o_sho["garment_id"] if not o_sho.get("is_dummy") else None
        
        # Insert Outfit record
        db.execute(text("""
            INSERT INTO outfits (
                outfit_id, user_id, top_id, bottom_id, shoes_id, 
                occasion, weather_desc, final_score,
                s_raw, clash_modifier, profile_multiplier, d_tb, d_bs, d_ts
            ) VALUES (
                :oid, :uid, :tid, :bid, :sid,
                :occ, :wea, :score,
                :s_raw, :clash_mod, :prof_mult, :d_tb, :d_bs, :d_ts
            )
        """), {
            "oid": outfit_id,
            "uid": user_id,
            "tid": top_id,
            "bid": bottom_id,
            "sid": shoe_id,
            "occ": req.occasion,
            "wea": req.weather,
            "score": outfit["final_score"],
            "s_raw": outfit["score_details"]["s_raw"],
            "clash_mod": outfit["score_details"]["clash_modifier"],
            "prof_mult": outfit["score_details"]["profile_multiplier"],
            "d_tb": outfit["score_details"]["d_tb"],
            "d_bs": outfit["score_details"]["d_bs"],
            "d_ts": outfit["score_details"]["d_ts"]
        })
        
        # Format response for the UI
        items_payload = {
            "top": o_top.get("underlayer", o_top) if not o_top.get("is_dummy") else None,
            "bottom": o_bot if not o_bot.get("is_dummy") else None,
            "shoes": o_sho if not o_sho.get("is_dummy") else None
        }
        if outerwear_id:
            # Safely add outerwear back into the UI payload display
            items_payload["outerwear"] = {k: v for k, v in o_top.items() if k not in ["is_layered", "underlayer"]}
            
        outfit_responses.append({
            "outfit_id": outfit_id,
            "rank": idx + 1,
            "final_score": round(outfit["final_score"], 1),
            "is_partial_style": is_partial_style,
            "items": items_payload,
            "telemetry": outfit["score_details"]  # Send to UI for dev/transparency
        })
        
    db.commit()
    
    return {
        "user_profile": chowa_profile,
        "occasion": req.occasion,
        "weather": req.weather,
        "generated_outfits": outfit_responses
    }
