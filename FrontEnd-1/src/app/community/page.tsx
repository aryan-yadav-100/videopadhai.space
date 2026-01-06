"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/navbar";

interface CommunityVideo {
  id: number;
  youtubeUrl: string;
  userName: string;
  title: string;
}

// Placeholder data - Replace YouTube URLs with actual links
const communityVideos: CommunityVideo[] = [
  {
    id: 1,
    youtubeUrl: "PASTE_YOUTUBE_LINK_1",
    userName: "Learning Enthusiast",
    title: "User's Learning Video #1",
  },
  {
    id: 2,
    youtubeUrl: "PASTE_YOUTUBE_LINK_2",
    userName: "Curious Learner",
    title: "User's Learning Video #2",
  },
  {
    id: 3,
    youtubeUrl: "PASTE_YOUTUBE_LINK_3",
    userName: "Knowledge Seeker",
    title: "User's Learning Video #3",
  },
  {
    id: 4,
    youtubeUrl: "PASTE_YOUTUBE_LINK_4",
    userName: "Study Master",
    title: "User's Learning Video #4",
  },
  {
    id: 5,
    youtubeUrl: "PASTE_YOUTUBE_LINK_5",
    userName: "Edu Explorer",
    title: "User's Learning Video #5",
  },
  {
    id: 6,
    youtubeUrl: "PASTE_YOUTUBE_LINK_6",
    userName: "Brain Trainer",
    title: "User's Learning Video #6",
  },
  {
    id: 7,
    youtubeUrl: "PASTE_YOUTUBE_LINK_7",
    userName: "Smart Student",
    title: "User's Learning Video #7",
  },
  {
    id: 8,
    youtubeUrl: "PASTE_YOUTUBE_LINK_8",
    userName: "Quick Learner",
    title: "User's Learning Video #8",
  },
  {
    id: 9,
    youtubeUrl: "PASTE_YOUTUBE_LINK_9",
    userName: "Wisdom Seeker",
    title: "User's Learning Video #9",
  },
  {
    id: 10,
    youtubeUrl: "PASTE_YOUTUBE_LINK_10",
    userName: "Concept Master",
    title: "User's Learning Video #10",
  },
  {
    id: 11,
    youtubeUrl: "PASTE_YOUTUBE_LINK_11",
    userName: "Knowledge Hunter",
    title: "User's Learning Video #11",
  },
  {
    id: 12,
    youtubeUrl: "PASTE_YOUTUBE_LINK_12",
    userName: "Study Buddy",
    title: "User's Learning Video #12",
  },
  {
    id: 13,
    youtubeUrl: "PASTE_YOUTUBE_LINK_13",
    userName: "Edu Enthusiast",
    title: "User's Learning Video #13",
  },
  {
    id: 14,
    youtubeUrl: "PASTE_YOUTUBE_LINK_14",
    userName: "Learning Pro",
    title: "User's Learning Video #14",
  },
  {
    id: 15,
    youtubeUrl: "PASTE_YOUTUBE_LINK_15",
    userName: "Insight Finder",
    title: "User's Learning Video #15",
  },
  {
    id: 16,
    youtubeUrl: "PASTE_YOUTUBE_LINK_16",
    userName: "Knowledge Ninja",
    title: "User's Learning Video #16",
  },
];

export default function CommunityPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load dark mode from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const toggleColorMode = () => {
    // Placeholder for color mode toggle
  };

  // Extract YouTube video ID from URL
  const getYoutubeEmbedUrl = (url: string) => {
    let videoId = "";

    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1]?.split("&")[0] || "";
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0] || "";
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
      <Navbar
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleColorMode={toggleColorMode}
      />

      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white font-mono mb-4 tracking-tighter">
              Community Gallery
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-mono tracking-tighter">
              Explore videos created by our learning community
            </p>
          </div>

          {/* Video Grid - 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {communityVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Video Player */}
                <div className="relative aspect-video bg-neutral-900">
                  <iframe
                    src={getYoutubeEmbedUrl(video.youtubeUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                  />
                </div>

                {/* Video Info */}
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 font-mono tracking-tighter">
                    {video.title}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                    Created by: <span className="text-orange-500 font-semibold">{video.userName}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-12"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-500 font-mono">
              More community videos coming soon!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}