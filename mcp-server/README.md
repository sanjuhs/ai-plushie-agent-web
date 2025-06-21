# Hello World MCP Server for AI Companion Plushie

This is a Model Context Protocol (MCP) server that provides special tools and capabilities for the AI Companion Plushie project.

## Features

The MCP server provides the following tools:

### 🌟 Core Tools

- **hello_world** - Says hello to the world or a specific name
- **get_time** - Get current time and date in 12h or 24h format

### 🐭 Plushie-Specific Tools

- **plushie_mood** - Get or set the plushie's emotional state (happy, excited, sleepy, playful, curious)
- **plushie_story** - Generate themed stories for the plushie (adventure, mystery) in different lengths

## Installation & Usage

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. For development with auto-reload:

```bash
npm run dev
```

## Integration

The MCP server communicates with the Next.js frontend through:

- **API Route**: `/api/mcp` - Handles communication between frontend and MCP server
- **Client Integration**: Embedded in the OpenAI Plushie page with interactive buttons

## API Examples

### List available tools:

```bash
curl -X GET http://localhost:3000/api/mcp
```

### Call a tool:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"hello_world","args":{"name":"Friend"}}'
```

### Set plushie mood:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"plushie_mood","args":{"action":"set","mood":"excited"}}'
```

### Generate a story:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"plushie_story","args":{"theme":"adventure","length":"short"}}'
```

## Architecture

```
Frontend (React) ←→ Next.js API Route ←→ MCP Server (Node.js)
                    /api/mcp              server.js
```

The MCP server runs as a separate Node.js process and communicates via stdio with the Next.js application through the API route bridge.

## Logs

The MCP server provides detailed console logging with `[MCP]` prefixes for easy debugging and monitoring of tool calls and responses.
