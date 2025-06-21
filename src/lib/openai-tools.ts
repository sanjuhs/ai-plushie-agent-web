// OpenAI Function Calling Tools for Squeaky the Plushie

export interface OpenAITool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// Define available tools
export const openaiTools: OpenAITool[] = [
  {
    type: "function",
    name: "get_current_weather",
    description:
      "Get the current weather for a specific location. This is Squeaky's special weather sensing ability!",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "The city or location to get weather for (e.g., 'Bengaluru', 'New York')",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit preference",
        },
      },
      required: ["location"],
    },
  },
];

// Tool execution functions
export const executeOpenAITool = async (
  toolCall: ToolCall
): Promise<string> => {
  const { name, arguments: argsString } = toolCall.function;

  try {
    const args = JSON.parse(argsString);

    switch (name) {
      case "get_current_weather":
        return await getCurrentWeather(args.location, args.unit);

      default:
        return `Sorry, I don't know how to use the tool "${name}" yet!`;
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return `Oops! I had trouble using my ${name} ability. Let me try again later!`;
  }
};

// Individual tool implementations
async function getCurrentWeather(
  location: string,
  unit: string = "celsius"
): Promise<string> {
  // Hardcoded test response for Bengaluru as requested
  const normalizedLocation = location.toLowerCase();

  if (
    normalizedLocation.includes("bengaluru") ||
    normalizedLocation.includes("bangalore")
  ) {
    const temp = unit === "fahrenheit" ? "77°F" : "25°C";
    return `🌤️ Oh my whiskers! The weather in Bengaluru is lovely today! It's ${temp} and cloudy with a gentle breeze. Perfect weather for a plushie adventure! The clouds look like fluffy cotton balls floating in the sky! 🌤️`;
  }

  // For other locations, provide a friendly response
  const temp = unit === "fahrenheit" ? "72°F" : "22°C";
  return `🌤️ The weather in ${location} is nice today! It's about ${temp} and partly cloudy. What a wonderful day to be outside! 🌤️`;
}

// Helper function to format tool calls for OpenAI session update
export const getToolsForSession = () => {
  return openaiTools;
};

// Helper function to create tool call response event
export const createToolCallResponse = (toolCallId: string, result: string) => {
  return {
    type: "conversation.item.create",
    event_id: `function_output_${Date.now()}`,
    item: {
      type: "function_call_output",
      call_id: toolCallId,
      output: result,
    },
  };
};
