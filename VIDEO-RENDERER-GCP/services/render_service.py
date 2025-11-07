# services/webhook_handler.py
# ===============================
# UPDATED FOR HTTP WITH userId/chatId CONSISTENCY
# ===============================
import logging
import asyncio
from typing import Dict, Any

logger = logging.getLogger(__name__)

class WebhookHandler:
    def __init__(self, firestore_service, manim_renderer, storage_service, file_manager):
        self.firestore_service = firestore_service
        self.manim_renderer = manim_renderer
        self.storage_service = storage_service
        # Note: file_manager is not used anymore but keeping for compatibility
        self.file_manager = file_manager
    
    async def process_render_request(
        self,
        userId: str,
        chatId: str,
    ):
        """
        Process the render request asynchronously with userId and chatId
        Updated to work with HTTP request structure from Backend-1
        """
        try:
            logger.info(f"Starting render process for userId: {userId}, chatId: {chatId}")
                        
            # Update Firestore with processing status
            await self.firestore_service.update_render_status(
                userId, chatId, "processing", "Starting video render"
            )
                        
            # Step 1: Fetch Manim code from Firestore using userId and chatId
            logger.info(f"Fetching Manim code for userId: {userId}, chatId: {chatId}")
            manim_code = await self.firestore_service.get_manim_code(userId, chatId)
                        
            if not manim_code:
                raise Exception("No Manim code found in Firestore")
            
            # Debug logging to verify what we're getting
            logger.info(f"User ID: {userId}")
            logger.info(f"Chat ID: {chatId}")
            logger.info(f"Manim code preview: {manim_code[:100]}...")
                        
            # Step 2: Render video using existing approach
            # Since scene name is ignored, we'll pass a default scene name
            # The actual scene name will be determined from the Manim code itself
            logger.info(f"Rendering video for userId: {userId}, chatId: {chatId}")
            
            video_path = await self.manim_renderer.render_video(
                None,           # python_file_path not used in new approach
                "MainScene",    # default scene name - will be ignored as per your request
                manim_code      # the actual manim code
            )
                                
            # Step 3: Upload to Firebase Storage
            logger.info(f"Uploading video to storage for userId: {userId}, chatId: {chatId}")
            video_url = await self.storage_service.upload_video(
                video_path, f"{userId}_{chatId}"  # Use combined identifier for unique filename
            )
            
            # Step 4: Now cleanup files AFTER successful upload
            logger.info("Video uploaded successfully, cleaning up files...")
            self.manim_renderer.cleanup_after_upload()
                                
            # Step 5: Update Firestore with success
            await self.firestore_service.update_render_complete(
                userId, chatId, video_url
            )
                                
            logger.info(f"Render completed successfully for userId: {userId}, chatId: {chatId}")
                        
        except Exception as e:
            logger.error(f"Render failed for userId {userId}, chatId {chatId}: {str(e)}")
            
            # Cleanup files even on error
            try:
                self.manim_renderer.cleanup_after_upload()
                logger.info("Cleaned up files after error")
            except Exception as cleanup_error:
                logger.error(f"Error during cleanup: {str(cleanup_error)}")
            
            await self.firestore_service.update_render_status(
                userId, chatId, "failed", str(e)
            )