"use client";

import { useState, useEffect } from "react";

interface PlushieFaceProps {
  isSpeaking: boolean;
  isShaking: boolean;
  deviceOrientation: string;
}

export const PlushieFace = ({
  isSpeaking,
  isShaking,
  deviceOrientation,
}: PlushieFaceProps) => {
  const [blinkState, setBlinkState] = useState(false);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      {/* Main face circle */}
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-400 rounded-full shadow-lg relative">
        {/* Ears */}
        <div className="absolute -top-6 left-8 w-12 h-16 bg-pink-300 rounded-full transform -rotate-12"></div>
        <div className="absolute -top-6 right-8 w-12 h-16 bg-pink-300 rounded-full transform rotate-12"></div>

        {/* Eyes */}
        <div className="absolute top-16 left-12 flex space-x-8">
          <div
            className={`w-8 h-8 bg-black rounded-full transition-all duration-150 ${
              blinkState ? "scale-y-0" : "scale-y-100"
            }`}
          >
            <div className="w-2 h-2 bg-white rounded-full ml-1 mt-1"></div>
          </div>
          <div
            className={`w-8 h-8 bg-black rounded-full transition-all duration-150 ${
              blinkState ? "scale-y-0" : "scale-y-100"
            }`}
          >
            <div className="w-2 h-2 bg-white rounded-full ml-1 mt-1"></div>
          </div>
        </div>

        {/* Mouth */}
        <div
          className={`absolute top-28 left-1/2 transform -translate-x-1/2 transition-all duration-200 ${
            isSpeaking ? "w-8 h-6" : "w-6 h-4"
          } bg-pink-600 rounded-full`}
        >
          {isSpeaking && (
            <div className="w-4 h-3 bg-pink-700 rounded-full mx-auto mt-1"></div>
          )}
        </div>

        {/* Speaking indicator */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 border-4 border-yellow-300 rounded-full animate-ping opacity-30"></div>
            <div className="absolute inset-2 border-2 border-yellow-400 rounded-full animate-pulse"></div>
          </>
        )}

        {/* Shake indicator */}
        {isShaking && (
          <>
            <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-ping opacity-50"></div>
            <div className="absolute inset-1 border-2 border-red-500 rounded-full animate-bounce"></div>
          </>
        )}
      </div>

      {/* Device orientation indicator */}
      {deviceOrientation !== "normal" && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
          📱 {deviceOrientation.replace("-", " ")}
        </div>
      )}
    </div>
  );
};
