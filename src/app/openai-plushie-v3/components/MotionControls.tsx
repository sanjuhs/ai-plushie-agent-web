"use client";

interface MotionControlsProps {
  motionPermission: string;
  isShaking: boolean;
  deviceOrientation: string;
  onRequestPermission: () => void;
}

export const MotionControls = ({
  motionPermission,
  isShaking,
  deviceOrientation,
  onRequestPermission,
}: MotionControlsProps) => {
  return (
    <>
      {/* Motion Permission Button (iOS only) */}
      {motionPermission === "unknown" && (
        <div className="text-center mb-4">
          <button
            onClick={onRequestPermission}
            className="w-full py-3 px-4 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-medium text-sm active:scale-95 transition-all"
          >
            📱 Enable Motion Detection
          </button>
        </div>
      )}

      {/* Motion Status Display */}
      {motionPermission === "granted" && (
        <div className="bg-green-50 rounded-xl p-3 mb-4 text-center">
          <div className="text-sm text-green-800">
            📱 Motion Detection: <span className="font-medium">Active</span>
          </div>
          {isShaking && (
            <div className="text-xs text-red-600 font-medium mt-1">
              🎲 Shaking detected!
            </div>
          )}
          {deviceOrientation !== "normal" && (
            <div className="text-xs text-blue-600 font-medium mt-1">
              📱 {deviceOrientation.replace("-", " ")}
            </div>
          )}
        </div>
      )}
    </>
  );
};
