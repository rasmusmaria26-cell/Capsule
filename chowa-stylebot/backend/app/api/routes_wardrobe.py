from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid

from app.deps import get_db, get_current_user_id
from app.ingestion.bg_remover import remove_background_async
from app.ingestion.vision_extractor import extract_garment_tags, VisionExtractionError
from app.ingestion.confidence_gate import evaluate_confidence
from app.ingestion.storage import upload_image, StorageError
from app.engine.oklch_utils import hex_to_oklch

router = APIRouter()

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_wardrobe_item(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Phase 2 Image Ingestion Pipeline
    1. Receive image
    2. Remove background in worker thread
    3. Upload processed image to S3 (async)
    4. Call Vision API for tags/colors
    5. Evaluate 85% confidence gate
    6. Convert hex to OKLCH & persist to DB
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read file bytes
        raw_image = await file.read()
        
        # 1. Background Removal
        processed_image = await remove_background_async(raw_image)
        
        # 2. Parallel: Upload to Storage & Extract Tags
        import asyncio
        upload_task = upload_image(processed_image, user_id, "png")
        vision_task = extract_garment_tags(processed_image) # send bg-removed image to vision
        
        image_url, vision_result = await asyncio.gather(upload_task, vision_task)
        
        # 3. Evaluate Confidence Gate
        gate_result = evaluate_confidence(vision_result)
        
        # 4. OKLCH Conversion (for the engine)
        l, c, h = hex_to_oklch(vision_result.dominant_color.hex_code)
        secondary_hex = vision_result.secondary_color.hex_code if vision_result.secondary_color else None

        # 5. Persist to DB using raw SQL (matching schema perfectly)
        garment_id = str(uuid.uuid4())
        
        insert_query = text("""
            INSERT INTO garments (
                garment_id, user_id, category, sub_category, 
                dominant_hex, secondary_hex, 
                oklch_l, oklch_c, oklch_h, 
                image_url, confidence, is_confirmed
            ) VALUES (
                :garment_id, :user_id, :category, :sub_category,
                :dominant_hex, :secondary_hex,
                :l, :c, :h,
                :image_url, :confidence, :is_confirmed
            ) RETURNING garment_id
        """)
        
        db.execute(insert_query, {
            "garment_id": garment_id,
            "user_id": user_id,
            "category": vision_result.category,
            "sub_category": vision_result.sub_category,
            "dominant_hex": vision_result.dominant_color.hex_code,
            "secondary_hex": secondary_hex,
            "l": l,
            "c": c,
            "h": h,
            "image_url": image_url,
            "confidence": vision_result.confidence,
            "is_confirmed": gate_result.is_confirmed
        })
        db.commit()
        
        # Return DB record representation + gate flags for UI
        return {
            "garment_id": garment_id,
            "category": vision_result.category,
            "sub_category": vision_result.sub_category,
            "dominant_color": vision_result.dominant_color.hex_code,
            "secondary_color": secondary_hex,
            "image_url": image_url,
            "needs_manual_review": gate_result.requires_manual_check,
            "review_reason": gate_result.reason
        }
        
    except VisionExtractionError as e:
        raise HTTPException(status_code=502, detail=f"Vision API Error: {str(e)}")
    except StorageError as e:
        raise HTTPException(status_code=502, detail=f"Storage Error: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def list_garments(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """GET /wardrobe/ — list user's garments."""
    items = db.execute(text("""
        SELECT garment_id, category, sub_category, dominant_hex, image_url, is_confirmed 
        FROM garments WHERE user_id = :uid ORDER BY created_at DESC
    """), {"uid": user_id}).mappings().fetchall()
    
    return {"items": [dict(r) for r in items]}
