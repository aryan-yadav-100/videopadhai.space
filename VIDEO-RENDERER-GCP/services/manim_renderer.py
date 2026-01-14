# ===============================
# services/manim_renderer.py
# FIXED VERSION - Full video upload, not partial files
# ===============================
import os
import logging
import asyncio
import glob
import shutil
from typing import Optional

logger = logging.getLogger(__name__)

class ManimRenderer:
    def __init__(self, use_venv: bool = False, venv_name: str = "voiceover_env"):
        self.use_venv = use_venv  # Option to use venv or not
        self.venv_name = venv_name
        self.work_dir = os.getcwd()  # Current working directory
        self.manim_file = os.path.join(self.work_dir, "manim_code.py")
        self.media_dir = os.path.join(self.work_dir, "media")
        
        # Detect operating system for cross-platform compatibility
        self.is_windows = os.name == 'nt'
        self.is_linux = not self.is_windows
        
        logger.info(f"ManimRenderer initialized for {'Windows' if self.is_windows else 'Linux'}")
        logger.info(f"Virtual environment usage: {'Enabled' if self.use_venv else 'Disabled (Docker mode)'}")
        
    async def render_video(
        self, 
        python_file_path: str,  # We'll ignore this and use our own file
        scene_name: str,
        manim_code: str  # Add manim_code parameter
    ) -> str:
        """
        Cross-platform render: Works on both Windows and Linux
        For Docker deployment, use_venv should be False
        """
        try:
            logger.info(f"Starting render process for scene: {scene_name} on {'Windows' if self.is_windows else 'Linux'}")
            
            # Create media directory before rendering
            os.makedirs(self.media_dir, exist_ok=True)
            logger.info(f"Created media directory: {self.media_dir}")
            
            # Step 1: Create manim_code.py in current directory
            self._create_manim_file(manim_code)
            
            # Step 2: Execute render command (platform-aware)
            video_path = await self._execute_render_command(scene_name)
            
            return video_path
            
        except Exception as e:
            logger.error(f"Error in Manim rendering: {str(e)}")
            # Only cleanup manim_code.py on error, keep video for retry
            if os.path.exists(self.manim_file):
                os.remove(self.manim_file)
                logger.info("Cleaned up manim_code.py (error case)")
            raise
    
    def _create_manim_file(self, manim_code: str):
        """
        Create manim_code.py file in current directory
        """
        try:
            with open(self.manim_file, 'w', encoding='utf-8') as f:
                f.write(manim_code)
            logger.info(f"Created manim_code.py in {self.work_dir}")
        except Exception as e:
            logger.error(f"Error creating manim_code.py: {str(e)}")
            raise
    
    async def _execute_render_command(self, scene_name: str) -> str:
        """
        Execute render command - CROSS PLATFORM VERSION
        """
        try:
            if self.use_venv:
                # Use virtual environment (for development)
                video_path = await self._execute_with_venv(scene_name)
            else:
                # Direct execution (recommended for Docker)
                video_path = await self._execute_direct(scene_name)
            
            return video_path
            
        except Exception as e:
            logger.error(f"Error executing render command: {str(e)}")
            raise
    
    async def _execute_direct(self, scene_name: str) -> str:
        """
        Direct execution without virtual environment (Docker mode)
        """
        try:
            logger.info("Executing Manim directly (Docker/system Python mode)")
            
            # Build command arguments with ABSOLUTE path
            cmd_args = [
                "python", "-m", "manim",
                "manim_code.py",
                scene_name,
                f"--media_dir={self.media_dir}",
                "--disable_caching"
            ]
            
            logger.info(f"Command: {' '.join(cmd_args)}")
            logger.info(f"Media directory: {self.media_dir}")
            
            # Execute command
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.work_dir
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown Manim error"
                stdout_msg = stdout.decode() if stdout else ""
                logger.error(f"Manim command failed with return code {process.returncode}")
                logger.error(f"STDERR: {error_msg}")
                logger.error(f"STDOUT: {stdout_msg}")
                raise Exception(f"Manim rendering failed: {error_msg}")
            
            logger.info("Manim rendering completed successfully")
            if stdout:
                logger.debug(f"Manim output: {stdout.decode()}")
            
            # Find the generated video file
            video_path = self._find_generated_video(scene_name)
            
            if not video_path:
                raise Exception("Could not locate generated video file")
            
            # Log video file size for verification
            video_size = os.path.getsize(video_path)
            logger.info(f"Generated video found at: {video_path}")
            logger.info(f"Video file size: {video_size} bytes ({video_size/1024/1024:.2f} MB)")
            
            return video_path
            
        except Exception as e:
            logger.error(f"Error in direct execution: {str(e)}")
            raise
    
    async def _execute_with_venv(self, scene_name: str) -> str:
        """
        Execute with virtual environment (development mode)
        """
        try:
            logger.info(f"Executing Manim with virtual environment: {self.venv_name}")
            
            if self.is_windows:
                # Windows PowerShell approach
                shell_command = f"{self.venv_name}\\Scripts\\Activate.ps1; python -m manim manim_code.py {scene_name} --media_dir={self.media_dir} --disable_caching"
                process = await asyncio.create_subprocess_exec(
                    "powershell", "-Command", shell_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.work_dir
                )
            else:
                # Linux/Mac bash approach
                shell_command = f"source {self.venv_name}/bin/activate && python -m manim manim_code.py {scene_name} --media_dir={self.media_dir} --disable_caching"
                process = await asyncio.create_subprocess_shell(
                    shell_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.work_dir
                )
            
            logger.info(f"Command: {shell_command}")
            logger.info(f"Media directory: {self.media_dir}")
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown Manim error"
                stdout_msg = stdout.decode() if stdout else ""
                logger.error(f"Manim command failed with return code {process.returncode}")
                logger.error(f"STDERR: {error_msg}")
                logger.error(f"STDOUT: {stdout_msg}")
                raise Exception(f"Manim rendering failed: {error_msg}")
            
            logger.info("Manim rendering completed successfully")
            if stdout:
                logger.debug(f"Manim output: {stdout.decode()}")
            
            # Find the generated video file
            video_path = self._find_generated_video(scene_name)
            
            if not video_path:
                raise Exception("Could not locate generated video file")
            
            # Log video file size for verification
            video_size = os.path.getsize(video_path)
            logger.info(f"Generated video found at: {video_path}")
            logger.info(f"Video file size: {video_size} bytes ({video_size/1024/1024:.2f} MB)")
            
            return video_path
            
        except Exception as e:
            logger.error(f"Error in venv execution: {str(e)}")
            raise
    
    def _find_generated_video(self, scene_name: str) -> Optional[str]:
        """
        Search for the generated MP4 file in the media directory
        Cross-platform path handling
        🔧 FIXED: Now excludes partial_movie_files to get the final combined video
        """
        try:
            # Search patterns for Manim output in our media directory
            base_pattern = os.path.join(self.media_dir, "videos")
            
            search_patterns = [
                os.path.join(base_pattern, "**", f"{scene_name}.mp4"),
                os.path.join(base_pattern, "**", "*", f"{scene_name}.mp4"),
                os.path.join(base_pattern, "**", "*", "*", f"{scene_name}.mp4")
            ]
            
            for pattern in search_patterns:
                matches = glob.glob(pattern, recursive=True)
                if matches:
                    # 🔧 FIX: Filter out partial_movie_files directory
                    non_partial_matches = [
                        m for m in matches 
                        if "partial_movie_files" not in m
                    ]
                    
                    if non_partial_matches:
                        # Return the most recent NON-PARTIAL file
                        recent_file = max(non_partial_matches, key=os.path.getctime)
                        logger.info(f"Found final video using pattern {pattern}: {recent_file}")
                        return recent_file
            
            # If no exact match, look for any MP4 files but exclude partials
            logger.info("Exact scene name match not found, searching for any final video...")
            fallback_pattern = os.path.join(base_pattern, "**", "*.mp4")
            matches = glob.glob(fallback_pattern, recursive=True)
            
            if matches:
                # 🔧 FIX: Filter out partial movie files
                non_partial_matches = [
                    m for m in matches 
                    if "partial_movie_files" not in m
                ]
                
                if non_partial_matches:
                    # Return the LARGEST file (final combined video is always largest)
                    largest_file = max(non_partial_matches, key=os.path.getsize)
                    file_size = os.path.getsize(largest_file)
                    logger.warning(f"Using largest non-partial video file: {largest_file} ({file_size/1024/1024:.2f} MB)")
                    return largest_file
                else:
                    logger.error("Only partial movie files found, no final combined video available")
                    # Log what was found for debugging
                    logger.error(f"Partial files found: {matches[:5]}")  # Show first 5
                    return None
            
            logger.error(f"No video files found in {self.media_dir}")
            # List directory contents for debugging
            if os.path.exists(base_pattern):
                logger.error(f"Contents of {base_pattern}: {os.listdir(base_pattern)}")
            return None
            
        except Exception as e:
            logger.error(f"Error finding generated video: {str(e)}")
            return None
    
    def _cleanup_files(self):
        """
        Internal cleanup method - cross-platform
        """
        try:
            # Remove manim_code.py
            if os.path.exists(self.manim_file):
                os.remove(self.manim_file)
                logger.info("Cleaned up manim_code.py")
            
            # Remove media directory and all contents
            if os.path.exists(self.media_dir):
                shutil.rmtree(self.media_dir)
                logger.info("Cleaned up media directory")
                
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            # Don't raise exception for cleanup errors

    def cleanup_after_upload(self):
        """
        Clean up manim_code.py and media directory AFTER video upload
        Call this method manually after successful upload
        """
        self._cleanup_files()
    
    async def test_environment(self) -> dict:
        """
        Test the environment setup - CROSS PLATFORM VERSION
        """
        status = {
            "work_dir": self.work_dir,
            "platform": "Windows" if self.is_windows else "Linux",
            "use_venv": self.use_venv,
            "venv_name": self.venv_name if self.use_venv else "Not used (Docker mode)"
        }
        
        if self.use_venv:
            # Test virtual environment
            if self.is_windows:
                venv_activation_path = os.path.join(self.venv_name, "Scripts", "Activate.ps1")
                test_command = f"{self.venv_name}\\Scripts\\Activate.ps1; python -m manim --version"
                status["venv_exists"] = os.path.exists(venv_activation_path)
                
                try:
                    process = await asyncio.create_subprocess_exec(
                        "powershell", "-Command", test_command,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=self.work_dir
                    )
                    
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode == 0:
                        status["manim_version"] = stdout.decode().strip()
                        status["status"] = "ready"
                    else:
                        status["error"] = stderr.decode().strip()
                        status["status"] = "error"
                        
                except Exception as e:
                    status["error"] = str(e)
                    status["status"] = "error"
            else:
                venv_activation_path = os.path.join(self.venv_name, "bin", "activate")
                test_command = f"source {self.venv_name}/bin/activate && python -m manim --version"
                status["venv_exists"] = os.path.exists(venv_activation_path)
                
                try:
                    process = await asyncio.create_subprocess_shell(
                        test_command,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        cwd=self.work_dir
                    )
                    
                    stdout, stderr = await process.communicate()
                    
                    if process.returncode == 0:
                        status["manim_version"] = stdout.decode().strip()
                        status["status"] = "ready"
                    else:
                        status["error"] = stderr.decode().strip()
                        status["status"] = "error"
                        
                except Exception as e:
                    status["error"] = str(e)
                    status["status"] = "error"
        else:
            # Test direct Python execution (Docker mode)
            try:
                process = await asyncio.create_subprocess_exec(
                    "python", "-m", "manim", "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.work_dir
                )
                
                stdout, stderr = await process.communicate()
                
                if process.returncode == 0:
                    status["manim_version"] = stdout.decode().strip()
                    status["status"] = "ready"
                else:
                    status["error"] = stderr.decode().strip()
                    status["status"] = "error"
                    
            except Exception as e:
                status["error"] = str(e)
                status["status"] = "error"
        
        return status