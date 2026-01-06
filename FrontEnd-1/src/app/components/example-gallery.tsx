'use client'

import { IBM_Plex_Mono } from "next/font/google";
import { useState } from "react";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
});

type VideoCardProps = {
  url: string;
  title: string;
};

const VideoCard = ({ url, title }: VideoCardProps) => {
  const [play, setPlay] = useState(false);

  return (
    <div
      className="relative p-[0px]"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="w-100 border overflow-hidden shadow-md bg-white cursor-pointer relative"
        onClick={() => setPlay(true)}
      >
        {play ? (
          <video controls autoPlay className="w-100 h-65">
            <source src={url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="relative w-100 h-65 flex flex-col items-center justify-center bg-neutral-200">
            <span className="text-sm font-semibold">{title}</span>

            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="white"
                  viewBox="0 0 24 24"
                  className="w-6 h-6"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const ExampleGallery = () => {
  return (
    <div className="w-4xl flex flex-col items-center">
      <h1
        className={`text-2xl text-black text-center font-bold ${ibmPlexMono.className}`}
      >
        Example Gallery
      </h1>

      {/* First container */}
      <div className="w-4xl border-2 border-neutral-300 py-10 flex gap-6 justify-center mt-10">
        <VideoCard url="/BatteryAnimation.mp4" title="Example 1" />
        <VideoCard url="/videos/example2.mp4" title="Example 2" />
      </div>

      {/* Second container */}
      <div className="w-4xl border-b-2 border-r-2 border-l-2 border-neutral-300 p-6 flex gap-6 justify-center">
        <VideoCard url="/videos/example3.mp4" title="Example 3" />
        <VideoCard url="/videos/example4.mp4" title="Example 4" />
      </div>
    </div>
  );
};

export default ExampleGallery;
