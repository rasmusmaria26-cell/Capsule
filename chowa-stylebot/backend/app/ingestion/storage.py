import uuid
import boto3
from botocore.exceptions import ClientError
from app.config import settings

class StorageError(Exception):
    pass

def _get_s3_client():
    if not settings.aws_access_key_id or not settings.s3_bucket:
        return None
    return boto3.client(
        's3',
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region
    )

async def upload_image(image_bytes: bytes, user_id: str, file_ext: str = "png") -> str:
    """
    Upload an image to S3 (or return a mock URL if not configured).
    Returns the public URL of the uploaded image.
    """
    s3 = _get_s3_client()
    
    # Generate unique filename: {user_id}/{uuid}.{ext}
    file_key = f"wardrobe/{user_id}/{uuid.uuid4().hex}.{file_ext}"
    
    if not s3:
        # Development fallback when S3 isn't configured
        return f"https://mock-storage.chowa.dev/{file_key}"
        
    try:
        # In a real async app we'd use aiobotocore or run_in_executor
        import asyncio
        loop = asyncio.get_running_loop()
        
        def _upload():
            s3.put_object(
                Bucket=settings.s3_bucket,
                Key=file_key,
                Body=image_bytes,
                ContentType=f"image/{file_ext}",
                ACL='public-read'  # Assuming public wardrobe images for MVP simplicity
            )
            
        await loop.run_in_executor(None, _upload)
        
        # Return public URL
        region = settings.aws_region
        bucket = settings.s3_bucket
        return f"https://{bucket}.s3.{region}.amazonaws.com/{file_key}"
        
    except ClientError as e:
        raise StorageError(f"Failed to upload to S3: {e}")
