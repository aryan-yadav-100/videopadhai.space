import tempfile
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class FileManager:
    def __init__(self):
        # Use system's default temp directory
        self.temp_dir = tempfile.gettempdir()
        logger.info(f"Using temp directory: {self.temp_dir}")
    
    def create_temp_file(self, scene_name: str, manim_code: str) -> str:
        """
        Create a temporary Manim Python file
        Returns the full path to the created file
        """
        try:
            # Create a temporary file with proper naming
            temp_file = tempfile.NamedTemporaryFile(
                mode='w', 
                suffix='.py',
                prefix=f'{scene_name}_',
                delete=False,  # Don't auto-delete, we'll handle cleanup
                dir=self.temp_dir
            )
            
            # Write the Manim code to the file
            temp_file.write(manim_code)
            temp_file.close()
            
            logger.info(f"Created temporary Manim file: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error creating temporary file: {str(e)}")
            raise
    
    def cleanup_temp_file(self, file_path: str) -> None:
        """
        Clean up temporary file after use
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up temporary file: {file_path}")
            else:
                logger.warning(f"Temp file not found for cleanup: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up temp file {file_path}: {str(e)}")

    def get_temp_directory(self) -> str:
        """
        Get the system's temporary directory path
        """
        return self.temp_dir