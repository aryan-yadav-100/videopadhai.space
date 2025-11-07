# ===============================
# services/storage_service.py (FIXED VERSION)
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
        
        # Fix: Use the same service account credentials for GCS client
        service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if service_account_path and os.path.exists(service_account_path):
            # Use service account credentials
            credentials = service_account.Credentials.from_service_account_file(
                service_account_path
            )
            self.gcs_client = gcs.Client(credentials=credentials)
        else:
            # Fallback to default credentials (for production environments)
            self.gcs_client = gcs.Client()
    
    async def upload_video(self, video_path: str, chat_id: str) -> str:
        """
        Upload video to Firebase Storage and return signed URL
        """
        try:
            # Generate unique filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"rendered_videos/{chat_id}_{timestamp}.mp4"
            
            # Upload to Firebase Storage
            blob = self.bucket.blob(filename)
            
            logger.info(f"Uploading video to: {filename}")
            
            with open(video_path, 'rb') as video_file:
                blob.upload_from_file(video_file, content_type='video/mp4')
            
            logger.info(f"Video uploaded successfully: {filename}")
            
            # Generate signed URL (valid for 7 days)
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=datetime.utcnow() + timedelta(days=7),
                method="GET"
            )
            
            return signed_url
            
        except Exception as e:
            logger.error(f"Error uploading video for {chat_id}: {str(e)}")
            raise