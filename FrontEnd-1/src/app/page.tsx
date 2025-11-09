'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import Navbar from "./components/navbar";
import Hero from "./components/hero";
import Chat from "./components/chat";

// Animation variants
const itemVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.25, 0, 1] }
  }
};

const heroHiddenVariants: Variants = {
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.25, 0, 1] }
  },
  hidden: {
    opacity: 0,
    y: -50,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const chatVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: "easeOut", delay: 0.5 }
  }
};

export default function Home(): React.JSX.Element {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorMode, setColorMode] = useState<'orange' | 'blue' | 'green'>('orange');
  const [isChatActive, setIsChatActive] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleColorMode = () => {
    const modes: Array<'orange' | 'blue' | 'green'> = ['orange', 'blue', 'green'];
    const nextIndex = (modes.indexOf(colorMode) + 1) % modes.length;
    setColorMode(modes[nextIndex]);
  };

  const handleChatActivate = () => {
    setIsChatActive(true);
  };

  return (
    <div className="relative min-h-screen transition-colors duration-300 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* Light mode grid */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.15) , transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.15) , transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Dark mode grid */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Light mode fade overlay */}
        <div
          className="absolute inset-0 dark:hidden pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0) 10%, rgba(255,255,255,1) 35%)',
          }}
        />

        {/* Dark mode fade overlay */}
        <div
          className="absolute inset-0 hidden dark:block pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,1) 35%)',
          }}
        />
      </div>

      {/* Navbar */}
      <Navbar
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleColorMode={toggleColorMode}
      />

      {/* Hero Section */}
      <motion.div
        variants={heroHiddenVariants}
        initial="visible"
        animate={isChatActive ? "hidden" : "visible"}
        style={{ pointerEvents: isChatActive ? 'none' : 'auto' }}
        className="relative z-10"
      >
        <Hero />
      </motion.div>

      {/* Chat Section */}
      <motion.div
        className="relative z-10"
        variants={chatVariants}
        initial="initial"
        animate="animate"
      >
        <Chat onChatActivate={handleChatActivate} />
      </motion.div>

    {/* SVG OVAL FRONT LAYER WITH HALO GLOW */}
      <div className="fixed bottom-[-25%] left-1/2 -translate-x-1/2 z-[9] w-[100vw] overflow-visible flex justify-center pointer-events-none hidden md:flex">
        <div className="scale-[2] relative">
          {/* Halo Glow Effect - Only visible above the oval */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              top: '-80px',
              width: '979px',
              height: '200px',
            }}
          >
            <div 
              className="w-full h-full"
              style={{
                background: 'radial-gradient(ellipse 50% 100% at 50% 100%, rgba(255, 94, 0, 0.4) 0%, rgba(255, 170, 105, 0.3) 20%, rgba(255, 205, 154, 0.15) 40%, rgba(255, 232, 200, 0.08) 60%, transparent 80%)',
                filter: 'blur(30px)',
                maskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
              }}
            />
          </div>
          
          {/* SVG Oval */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="979" 
            height="317" 
            viewBox="0 0 979 317" 
            fill="none"
          >
            <motion.path 
              d="M2 152C2 131.951 15.0899 112.479 39.6514 94.4473C64.1718 76.4455 99.7811 60.1494 143.964 46.4297C232.306 18.9976 354.472 2 489.5 2C624.528 2 746.694 18.9976 835.036 46.4297C879.219 60.1494 914.828 76.4455 939.349 94.4473C963.91 112.479 977 131.951 977 152C977 172.049 963.91 191.521 939.349 209.553C914.828 227.554 879.219 243.851 835.036 257.57C746.694 285.002 624.528 302 489.5 302C354.472 302 232.306 285.002 143.964 257.57C99.7811 243.851 64.1718 227.554 39.6514 209.553C15.0899 191.521 2 172.049 2 152Z" 
              stroke="#FF5E00" 
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
            />
            <motion.path 
              d="M2 156C2 135.951 15.0899 116.479 39.6514 98.4473C64.1718 80.4455 99.7811 64.1494 143.964 50.4297C232.306 22.9976 354.472 6 489.5 6C624.528 6 746.694 22.9976 835.036 50.4297C879.219 64.1494 914.828 80.4455 939.349 98.4473C963.91 116.479 977 135.951 977 156C977 176.049 963.91 195.521 939.349 213.553C914.828 231.554 879.219 247.851 835.036 261.57C746.694 289.002 624.528 306 489.5 306C354.472 306 232.306 289.002 143.964 261.57C99.7811 247.851 64.1718 231.554 39.6514 213.553C15.0899 195.521 2 176.049 2 156Z" 
              stroke="#FFAA69" 
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.4 }}
            />
            <motion.path 
              d="M1.5 160C1.5 139.717 14.7418 120.114 39.3555 102.044C63.9383 83.9964 99.6065 67.6802 143.816 53.9521C232.218 26.5015 354.436 9.5 489.5 9.5C624.564 9.5 746.782 26.5015 835.184 53.9521C879.393 67.6802 915.062 83.9964 939.645 102.044C964.258 120.114 977.5 139.717 977.5 160C977.5 180.283 964.258 199.886 939.645 217.956C915.062 236.004 879.393 252.32 835.184 266.048C746.782 293.498 624.564 310.5 489.5 310.5C354.436 310.5 232.218 293.498 143.816 266.048C99.6065 252.32 63.9383 236.004 39.3555 217.956C14.7418 199.886 1.5 180.283 1.5 160Z" 
              stroke="#FFCD9A" 
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.6 }}
            />
            <motion.path 
              d="M1 163C1 142.482 14.3938 122.749 39.0596 104.641C63.7048 86.5473 99.4312 70.2111 143.668 56.4746C232.13 29.0053 354.4 12 489.5 12C624.6 12 746.87 29.0053 835.332 56.4746C879.569 70.2111 915.295 86.5473 939.94 104.641C964.606 122.749 978 142.482 978 163C978 183.518 964.606 203.251 939.94 221.359C915.295 239.453 879.569 255.789 835.332 269.525C746.87 296.995 624.6 314 489.5 314C354.4 314 232.13 296.995 143.668 269.525C99.4312 255.789 63.7048 239.453 39.0596 221.359C14.3938 203.251 1 183.518 1 163Z" 
              stroke="#FFE8C8" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 0.8 }}
            />
            <motion.path 
              d="M0.5 165C0.5 144.248 14.0458 124.384 38.7637 106.237C63.4713 88.0982 99.2558 71.7419 143.52 57.9971C232.042 30.5091 354.364 13.5 489.5 13.5C624.636 13.5 746.958 30.5091 835.48 57.9971C879.744 71.7419 915.529 88.0982 940.236 106.237C964.954 124.384 978.5 144.248 978.5 165C978.5 185.752 964.954 205.616 940.236 223.763C915.529 241.902 879.744 258.258 835.48 272.003C746.958 299.491 624.636 316.5 489.5 316.5C354.364 316.5 232.042 299.491 143.52 272.003C99.2558 258.258 63.4713 241.902 38.7637 223.763C14.0458 205.616 0.5 185.752 0.5 165Z" 
              stroke="#FCE4AF"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut", delay: 1 }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
