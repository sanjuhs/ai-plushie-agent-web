"use client";

interface MCPToolsSectionProps {
  mcpResult: string | null;
  mcpLoading: boolean;
  mcpTools: Array<{ name: string; description?: string }>;
  onCallTool: (toolName: string, args?: Record<string, unknown>) => void;
}

export const MCPToolsSection = ({
  mcpResult,
  mcpLoading,
  mcpTools,
  onCallTool,
}: MCPToolsSectionProps) => {
  return (
    <div className="mt-6">
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <h3 className="text-lg font-bold text-purple-800 mb-3 text-center">
          🔧 Squeaky&apos;s Special Powers (MCP Tools)
        </h3>

        {mcpResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800 font-medium mb-1">
              Latest Result:
            </div>
            <div className="text-sm text-green-700 whitespace-pre-wrap">
              {mcpResult}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onCallTool("hello_world", { name: "Friend" })}
            disabled={mcpLoading}
            className="py-2 px-3 bg-pink-400 hover:bg-pink-500 text-pink-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            👋 Say Hello
          </button>

          <button
            onClick={() => onCallTool("get_time")}
            disabled={mcpLoading}
            className="py-2 px-3 bg-blue-400 hover:bg-blue-500 text-blue-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            🕐 Get Time
          </button>

          <button
            onClick={() => onCallTool("plushie_mood", { action: "get" })}
            disabled={mcpLoading}
            className="py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            😊 Check Mood
          </button>

          <button
            onClick={() =>
              onCallTool("plushie_mood", {
                action: "set",
                mood: "excited",
              })
            }
            disabled={mcpLoading}
            className="py-2 px-3 bg-orange-400 hover:bg-orange-500 text-orange-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            🤩 Set Excited
          </button>

          <button
            onClick={() =>
              onCallTool("plushie_story", {
                theme: "adventure",
                length: "short",
              })
            }
            disabled={mcpLoading}
            className="py-2 px-3 bg-green-400 hover:bg-green-500 text-green-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            📖 Adventure Story
          </button>

          <button
            onClick={() =>
              onCallTool("plushie_story", {
                theme: "mystery",
                length: "short",
              })
            }
            disabled={mcpLoading}
            className="py-2 px-3 bg-purple-400 hover:bg-purple-500 text-purple-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
          >
            🔍 Mystery Story
          </button>
        </div>

        {mcpLoading && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center text-purple-700 text-sm">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Using special powers...
            </div>
          </div>
        )}

        {mcpTools.length > 0 && (
          <div className="mt-3 text-xs text-gray-600 text-center">
            MCP Server: {mcpTools.length} tools loaded
          </div>
        )}
      </div>
    </div>
  );
};
