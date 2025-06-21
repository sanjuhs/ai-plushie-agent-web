# MCP (Model Context Protocol) - Complete Explanation

## 🤔 What is MCP?

**Model Context Protocol (MCP)** is a standardized way for AI applications to communicate with external tools and services. Think of it as a "universal translator" that allows AI models to:

- Call external functions
- Access databases
- Interact with APIs
- Run system commands
- And much more!

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Client     │◄──►│   MCP Server     │◄──►│  External Tools │
│  (Your App)     │    │  (This Server)   │    │  (APIs, DBs,    │
│                 │    │                  │    │   Files, etc.)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Communication Flow:

1. **Client** asks: "What tools do you have?"
2. **Server** responds: "I have hello_world, get_time, plushie_mood..."
3. **Client** requests: "Call hello_world with name='Alice'"
4. **Server** executes the tool and returns the result

## 📡 MCP Protocol Basics

MCP uses **JSON-RPC 2.0** over **stdio** (standard input/output). Every message has this structure:

```json
{
  "jsonrpc": "2.0",
  "id": "unique_message_id",
  "method": "method_name",
  "params": {
    /* parameters */
  }
}
```

## 🔧 Building an MCP Server - Step by Step

### Step 1: Install the SDK

```bash
npm install @modelcontextprotocol/sdk
```

### Step 2: Import Required Components

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
```

### Step 3: Create the Server Class

```javascript
class MyMCPServer {
  constructor() {
    // Create server instance with metadata
    this.server = new Server(
      {
        name: "my-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {}, // Declare that this server provides tools
        },
      }
    );
  }
}
```

### Step 4: Define Available Tools

```javascript
setupToolHandlers() {
  // Handle "list tools" request
  this.server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "my_tool",
          description: "What this tool does",
          inputSchema: {
            type: "object",
            properties: {
              param1: {
                type: "string",
                description: "Parameter description"
              }
            },
            required: ["param1"]
          }
        }
      ]
    };
  });
}
```

### Step 5: Handle Tool Calls

```javascript
// Handle "call tool" request
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "my_tool":
      return {
        content: [
          {
            type: "text",
            text: `Result from my_tool with ${args.param1}`,
          },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### Step 6: Start the Server

```javascript
async start() {
  const transport = new StdioServerTransport();
  await this.server.connect(transport);
  console.log("MCP Server ready!");
}
```

## 🔄 Two-Way Communication Explained

### Client → Server Messages:

1. **initialize** - Establish connection
2. **tools/list** - "What tools do you have?"
3. **tools/call** - "Execute this tool with these parameters"

### Server → Client Messages:

1. **initialize response** - "I'm ready, here are my capabilities"
2. **tools/list response** - "Here are all my available tools"
3. **tools/call response** - "Here's the result of that tool call"

### Message Flow Example:

```
Client: {"jsonrpc":"2.0","id":"1","method":"tools/list"}
Server: {"jsonrpc":"2.0","id":"1","result":{"tools":[...]}}

Client: {"jsonrpc":"2.0","id":"2","method":"tools/call","params":{"name":"hello_world","arguments":{"name":"Alice"}}}
Server: {"jsonrpc":"2.0","id":"2","result":{"content":[{"type":"text","text":"Hello, Alice!"}]}}
```

## 🖥️ Our Implementation Breakdown

### 1. **MCP Server** (`server.js`)

```javascript
class HelloWorldMCPServer {
  constructor() {
    // Server setup with capabilities
    this.server = new Server(/* config */);
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Define 4 tools: hello_world, plushie_mood, plushie_story, get_time
    this.server.setRequestHandler(ListToolsRequestSchema /* ... */);
    this.server.setRequestHandler(CallToolRequestSchema /* ... */);
  }

  // Individual tool implementations
  handleHelloWorld(args) {
    /* ... */
  }
  handlePlushieMood(args) {
    /* ... */
  }
  handlePlushieStory(args) {
    /* ... */
  }
  handleGetTime(args) {
    /* ... */
  }
}
```

### 2. **Next.js API Bridge** (`/api/mcp/route.ts`)

```javascript
class MCPClient {
  async start() {
    // Spawn MCP server as child process
    this.childProcess = spawn("node", ["server.js"]);

    // Handle stdout messages (responses from MCP server)
    this.childProcess.stdout.on("data" /* parse JSON responses */);
  }

  async sendMessage(message) {
    // Send JSON-RPC message to MCP server via stdin
    this.childProcess.stdin.write(JSON.stringify(message) + "\n");

    // Wait for response via stdout
    return new Promise(/* ... */);
  }
}
```

### 3. **Frontend Integration** (React)

```javascript
// Load available tools
const loadMCPTools = async () => {
  const response = await fetch("/api/mcp");
  const data = await response.json();
  setMcpTools(data.tools);
};

// Call a specific tool
const callMCPTool = async (toolName, args) => {
  const response = await fetch("/api/mcp", {
    method: "POST",
    body: JSON.stringify({ tool: toolName, args }),
  });
  const result = await response.json();
  setMcpResult(result.result.content[0].text);
};
```

## 📊 Data Flow Diagram

```
Frontend Button Click
       ↓
   fetch('/api/mcp', {method: 'POST', body: {tool: 'hello_world', args: {...}}})
       ↓
Next.js API Route (/api/mcp/route.ts)
       ↓
MCPClient.callTool('hello_world', args)
       ↓
JSON-RPC message via stdin → MCP Server (server.js)
       ↓
HelloWorldMCPServer.handleHelloWorld(args)
       ↓
Return result via stdout ← MCP Server
       ↓
MCPClient receives response
       ↓
API Route returns JSON response
       ↓
Frontend displays result
```

## 🎯 Key Requirements for MCP Server

### 1. **Dependencies**

```json
{
  "@modelcontextprotocol/sdk": "^0.5.0"
}
```

### 2. **Communication Protocol**

- **Transport**: stdio (stdin/stdout)
- **Format**: JSON-RPC 2.0
- **Encoding**: UTF-8 with newline delimiters

### 3. **Required Handlers**

- `initialize` - Connection setup
- `tools/list` - List available tools
- `tools/call` - Execute tools

### 4. **Tool Response Format**

```javascript
{
  content: [
    {
      type: "text",
      text: "Your result here",
    },
  ];
}
```

## 🚀 Why This Architecture Works

1. **Separation of Concerns**: MCP server handles business logic, API handles communication
2. **Scalability**: MCP server can be deployed independently
3. **Security**: Server-side execution prevents client-side vulnerabilities
4. **Flexibility**: Easy to add new tools without changing the client
5. **Standardization**: Uses official MCP protocol for compatibility

## 🔐 Security Considerations

- MCP server runs server-side (secure)
- No direct client access to MCP server
- All requests go through authenticated API routes
- Input validation on both API and MCP server layers

This architecture provides a robust, scalable, and secure way to extend your AI application with custom tools and capabilities!
