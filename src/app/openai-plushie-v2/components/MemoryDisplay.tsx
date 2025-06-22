"use client";

interface MemoryDisplayProps {
  isConnected: boolean;
  onCallTool: (toolName: string, args?: Record<string, unknown>) => void;
}

export const MemoryDisplay = ({
  isConnected,
  onCallTool,
}: MemoryDisplayProps) => {
  const handleRecallMemories = () => {
    if (isConnected) {
      onCallTool("recall_user_info");
    }
  };

  if (!isConnected) return null;

  return (
    <div className="mt-4">
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <h3 className="text-lg font-bold text-purple-800 mb-3 text-center">
          🧠 Memory Center
        </h3>
        <div className="text-center space-y-3">
          <p className="text-sm text-purple-600">
            I remember everything you tell me during our conversation!
          </p>

          <button
            onClick={handleRecallMemories}
            className="w-full py-3 px-4 bg-purple-400 hover:bg-purple-500 text-white rounded-xl font-medium text-sm active:scale-95 transition-all"
          >
            🧠 What do you remember about me?
          </button>

          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded-lg text-gray-600">
              <strong>Try saying:</strong>
              <br />
              &quot;Remember that I love pizza&quot;
              <br />
              &quot;My birthday is in March&quot;
              <br />
              &quot;I work as a teacher&quot;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
