from dataclasses import dataclass
from typing import Optional
from app.ingestion.vision_extractor import VisionExtractionResult

# 85% confidence threshold from PRD
CONFIDENCE_THRESHOLD = 0.85

@dataclass
class GatedResult:
    is_confirmed: bool           # True if confidence >= 85%, False otherwise
    requires_manual_check: bool  # Convenience boolean, inverse of is_confirmed
    reason: Optional[str]        # Why the manual check is required

def evaluate_confidence(result: VisionExtractionResult) -> GatedResult:
    """
    Evaluates the Vision API extraction result against the 85% PRD threshold.
    If the extraction confidence is below 85%, it flags the item for manual user validation.
    """
    # 1. Check primary category confidence
    if result.confidence < CONFIDENCE_THRESHOLD:
        return GatedResult(
            is_confirmed=False,
            requires_manual_check=True,
            reason=f"Category classification confidence ({result.confidence:.0%}) below {CONFIDENCE_THRESHOLD:.0%} threshold."
        )

    # 2. Check if we defaulted to Accessory unconditionally (fallback)
    # The vision extractor applies a penalty when defaulting, but we explicitly flag it here too
    if result.category == "Accessory" and "accessory" not in [lbl.lower() for label in result.all_labels for lbl in label.split()]:
         return GatedResult(
            is_confirmed=False,
            requires_manual_check=True,
            reason="Fell back to Accessory classification without explicit accessory tag."
        )

    # 3. Check color confidence (pixel fraction)
    # If the dominant color makes up less than 15% of the image (post background removal),
    # the image might be too noisy or patterned to establish a clear dominant color.
    if result.dominant_color.pixel_fraction < 0.15:
        return GatedResult(
            is_confirmed=False,
            requires_manual_check=True,
            reason=f"Dominant color pixel fraction ({result.dominant_color.pixel_fraction:.0%}) too low. Image may be overly patterned."
        )

    # Passed all gates
    return GatedResult(
        is_confirmed=True,
        requires_manual_check=False,
        reason=None
    )
