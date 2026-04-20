import json
import asyncio
from base64 import b64encode
from dataclasses import dataclass
from typing import Optional, Literal

from pydantic import BaseModel, Field
from app.config import settings

@dataclass
class ExtractedColor:
    hex_code: str
    score: float      # Prominence score from Vision API
    pixel_fraction: float

@dataclass
class VisionExtractionResult:
    category: str
    sub_category: Optional[str]
    confidence: float
    dominant_color: ExtractedColor
    secondary_color: Optional[ExtractedColor]
    all_labels: list[str]

class VisionExtractionError(Exception):
    pass

# We define Pydantic schemas over dataclasses here just for Gemini Structured Outputs
class PydanticExtractedColor(BaseModel):
    hex_code: str = Field(description="Hex color code, e.g. #FFFFFF or #1C2B4A")
    score: float = Field(description="Prominence score between 0.0 and 1.0")
    pixel_fraction: float = Field(description="Estimated fraction of the item covered by this color (0.0 to 1.0)")

class PydanticGarment(BaseModel):
    category: Literal["Top", "Bottom", "Shoes", "Outerwear", "Accessory", "Dress", "One-Piece"]
    sub_category: str | None = Field(
        description="A rich semantic description of the clothing piece. e.g., 'Black Utility Jacket' or 'Off-White Oxford Shirt'."
    )
    confidence: float = Field(description="Overall confidence in this identification (0.0 to 1.0).")
    dominant_color: PydanticExtractedColor
    secondary_color: PydanticExtractedColor | None = Field(default=None)
    all_labels: list[str] = Field(
        description="A detailed list of tags. e.g., 'cotton', 'buttons', 'baggy', 'streetwear'."
    )

class PydanticVisionResult(BaseModel):
    items: list[PydanticGarment] = Field(
        description="List of DISTINCT clothing items found in the image. If the person is wearing a full outfit, you MUST return separate objects for their jacket, their shirt, their pants, and their shoes."
    )

async def extract_garment_data(image_bytes: bytes) -> list[VisionExtractionResult]:
    """
    Call Google Gemini 2.5 Flash to perform advanced multimodal layer detection and extraction.
    """
    if not settings.gemini_api_key:
        return _mock_extraction()

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        
        loop = asyncio.get_running_loop()
        
        def _call_gemini():
            prompt = (
                "You are an expert AI fashion stylist. Analyze the provided image of clothing. "
                "The image will have its background removed. "
                "Look closely at the image. If the image depicts an ENTIRE outfit or multiple layered items (e.g., a jacket worn over a shirt, with pants and shoes), "
                "you MUST separate them into individual items in the `items` array. Never combine a shirt and a jacket into one item. "
                "For EACH distinct item, determine its category, sub_category, and colors accurately."
            )
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type='image/png',
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=PydanticVisionResult,
                    temperature=0.1,
                ),
            )
            return response.text

        response_text = await loop.run_in_executor(None, _call_gemini)
        
        if not response_text:
            raise VisionExtractionError("Gemini API returned an empty response.")
            
        data = json.loads(response_text)
        
        def _parse_color(c: dict | None, is_required: bool = False) -> Optional[ExtractedColor]:
            if not c:
                return ExtractedColor(hex_code="#000000", score=0.5, pixel_fraction=0.5) if is_required else None
            return ExtractedColor(
                hex_code=c.get("hex_code", "#000000"),
                score=c.get("score", 0.5),
                pixel_fraction=c.get("pixel_fraction", 0.5)
            )

        results = []
        for item_data in data.get("items", []):
            results.append(
                VisionExtractionResult(
                    category=item_data["category"],
                    sub_category=item_data.get("sub_category"),
                    confidence=item_data.get("confidence", 0.9),
                    dominant_color=_parse_color(item_data.get("dominant_color"), is_required=True),
                    secondary_color=_parse_color(item_data.get("secondary_color"), is_required=False),
                    all_labels=item_data.get("all_labels", [])
                )
            )
        return results

    except Exception as e:
        if isinstance(e, VisionExtractionError):
            raise e
        raise VisionExtractionError(f"Gemini API vision extraction failed: {str(e)}")

def _mock_extraction() -> list[VisionExtractionResult]:
    return [
        VisionExtractionResult(
            category="Outerwear",
            sub_category="Black Utility Jacket (Mock - API Key Missing)",
            confidence=0.92,
            dominant_color=ExtractedColor(hex_code="#1C2B4A", score=0.8, pixel_fraction=0.7),
            secondary_color=ExtractedColor(hex_code="#F2F2F0", score=0.2, pixel_fraction=0.1),
            all_labels=["mock", "api", "key", "required"]
        ),
        VisionExtractionResult(
            category="Top",
            sub_category="White Shirt (Mock - API Key Missing)",
            confidence=0.85,
            dominant_color=ExtractedColor(hex_code="#FFFFFF", score=0.9, pixel_fraction=0.9),
            secondary_color=None,
            all_labels=["mock", "shirt", "white"]
        )
    ]
