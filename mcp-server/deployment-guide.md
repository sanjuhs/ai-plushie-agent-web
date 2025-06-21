# 🚀 Production Deployment Guide for MCP Server

## 🤔 Your Question: Localhost vs Production

You're absolutely right! **The current setup only works locally** because:

```javascript
// This won't work in production! ❌
const serverPath = join(process.cwd(), "mcp-server", "server.js");
this.childProcess = spawn("node", [serverPath]);
```

When you deploy to Vercel/Netlify/etc:

- Your Next.js app runs on `https://yourapp.vercel.app`
- But there's no `localhost:3000` to call!
- The MCP server child process approach only works locally

## 🏗️ Production Architecture Options

### Option 1: 🌐 Separate MCP Server Deployment (Recommended)

```
┌─────────────────────┐    HTTPS    ┌─────────────────────┐
│   Next.js App       │◄──────────►│   MCP Server        │
│ (Vercel/Netlify)    │             │ (Railway/Render)    │
│ https://app.com     │             │ https://mcp.com     │
└─────────────────────┘             └─────────────────────┘
```

#### Step 1: Convert MCP Server to HTTP API

Create `mcp-server/http-server.js`:

```javascript
import express from "express";
import cors from "cors";
import { HelloWorldMCPServer } from "./server.js";

const app = express();
app.use(cors());
app.use(express.json());

// Create MCP server instance (not stdio-based)
const mcpServer = new HelloWorldMCPServer();

// HTTP endpoint to list tools
app.get("/tools", async (req, res) => {
  try {
    const tools = await mcpServer.listTools();
    res.json({ success: true, tools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// HTTP endpoint to call tools
app.post("/tools/:toolName", async (req, res) => {
  try {
    const { toolName } = req.params;
    const { args } = req.body;

    const result = await mcpServer.callTool(toolName, args);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP Server running on port ${PORT}`);
});
```

#### Step 2: Update Next.js API Route

```javascript
// src/app/api/mcp/route.ts
const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL || "https://your-mcp-server.railway.app";

export async function GET() {
  const response = await fetch(`${MCP_SERVER_URL}/tools`);
  return Response.json(await response.json());
}

export async function POST(request) {
  const { tool, args } = await request.json();
  const response = await fetch(`${MCP_SERVER_URL}/tools/${tool}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  return Response.json(await response.json());
}
```

#### Step 3: Deploy MCP Server

Deploy to Railway, Render, or DigitalOcean:

```bash
# Deploy to Railway
railway login
railway new
railway up

# Or deploy to Render
# Connect your GitHub repo to Render
# Set build command: npm install
# Set start command: node http-server.js
```

### Option 2: 🔄 Serverless MCP Functions

Convert each MCP tool to a separate serverless function:

```
/api/mcp/hello-world.ts
/api/mcp/get-time.ts
/api/mcp/plushie-mood.ts
/api/mcp/plushie-story.ts
```

Example function:

```javascript
// src/app/api/mcp/hello-world/route.ts
export async function POST(request: Request) {
  const { name } = await request.json();
  const message = `Hello, ${name}! 🌟 Squeaky the plushie says hi!`;

  return Response.json({
    success: true,
    result: {
      content: [{ type: "text", text: message }],
    },
  });
}
```

### Option 3: 📦 Docker Container

Create `mcp-server/Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["node", "http-server.js"]
```

Deploy to:

- **Railway**: Connect GitHub repo
- **Render**: Web service from Docker
- **AWS ECS**: Container service
- **Google Cloud Run**: Serverless containers

## 🌍 Environment Variables

### Next.js App (.env.local):

```bash
MCP_SERVER_URL=https://your-mcp-server.railway.app
```

### MCP Server (.env):

```bash
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-nextjs-app.vercel.app
```

## 🔧 Production Refactoring Steps

### 1. **Modify MCP Server for HTTP**

```javascript
// mcp-server/server.js - Add HTTP mode
class HelloWorldMCPServer {
  constructor(mode = "stdio") {
    this.mode = mode;
    if (mode === "stdio") {
      this.setupStdioServer();
    } else {
      this.setupHTTPMode();
    }
  }

  setupHTTPMode() {
    // Direct method calls instead of JSON-RPC
    this.tools = {
      hello_world: this.handleHelloWorld.bind(this),
      plushie_mood: this.handlePlushieMood.bind(this),
      plushie_story: this.handlePlushieStory.bind(this),
      get_time: this.handleGetTime.bind(this),
    };
  }

  async listTools() {
    return Object.keys(this.tools).map((name) => ({
      name,
      description: this.getToolDescription(name),
    }));
  }

  async callTool(name, args) {
    if (!this.tools[name]) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return this.tools[name](args);
  }
}
```

### 2. **Create HTTP Wrapper**

```javascript
// mcp-server/http-server.js
import express from "express";
import { HelloWorldMCPServer } from "./server.js";

const app = express();
const mcpServer = new HelloWorldMCPServer("http");

app.get("/tools", async (req, res) => {
  const tools = await mcpServer.listTools();
  res.json({ tools });
});

app.post("/tools/:name", async (req, res) => {
  try {
    const result = await mcpServer.callTool(req.params.name, req.body.args);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 3. **Update Next.js Client**

```javascript
// src/app/api/mcp/route.ts
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;

export async function GET() {
  const response = await fetch(`${MCP_SERVER_URL}/tools`);
  const data = await response.json();
  return Response.json(data);
}

export async function POST(request: Request) {
  const { tool, args } = await request.json();
  const response = await fetch(`${MCP_SERVER_URL}/tools/${tool}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });
  const data = await response.json();
  return Response.json(data);
}
```

## 🚀 Deployment Commands

### Railway (Recommended for MCP Server):

```bash
cd mcp-server
railway login
railway new
railway add
railway up
railway domain  # Get your domain
```

### Vercel (For Next.js App):

```bash
cd ..  # Back to main project
vercel login
vercel  # Deploy
vercel env add MCP_SERVER_URL  # Add your Railway URL
```

## 💰 Cost Considerations

### Free Tier Options:

- **Railway**: 500 hours/month free
- **Render**: 750 hours/month free
- **Vercel**: Unlimited for hobby projects
- **Netlify**: 100GB bandwidth free

### Estimated Monthly Costs:

- **Hobby Project**: $0 (free tiers)
- **Small Business**: $5-20 (Railway + Vercel Pro)
- **Production**: $50+ (dedicated resources)

## 🔒 Security Best Practices

1. **API Keys**: Store in environment variables
2. **CORS**: Restrict to your domain only
3. **Rate Limiting**: Prevent abuse
4. **Authentication**: Add API key verification
5. **HTTPS**: Always use SSL in production

## 📝 Summary

**For Production Deployment:**

1. ✅ **Convert MCP server to HTTP API** (not stdio)
2. ✅ **Deploy MCP server separately** (Railway/Render)
3. ✅ **Deploy Next.js app** (Vercel/Netlify)
4. ✅ **Configure environment variables**
5. ✅ **Update API calls to use HTTPS URLs**

The localhost approach is **development-only**. For production, you need separate deployments with HTTP communication between services.

This gives you the same functionality but properly scaled for the web! 🌐
