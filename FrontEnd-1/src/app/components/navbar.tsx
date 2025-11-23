import { Moon, Sun, Palette, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface NavbarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleColorMode: () => void;
}

export default function Navbar({ isDarkMode, toggleDarkMode, toggleColorMode }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left side - Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm sm:text-base md:text-lg font-bold text-black font-mono dark:text-white"
          >
            <Link href="/">
              <span className="md:hidden cursor-pointer tracking-tighter text-[12px]">video.padhaai</span>
              <span className="hidden md:inline cursor-pointer">video padhaai</span>
            </Link>
          </motion.div>

          {/* Center - Links */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <Link
              href="/community"
              className="text-xs sm:text-sm md:text-base text-neutral-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors font-mono"
            >
              Community
            </Link>

            <a
              href="https://www.youtube.com/@VideoPadhaai"
               target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm md:text-base text-neutral-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400 transition-colors font-mono"
            >
              YouTube
            </a>
          </div>

          {/* Right side - Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark mode toggle */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className="p-1.5 sm:p-2 rounded-lg bg-neutral-400 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              aria-label="Toggle dark mode"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDarkMode ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </motion.div>
            </motion.button>

            {/* GitHub link */}
            <motion.a
              whileTap={{ scale: 0.9 }}
              href="https://github.com/aryan-yadav-100/videopadhai.space"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:p-2 rounded-lg bg-neutral-400 dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-neutral-700 transition-colors"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </motion.a>

            
          </div>
        </div>
      </div>
    </nav>
  );
}
