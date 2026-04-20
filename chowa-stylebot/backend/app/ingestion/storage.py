import uuid
import os
from pathlib import Path

class StorageError(Exception):
    pass

# Store uploads inside the backend directory for local dev
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "wardrobe"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

async def upload_image(image_bytes: bytes, user_id: str, file_ext: str = "png") -> str:
    """
    Save image to local disk (dev) or GCS (prod via GOOGLE_APPLICATION_CREDENTIALS).
    Returns a URL the frontend can use to load the image.
    """
    try:
        from google.cloud import storage as gcs
        from app.config import settings
        if settings.gcs_bucket:
            # Production: upload to GCS
            import asyncio
            client = gcs.Client()
            file_key = f"wardrobe/{user_id}/{uuid.uuid4().hex}.{file_ext}"
            loop = asyncio.get_running_loop()
            def _upload():
                bucket = client.bucket(settings.gcs_bucket)
                blob = bucket.blob(file_key)
                blob.upload_from_string(image_bytes, content_type=f"image/{file_ext}")
                return blob.public_url
            return await loop.run_in_executor(None, _upload)
    except Exception:
        pass  # Fall through to local storage

    # Development: save to local disk served by FastAPI static files
    user_dir = UPLOADS_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = user_dir / filename
    file_path.write_bytes(image_bytes)

    # Return URL that resolves against the local backend
    return f"{BASE_URL}/wardrobe/images/{user_id}/{filename}"
