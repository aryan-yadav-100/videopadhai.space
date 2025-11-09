"use client";
import { motion } from "framer-motion";
import { Download, Youtube } from 'lucide-react';

interface VideoRenderProps {
  prompt: string;
  language: string;
  videoUrl?: string;
  youtubeUrl?: string;
}

export default function VideoRender({videoUrl, youtubeUrl }: VideoRenderProps) {
  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleYoutubeOpen = () => {
    if (youtubeUrl) {
      window.open(youtubeUrl, '_blank');
    }
  };

  // Extract YouTube video ID from URL
  const getYoutubeEmbedUrl = (url: string) => {
    // Handle different YouTube URL formats
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900 py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-2xl font-bold text-neutral-800 dark:text-neutral-200 font-mono">
            Your Video
          </h1>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        >
          <div className="relative aspect-video bg-neutral-900">
            {youtubeUrl ? (
              // YouTube embed for quick prompts
              <iframe
                src={getYoutubeEmbedUrl(youtubeUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : videoUrl ? (
              // Regular video player
              <video
                src={videoUrl}
                controls
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              // Placeholder
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-24 h-24 mx-auto bg-neutral-800 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-neutral-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-neutral-400 font-mono text-sm">Video Preview</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownload}
              className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-mono text-base sm:text-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Download size={24} />
              Download Video
            </motion.button>

            {youtubeUrl && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleYoutubeOpen}
                className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-mono text-base sm:text-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Youtube size={24} />
                Watch on YouTube
              </motion.button>
            )}

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <p className="text-xs text-center text-neutral-500 dark:text-neutral-500 font-mono">
                Video created successfully
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <button
            onClick={() => window.location.href = '/'}
            className="text-orange-500 hover:text-orange-600 font-mono text-sm underline cursor-pointer"
          >
            Create Another Video
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}