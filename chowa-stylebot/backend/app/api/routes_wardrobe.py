from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
import os
import json

from app.deps import get_db, get_current_user_id
from app.ingestion.bg_remover import remove_background
from app.ingestion.vision_extractor import extract_garment_data, VisionExtractionError
from app.ingestion.confidence_gate import evaluate_confidence
from app.ingestion.storage import upload_image, StorageError
from app.engine.oklch_utils import hex_to_oklch

router = APIRouter()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_wardrobe_item(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """POST /wardrobe/upload — Handle image ingestion with background removal and Vision tagging."""
    try:
        # 1. Background Removal
        image_bytes = await file.read()
        no_bg_image = await remove_background(image_bytes)
        
        # 2. Vision API Extraction
        extracted_garments = await extract_garment_data(no_bg_image)
        
        # 3. Storage (Cloud)
        image_url = await upload_image(no_bg_image, user_id)
        
        results = []
        needs_review = False
        
        for garment_data in extracted_garments:
            # 4. Confidence Gate (85%)
            gate_result = evaluate_confidence(garment_data)
            is_confirmed = gate_result.is_confirmed
            if not is_confirmed:
                needs_review = True
            
            # 5. OKLCH Conversion
            l_val, c_val, h_val = hex_to_oklch(garment_data.dominant_color.hex_code)
            
            # 6. Database Record
            garment_id = str(uuid.uuid4())
            db.execute(text("""
                INSERT INTO garments (garment_id, user_id, category, sub_category, dominant_hex,
                                     oklch_l, oklch_c, oklch_h, image_url, is_confirmed,
                                     confidence, all_labels)
                VALUES (:id, :uid, :cat, :sub, :hex, :l, :c, :h, :url, :conf, :conf_val, :lbls)
            """), {
                "id": garment_id, "uid": user_id, "cat": garment_data.category,
                "sub": garment_data.sub_category, "hex": garment_data.dominant_color.hex_code,
                "l": l_val, "c": c_val, "h": h_val, "url": image_url, "conf": is_confirmed,
                "conf_val": garment_data.confidence, "lbls": json.dumps(garment_data.all_labels)
            })
            
            results.append({
                "garment_id": garment_id,
                "category": garment_data.category,
                "sub_category": garment_data.sub_category,
                "dominant_hex": garment_data.dominant_color.hex_code,
                "image_url": image_url,
                "is_confirmed": is_confirmed
            })
            
        db.commit()
        
        return {
            "items": results,
            "needs_review": needs_review
        }

    except VisionExtractionError as e:
        raise HTTPException(status_code=502, detail=f"Vision API Error: {str(e)}")
    except StorageError as e:
        raise HTTPException(status_code=502, detail=f"Storage Error: {str(e)}")
    except Exception as e:
        import traceback
        print("=== UPLOAD 500 TRACEBACK ===")
        traceback.print_exc()
        print("=== END TRACEBACK ===")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_garments(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """GET /wardrobe/ — list user's garments."""
    try:
        items = db.execute(text("""
            SELECT garment_id, category, sub_category, dominant_hex, image_url, is_confirmed 
            FROM garments WHERE user_id = :uid ORDER BY created_at DESC
        """), {"uid": user_id}).mappings().fetchall()
        
        return {"items": [dict(r) for r in items]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{garment_id}")
def get_garment(
    garment_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """GET /wardrobe/{garment_id} — fetch a single garment for the ItemDetail screen."""
    try:
        row = db.execute(text("""
            SELECT garment_id, user_id, category, sub_category, occasion_tags, season_tags,
                   dominant_hex, oklch_l, oklch_c, oklch_h, image_url, is_confirmed,
                   confidence, all_labels, created_at
            FROM garments
            WHERE garment_id = :gid AND user_id = :uid
        """), {"gid": garment_id, "uid": user_id}).mappings().fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Garment not found")

        return {"garment": dict(row)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
