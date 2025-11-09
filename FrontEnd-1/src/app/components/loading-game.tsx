"use client";

import React from "react";

const LoadingGame: React.FC = () => {
  return (
    <div className="absolute w-3/5 h-1/2 z-[999] overflow-hidden">
      <iframe
        src="https://chromedino.com/joker/"
        frameBorder="0"
        scrolling="no"
        loading="lazy"
        className="w-full h-[100%] -mt-25 border-none block"
      />
    </div>
  );
};

export default LoadingGame;
