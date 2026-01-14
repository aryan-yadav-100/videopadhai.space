# main.py
# ===============================
# BACKEND 2 - NO RESPONSE PATTERN
# Request stays open, container stays alive
# ===============================
import os
import logging
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from typing import Optional

# Load environment variables and configure logging
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    if not firebase_admin._apps:
        if os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH'):
            cred = credentials.Certificate(os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH'))
        else:
            cred = credentials.ApplicationDefault()
        
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'your-project.appspot.com')
        })

initialize_firebase()

# Import and initialize services
from services.render_service import WebhookHandler
from services.firestore_service import FirestoreService
from services.manim_renderer import ManimRenderer
from services.service_storage import StorageService
from services.file_manager import FileManager

USE_VENV = os.getenv("USE_VENV", "false").lower() == "true"

firestore_service = FirestoreService()
manim_renderer = ManimRenderer(use_venv=USE_VENV)
storage_service = StorageService()
file_manager = FileManager()
webhook_handler = WebhookHandler(firestore_service, manim_renderer, storage_service, file_manager)

# FastAPI app
app = FastAPI()

class RenderRequest(BaseModel):
    userId: str
    chatId: str
    traceId: Optional[str] = None

@app.post("/render")
async def render_video(request: RenderRequest):
    """
    Process render and complete the work.
    """
    logger.info(f"🎬 Received render request for userId: {request.userId}, chatId: {request.chatId}, traceId: {request.traceId}")
    
    try:
        # Process the render - request stays open during this entire time
        await webhook_handler.process_render_request(request.userId, request.chatId)
        
        logger.info(f"✅ Render completed successfully for userId: {request.userId}, chatId: {request.chatId}")
        
    except Exception as e:
        logger.error(f"❌ Render failed for userId: {request.userId}, chatId: {request.chatId}, error: {str(e)}", exc_info=True)
    
    # No return statement - FastAPI will return 200 OK with null body

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "backend-2"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)