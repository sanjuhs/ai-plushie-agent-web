# OpenAI Function Calling in Squeaky Plushie

## Overview

Squeaky now has special abilities through OpenAI's function calling feature! This allows the AI to use tools and provide more interactive experiences.

## Current Functions

### 🌤️ Weather Function

- **Function Name**: `get_current_weather`
- **Purpose**: Get weather information for any location
- **Test Command**: Ask Squeaky "What's the weather in Bengaluru?"
- **Response**: Returns a hardcoded cloudy weather response for Bengaluru (25°C/77°F)

## How It Works

### 1. Tool Definition (`src/lib/openai-tools.ts`)

- Tools are defined with OpenAI's function calling schema
- Each tool has a name, description, and parameters
- Tools are modular and easy to extend

### 2. Integration (`src/app/openai-plushie-unicorn/page.tsx`)

- Tools are added to the OpenAI session configuration
- Function calls are handled in the WebRTC data channel message handler
- Results are sent back to OpenAI for natural language response

### 3. Function Call Flow

1. User asks about weather
2. OpenAI decides to call the `get_current_weather` function
3. App receives function call event
4. App executes the function locally
5. App sends result back to OpenAI
6. OpenAI generates natural language response with the weather data
7. Squeaky speaks the response

## Testing

1. Start the app and connect to Squeaky
2. Ask: "What's the weather like in Bengaluru?"
3. Watch the console for function call logs:
   - `🔧 [FUNCTION CALL] Squeaky wants to use a tool:`
   - `✅ [FUNCTION CALL] Tool result:`
4. Squeaky should respond with weather information in character

## Adding New Functions

1. Add new tool definition to `openaiTools` array in `src/lib/openai-tools.ts`
2. Add case handler in `executeOpenAITool` function
3. Implement the actual function logic
4. Update system prompt to mention the new ability

## Example Function Call Response

```
🌤️ Oh my whiskers! The weather in Bengaluru is lovely today! It's 25°C and cloudy with a gentle breeze. Perfect weather for a plushie adventure! The clouds look like fluffy cotton balls floating in the sky! 🌤️
```

## Console Logs to Watch For

- `🔧 [FUNCTION CALL] Squeaky wants to use a tool:`
- `✅ [FUNCTION CALL] Tool result:`
- Function call data and results in browser console

## Notes

- Function calling works only when Squeaky is connected
- Current weather function returns hardcoded data for testing
- Future functions can be added for time, jokes, stories, games, etc.
