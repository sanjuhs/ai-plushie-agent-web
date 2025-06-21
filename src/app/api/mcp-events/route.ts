import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

class EventDrivenMCPClient {
  private childProcess: any = null;
  private messageHandlers: Map<string, (result: any) => void> = new Map();
  private eventHandlers: Set<(event: any) => void> = new Set();
  private messageId = 0;

  async start() {
    if (this.childProcess) {
      return;
    }

    const serverPath = join(process.cwd(), "mcp-server", "event-server.js");
    console.log(
      "[MCP Events] Starting event-driven MCP server at:",
      serverPath
    );

    this.childProcess = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: join(process.cwd(), "mcp-server"),
    });

    this.childProcess.stderr.on("data", (data: Buffer) => {
      console.error("[MCP Server Error]:", data.toString());
    });

    this.childProcess.stdout.on("data", (data: Buffer) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("[MCP]")) {
          console.log("[MCP Server]:", line);
          continue;
        }

        try {
          const message = JSON.parse(line);

          // Handle notifications/events (proactive messages from server)
          if (message.method && message.method.startsWith("notifications/")) {
            console.log("[MCP Event]:", message);
            this.handleEvent(message);
            continue;
          }

          // Handle regular responses
          if (message.id && this.messageHandlers.has(message.id)) {
            const handler = this.messageHandlers.get(message.id);
            if (handler) {
              handler(message);
              this.messageHandlers.delete(message.id);
            }
          }
        } catch (error) {
          // Ignore non-JSON lines
        }
      }
    });

    this.childProcess.on("exit", (code: number) => {
      console.log("[MCP Events] Server process exited with code:", code);
      this.childProcess = null;
    });

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Initialize the MCP connection
    await this.sendMessage({
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: "event-driven-mcp-client",
          version: "1.0.0",
        },
      },
    });
  }

  private getNextId(): string {
    return `msg_${++this.messageId}`;
  }

  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.childProcess) {
        reject(new Error("MCP server not started"));
        return;
      }

      const messageId = message.id;
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error("Request timeout"));
      }, 10000);

      this.messageHandlers.set(messageId, (response) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message || "MCP error"));
        } else {
          resolve(response.result);
        }
      });

      const messageStr = JSON.stringify(message) + "\n";
      console.log("[MCP Events] Sending:", messageStr.trim());
      this.childProcess.stdin.write(messageStr);
    });
  }

  private handleEvent(event: any) {
    // Broadcast event to all registered handlers
    this.eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error("[MCP Events] Error handling event:", error);
      }
    });
  }

  onEvent(handler: (event: any) => void) {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  async listTools() {
    const result = await this.sendMessage({
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "tools/list",
    });
    return result;
  }

  async callTool(name: string, args: any = {}) {
    const result = await this.sendMessage({
      jsonrpc: "2.0",
      id: this.getNextId(),
      method: "tools/call",
      params: {
        name,
        arguments: args,
      },
    });
    return result;
  }

  stop() {
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
    this.messageHandlers.clear();
    this.eventHandlers.clear();
  }
}

// Global event-driven MCP client
let eventMCPClient: EventDrivenMCPClient | null = null;

async function getEventMCPClient(): Promise<EventDrivenMCPClient> {
  if (!eventMCPClient) {
    eventMCPClient = new EventDrivenMCPClient();
    await eventMCPClient.start();
  }
  return eventMCPClient;
}

// GET endpoint for Server-Sent Events (SSE)
export async function GET(request: NextRequest) {
  console.log("[MCP Events API] SSE connection requested");

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const initialData = `data: ${JSON.stringify({
        type: "connection",
        message: "Connected to MCP Events",
        timestamp: new Date().toISOString(),
      })}\n\n`;

      controller.enqueue(encoder.encode(initialData));

      // Set up MCP client and event handler
      getEventMCPClient()
        .then((client) => {
          // Register event handler
          const unsubscribe = client.onEvent((event) => {
            const eventData = `data: ${JSON.stringify({
              type: "mcp_event",
              event: event.method,
              data: event.params,
              timestamp: new Date().toISOString(),
            })}\n\n`;

            try {
              controller.enqueue(encoder.encode(eventData));
            } catch (error) {
              console.log("[MCP Events] Client disconnected");
              unsubscribe();
            }
          });

          // Handle client disconnect
          request.signal.addEventListener("abort", () => {
            console.log("[MCP Events] Client disconnected");
            unsubscribe();
          });
        })
        .catch((error) => {
          console.error("[MCP Events] Failed to start client:", error);
          const errorData = `data: ${JSON.stringify({
            type: "error",
            message: "Failed to connect to MCP server",
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

// POST endpoint for tool calls
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, args } = body;

    if (!tool) {
      return Response.json(
        {
          success: false,
          error: "Tool name is required",
        },
        { status: 400 }
      );
    }

    const client = await getEventMCPClient();
    const result = await client.callTool(tool, args || {});

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[MCP Events API] Error calling tool:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Cleanup on process exit
process.on("exit", () => {
  if (eventMCPClient) {
    eventMCPClient.stop();
  }
});

process.on("SIGINT", () => {
  if (eventMCPClient) {
    eventMCPClient.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (eventMCPClient) {
    eventMCPClient.stop();
  }
  process.exit(0);
});
