# main.py
# ===============================
# SIMPLE FASTAPI HTTP SERVER FOR BACKEND-2
# ===============================
import os
import logging
import asyncio
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

class RenderResponse(BaseModel):
    success: bool
    message: str

async def background_render_task(user_id: str, chat_id: str, trace_id: Optional[str] = None):
    """
    Background task that handles the actual rendering process.
    Logs errors but doesn't raise them since there's no HTTP response to return.
    """
    try:
        logger.info(f"Starting background render for userId: {user_id}, chatId: {chat_id}, traceId: {trace_id}")
        await webhook_handler.process_render_request(user_id, chat_id)
        logger.info(f"Background render completed successfully for userId: {user_id}, chatId: {chat_id}")
    except Exception as e:
        logger.error(f"Background render failed for userId: {user_id}, chatId: {chat_id}, error: {str(e)}", exc_info=True)

@app.post("/render")
async def render_video(request: RenderRequest):
    """
    Accepts render request and returns immediately.
    The actual rendering happens in the background (fire-and-forget).
    """
    try:
        logger.info(f"Received render request for userId: {request.userId}, chatId: {request.chatId}, traceId: {request.traceId}")
        
        # Start rendering in background task (fire-and-forget)
        asyncio.create_task(
            background_render_task(request.userId, request.chatId, request.traceId)
        )
        
        # Return immediately
        return {"success": True, "message": "Render request accepted and processing"}
        
    except Exception as e:
        logger.error(f"Error accepting render request: {str(e)}", exc_info=True)
        return {"success": False, "message": f"Failed to accept render request: {str(e)}"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "backend-2"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)