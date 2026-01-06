# services/firestore_service.py
# ===============================
# UPDATED FOR DIRECT chatId USAGE (NO _workflow2 SUFFIX)
# ===============================
import logging
from typing import Optional
from firebase_admin import firestore
from datetime import datetime

logger = logging.getLogger(__name__)

class FirestoreService:
    def __init__(self):
        self.db = firestore.client()
        
    async def get_manim_code(self, userId: str, chatId: str) -> Optional[str]:
        """
        Retrieve Manim code from Firestore using userId and chatId
        Structure: finalAnswers/{chatId} -> { answer: "manim_code_here", ownerId: userId }
        """
        try:
            # Fetch directly using chatId (no _workflow2 suffix)
            doc_ref = self.db.collection('finalAnswers').document(chatId)
            doc = doc_ref.get()
                        
            if doc.exists:
                data = doc.to_dict()
                
                # Verify the document belongs to the requesting user
                if data.get('ownerId') != userId:
                    logger.error(f"Access denied: User {userId} trying to access chatId {chatId} owned by {data.get('ownerId')}")
                    return None
                
                manim_code = data.get('answer')  # Get the 'answer' field containing Manim code
                
                if manim_code:
                    logger.info(f"Successfully retrieved Manim code for user {userId}, chatId {chatId}")
                    return manim_code
                else:
                    logger.error(f"No 'answer' field found in document for chatId: {chatId}")
                    return None
            else:
                logger.error(f"No document found for chatId: {chatId}")
                return None
                        
        except Exception as e:
            logger.error(f"Error fetching Manim code for user {userId}, chatId {chatId}: {str(e)}")
            raise

    async def update_render_status(
        self, 
        userId: str,
        chatId: str, 
        status: str, 
        message: str = ""
    ):
        """
        Update the render status in Firestore
        Updates the document directly using chatId
        """
        try:
            doc_ref = self.db.collection('finalAnswers').document(chatId)
            
            # Verify document exists and belongs to user before updating
            doc = doc_ref.get()
            if not doc.exists:
                logger.error(f"Cannot update status: Document {chatId} not found")
                return
                
            data = doc.to_dict()
            if data.get('ownerId') != userId:
                logger.error(f"Access denied: User {userId} cannot update document owned by {data.get('ownerId')}")
                return
            
            doc_ref.update({
                'renderStatus': status,
                'renderMessage': message,
                'updatedAt': datetime.utcnow()
            })
            logger.info(f"Updated status to {status} for user {userId}, chatId: {chatId}")
                    
        except Exception as e:
            logger.error(f"Error updating render status for user {userId}, chatId {chatId}: {str(e)}")
            raise

    async def update_render_complete(
        self, 
        userId: str,
        chatId: str, 
        video_url: str
    ):
        """
        Mark render as complete with video URL
        """
        try:
            doc_ref = self.db.collection('finalAnswers').document(chatId)
            
            # Verify document exists and belongs to user before updating
            doc = doc_ref.get()
            if not doc.exists:
                logger.error(f"Cannot complete render: Document {chatId} not found")
                return
                
            data = doc.to_dict()
            if data.get('ownerId') != userId:
                logger.error(f"Access denied: User {userId} cannot update document owned by {data.get('ownerId')}")
                return
            
            doc_ref.update({
                'rendered': True,
                'videoUrl': video_url,
                'renderStatus': 'completed',
                'renderedAt': datetime.utcnow(),
                'updatedAt': datetime.utcnow()
            })
            logger.info(f"Render completed for user {userId}, chatId: {chatId}")
                    
        except Exception as e:
            logger.error(f"Error marking render complete for user {userId}, chatId {chatId}: {str(e)}")
            raise