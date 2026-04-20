import asyncio
import io
from PIL import Image

try:
    from rembg import remove, new_session
    _session = new_session("u2net")
except (ImportError, SystemExit):
    # Fallback for testing environments where ONNX runtime fails to build
    print("Warning: rembg failed to import. Using mock background remover.")
    remove = lambda img, session: img
    new_session = lambda name: None
    _session = None


async def remove_background(image_bytes: bytes) -> bytes:
    """
    Strip background from an image using rembg.
    Runs synchronously in the current thread. Use run_in_executor for production to avoid blocking the event loop.
    """
    input_img = Image.open(io.BytesIO(image_bytes))
    
    # Run rembg
    output_img = remove(input_img, session=_session)
    
    # Save to PNG bytes (needs to be PNG to preserve alpha channel)
    out_io = io.BytesIO()
    output_img.save(out_io, format="PNG")
    return out_io.getvalue()


async def remove_background_async(image_bytes: bytes) -> bytes:
    """
    Async wrapper for remove_background_cmd to prevent blocking the FastAPI event loop.
    """
    loop = asyncio.get_running_loop()
    # Run the CPU-bound rembg task in a background thread
    return await loop.run_in_executor(None, remove_background_cmd_sync, image_bytes)


def remove_background_cmd_sync(image_bytes: bytes) -> bytes:
    """Synchronous helper for the executor."""
    input_img = Image.open(io.BytesIO(image_bytes))
    # rembg handles alpha matting automatically
    output_img = remove(input_img, session=_session)
    
    out_io = io.BytesIO()
    output_img.save(out_io, format="PNG")
    return out_io.getvalue()
