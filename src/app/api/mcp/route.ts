import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { join } from "path";

class MCPClient {
  private childProcess: any = null;
  private messageHandlers: Map<string, (result: any) => void> = new Map();
  private messageId = 0;

  async start() {
    if (this.childProcess) {
      return; // Already started
    }

    const serverPath = join(process.cwd(), "mcp-server", "server.js");
    console.log("[MCP Client] Starting MCP server at:", serverPath);

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
          const response = JSON.parse(line);
          console.log("[MCP Response]:", response);

          if (response.id && this.messageHandlers.has(response.id)) {
            const handler = this.messageHandlers.get(response.id);
            if (handler) {
              handler(response);
              this.messageHandlers.delete(response.id);
            }
          }
        } catch (error) {
          // Ignore non-JSON lines (like MCP server logs)
        }
      }
    });

    this.childProcess.on("exit", (code: number) => {
      console.log("[MCP Client] Server process exited with code:", code);
      this.childProcess = null;
    });

    // Wait a bit for the server to start
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
          name: "plushie-mcp-client",
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
      console.log("[MCP Client] Sending:", messageStr.trim());
      this.childProcess.stdin.write(messageStr);
    });
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
  }
}

// Global MCP client instance
let mcpClient: MCPClient | null = null;

async function getMCPClient(): Promise<MCPClient> {
  if (!mcpClient) {
    mcpClient = new MCPClient();
    await mcpClient.start();
  }
  return mcpClient;
}

export async function GET(request: NextRequest) {
  try {
    const client = await getMCPClient();
    const tools = await client.listTools();

    return NextResponse.json({
      success: true,
      tools: tools.tools || [],
    });
  } catch (error) {
    console.error("[MCP API] Error listing tools:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, args } = body;

    if (!tool) {
      return NextResponse.json(
        {
          success: false,
          error: "Tool name is required",
        },
        { status: 400 }
      );
    }

    const client = await getMCPClient();
    const result = await client.callTool(tool, args || {});

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("[MCP API] Error calling tool:", error);
    return NextResponse.json(
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
  if (mcpClient) {
    mcpClient.stop();
  }
});

process.on("SIGINT", () => {
  if (mcpClient) {
    mcpClient.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (mcpClient) {
    mcpClient.stop();
  }
  process.exit(0);
});
