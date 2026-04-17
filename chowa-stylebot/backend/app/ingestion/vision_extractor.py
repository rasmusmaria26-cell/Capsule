import json
from base64 import b64encode
from dataclasses import dataclass
from typing import Optional

import httpx
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


async def extract_garment_tags(image_bytes: bytes) -> VisionExtractionResult:
    """
    Call Google Cloud Vision API to extract category tags and dominant colors.
    """
    api_key = getattr(settings, "google_api_key", "")
    creds = settings.google_application_credentials
    
    # For local dev without creds (or with example placeholders), return a mock response
    has_no_creds = not creds or "/path/to/" in creds
    has_no_api_key = not api_key or api_key == "MOCK"
    
    if has_no_creds and has_no_api_key:
        return _mock_extraction()

    url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"

    payload = {
        "requests": [
            {
                "image": {"content": b64encode(image_bytes).decode("utf-8")},
                "features": [
                    {"type": "LABEL_DETECTION", "maxResults": 10},
                    {"type": "IMAGE_PROPERTIES", "maxResults": 5}
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise VisionExtractionError(f"Vision API call failed: {str(e)}")

    if "responses" not in data or not data["responses"]:
        raise VisionExtractionError("Empty response from Vision API")

    res = data["responses"][0]
    if "error" in res:
        raise VisionExtractionError(f"Vision API returned error: {res['error'].get('message')}")

    return _parse_vision_response(res)


def _parse_vision_response(res: dict) -> VisionExtractionResult:
    # 1. Parse Image Properties (Colors)
    colors_data = res.get("imagePropertiesAnnotation", {}).get("dominantColors", {}).get("colors", [])
    if not colors_data:
        raise VisionExtractionError("No colors detected in image")

    # Sort colors by combined prominence and pixel fraction to find the dominant garment colors
    # (Background is already removed by rembg, so the remaining colors belong to the garment)
    sorted_colors = sorted(
        colors_data,
        key=lambda c: c.get("score", 0) * c.get("pixelFraction", 0),
        reverse=True
    )

    extracted_colors = []
    for c in sorted_colors[:2]:
        rgb = c.get("color", {})
        # Convert RGB dict to hex string
        r, g, b = int(rgb.get("red", 0)), int(rgb.get("green", 0)), int(rgb.get("blue", 0))
        hex_code = f"#{r:02X}{g:02X}{b:02X}"
        extracted_colors.append(ExtractedColor(
            hex_code=hex_code,
            score=c.get("score", 0),
            pixel_fraction=c.get("pixelFraction", 0)
        ))

    dominant_color = extracted_colors[0]
    secondary_color = extracted_colors[1] if len(extracted_colors) > 1 else None

    # 2. Parse Labels (Category)
    labels_data = res.get("labelAnnotations", [])
    all_labels = [label.get("description", "").lower() for label in labels_data]

    # Simple heuristic to map Vision labels to our rigid Categories
    # Top / Bottom / Shoes / Outerwear / Accessory
    category = "Accessory"  # default fallback
    sub_category = None
    confidence = 0.5  # default low confidence if we have to guess

    tops = {"shirt", "t-shirt", "top", "blouse", "sweater", "hoodie"}
    bottoms = {"trousers", "pants", "jeans", "shorts", "skirt"}
    shoes = {"shoe", "sneaker", "boot", "footwear"}
    outerwear = {"jacket", "coat", "blazer", "suit"}

    # Find highest confidence matching label
    for label in labels_data:
        desc = label.get("description", "").lower()
        score = label.get("score", 0.0)

        # Look for matching words in the label description
        words = set(desc.split())
        if tops.intersection(words):
            category = "Top"
            sub_category = desc
            confidence = score
            break
        elif bottoms.intersection(words):
            category = "Bottom"
            sub_category = desc
            confidence = score
            break
        elif shoes.intersection(words):
            category = "Shoes"
            sub_category = desc
            confidence = score
            break
        elif outerwear.intersection(words):
            category = "Outerwear"
            sub_category = desc
            confidence = score
            break

    # If we didn't find a strong structural match but got labels, use the top label as sub_category
    if category == "Accessory" and labels_data:
        sub_category = labels_data[0].get("description")
        confidence = labels_data[0].get("score", 0.0) - 0.2  # Penalty for falling back to accessory

    return VisionExtractionResult(
        category=category,
        sub_category=sub_category.title() if sub_category else None,
        confidence=confidence,
        dominant_color=dominant_color,
        secondary_color=secondary_color,
        all_labels=all_labels
    )


def _mock_extraction() -> VisionExtractionResult:
    """Mock result for local development without GCP credentials."""
    import asyncio
    return VisionExtractionResult(
        category="Top",
        sub_category="Oxford Shirt",
        confidence=0.92,
        dominant_color=ExtractedColor(hex_code="#1C2B4A", score=0.8, pixel_fraction=0.7),
        secondary_color=ExtractedColor(hex_code="#F2F2F0", score=0.2, pixel_fraction=0.1),
        all_labels=["shirt", "oxford", "clothing", "sleeve"]
    )
