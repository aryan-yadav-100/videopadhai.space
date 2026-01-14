# ===============================
# services/storage_service.py
# FIXED VERSION - With service account for signed URLs
# ===============================
import os
import logging
from datetime import datetime, timedelta
from firebase_admin import storage
from google.cloud import storage as gcs
from google.oauth2 import service_account

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.bucket = storage.bucket()
        self.bucket_name = self.bucket.name
        
        # Load service account credentials for signed URLs
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        
        if service_account_path and os.path.exists(service_account_path):
            # Load from mounted secret
            credentials = service_account.Credentials.from_service_account_file(
                service_account_path
            )
            self.gcs_client = gcs.Client(
                credentials=credentials,
                project='animation-padhaai-88646'
            )
            logger.info(f"✅ Loaded service account credentials from: {service_account_path}")
        else:
            # Fallback to default credentials (won't work for signed URLs)
            self.gcs_client = gcs.Client()
            logger.warning(f"⚠️ Service account file not found at: {service_account_path}")
            logger.warning("⚠️ Using default credentials - signed URLs may not work")
    
    async def upload_video(self, video_path: str, chat_id: str) -> str:
        """
        Upload video to Firebase Storage and return signed URL
        """
        try:
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"rendered_videos/{chat_id}_{timestamp}.mp4"
            
            # Check video file size before upload
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found at: {video_path}")
            
            video_size = os.path.getsize(video_path)
            logger.info(f"📹 Preparing to upload video: {video_size} bytes ({video_size/1024/1024:.2f} MB)")
            
            # Validate video size (should be more than 1MB for a proper render)
            if video_size < 1024 * 1024:  # Less than 1MB
                logger.warning(f"⚠️ Video file seems too small: {video_size/1024:.2f} KB - might be incomplete")
            
            # Upload to Firebase Storage using Firebase Admin SDK
            blob = self.bucket.blob(filename)
            
            logger.info(f"⬆️ Uploading video to: {filename}")
            
            with open(video_path, 'rb') as video_file:
                blob.upload_from_file(video_file, content_type='video/mp4')
            
            logger.info(f"✅ Video uploaded successfully: {filename}")
            
            # Use GCS client with service account to generate signed URL
            gcs_bucket = self.gcs_client.bucket(self.bucket_name)
            gcs_blob = gcs_bucket.blob(filename)
            
            # Generate signed URL (valid for 7 days)
            signed_url = gcs_blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=7),
                method="GET"
            )
            
            logger.info(f"🔐 Generated signed URL for: {filename}")
            logger.info(f"🔗 URL expires in 7 days")
            
            return signed_url
            
        except Exception as e:
            logger.error(f"❌ Error uploading video for {chat_id}: {str(e)}")
            raise