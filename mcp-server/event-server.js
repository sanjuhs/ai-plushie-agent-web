#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

class EventDrivenMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "event-driven-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          notifications: {}, // Enable notifications capability
        },
      }
    );

    // Event state
    this.isMonitoring = false;
    this.temperature = 20; // Simulated temperature
    this.intervalId = null;
    this.subscribers = new Set(); // Track connected clients

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "hello_world",
            description: "Says hello to the world or a specific name",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name to greet (optional)",
                  default: "World",
                },
              },
            },
          },
          {
            name: "start_monitoring",
            description: "Start temperature monitoring with periodic updates",
            inputSchema: {
              type: "object",
              properties: {
                interval: {
                  type: "number",
                  description: "Update interval in seconds",
                  default: 5,
                },
                threshold: {
                  type: "number",
                  description: "Temperature threshold for alerts",
                  default: 25,
                },
              },
            },
          },
          {
            name: "stop_monitoring",
            description: "Stop temperature monitoring",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_current_temperature",
            description: "Get the current simulated temperature",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "simulate_temperature_spike",
            description: "Simulate a temperature spike for testing",
            inputSchema: {
              type: "object",
              properties: {
                temperature: {
                  type: "number",
                  description: "Temperature to set",
                  default: 30,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "hello_world":
            return this.handleHelloWorld(args);

          case "start_monitoring":
            return this.handleStartMonitoring(args);

          case "stop_monitoring":
            return this.handleStopMonitoring(args);

          case "get_current_temperature":
            return this.handleGetCurrentTemperature(args);

          case "simulate_temperature_spike":
            return this.handleSimulateTemperatureSpike(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  handleHelloWorld(args) {
    const name = args?.name || "World";
    const message = `Hello, ${name}! 🌡️ Temperature monitoring server ready!`;

    console.log(`[MCP] Hello World called with name: ${name}`);

    return {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    };
  }

  handleStartMonitoring(args) {
    const interval = args?.interval || 5;
    const threshold = args?.threshold || 25;

    if (this.isMonitoring) {
      return {
        content: [
          {
            type: "text",
            text: "Temperature monitoring is already running! 🌡️",
          },
        ],
      };
    }

    this.isMonitoring = true;
    this.threshold = threshold;

    console.log(
      `[MCP] Starting temperature monitoring every ${interval}s, threshold: ${threshold}°C`
    );

    // Start periodic temperature updates
    this.intervalId = setInterval(() => {
      this.simulateTemperatureReading();
      this.sendTemperatureUpdate();
    }, interval * 1000);

    return {
      content: [
        {
          type: "text",
          text: `🌡️ Temperature monitoring started!\n📊 Update interval: ${interval} seconds\n🚨 Alert threshold: ${threshold}°C\n📡 Sending periodic updates...`,
        },
      ],
    };
  }

  handleStopMonitoring(args) {
    if (!this.isMonitoring) {
      return {
        content: [
          {
            type: "text",
            text: "Temperature monitoring is not running.",
          },
        ],
      };
    }

    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`[MCP] Temperature monitoring stopped`);

    return {
      content: [
        {
          type: "text",
          text: "🛑 Temperature monitoring stopped.",
        },
      ],
    };
  }

  handleGetCurrentTemperature(args) {
    const status = this.isMonitoring ? "🟢 Active" : "🔴 Inactive";

    return {
      content: [
        {
          type: "text",
          text: `🌡️ Current Temperature: ${this.temperature.toFixed(
            1
          )}°C\n📊 Monitoring Status: ${status}`,
        },
      ],
    };
  }

  handleSimulateTemperatureSpike(args) {
    const newTemp = args?.temperature || 30;
    this.temperature = newTemp;

    console.log(`[MCP] Temperature manually set to: ${newTemp}°C`);

    // Send immediate alert if monitoring is active
    if (this.isMonitoring) {
      this.sendTemperatureUpdate();
    }

    return {
      content: [
        {
          type: "text",
          text: `🌡️ Temperature set to ${newTemp}°C for testing!`,
        },
      ],
    };
  }

  // Simulate realistic temperature readings
  simulateTemperatureReading() {
    // Simulate temperature fluctuation (±2°C random walk)
    const change = (Math.random() - 0.5) * 4;
    this.temperature = Math.max(15, Math.min(40, this.temperature + change));

    // Occasionally simulate spikes (like a real sensor might)
    if (Math.random() < 0.1) {
      // 10% chance
      this.temperature += Math.random() * 5;
    }
  }

  // Send proactive temperature updates
  sendTemperatureUpdate() {
    if (!this.isMonitoring) return;

    const isAlert = this.temperature > this.threshold;
    const timestamp = new Date().toISOString();

    const notification = {
      method: "notifications/temperature_update",
      params: {
        timestamp,
        temperature: parseFloat(this.temperature.toFixed(1)),
        threshold: this.threshold,
        isAlert,
        status: isAlert ? "🚨 ALERT" : "✅ Normal",
        message: isAlert
          ? `🚨 Temperature Alert! ${this.temperature.toFixed(
              1
            )}°C exceeds threshold of ${this.threshold}°C`
          : `🌡️ Temperature Update: ${this.temperature.toFixed(1)}°C (Normal)`,
      },
    };

    // Send notification to stdout (this is how MCP sends events)
    console.log(JSON.stringify(notification));

    // Log for debugging
    const alertIcon = isAlert ? "🚨" : "📊";
    console.log(
      `[MCP] ${alertIcon} Temperature: ${this.temperature.toFixed(1)}°C ${
        isAlert ? "(ALERT!)" : "(Normal)"
      }`
    );
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP] Server error:", error);
    };

    process.on("SIGINT", async () => {
      console.log("\n[MCP] Shutting down temperature monitoring server...");
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    console.log("[MCP] Event-Driven Temperature Monitoring Server starting...");
    console.log(
      "[MCP] Available tools: hello_world, start_monitoring, stop_monitoring, get_current_temperature, simulate_temperature_spike"
    );
    console.log("[MCP] 🌡️ Simulated temperature sensor ready!");

    await this.server.connect(transport);
    console.log("[MCP] Server connected and ready for events!");
  }
}

// Start the server
const server = new EventDrivenMCPServer();
server.start().catch((error) => {
  console.error("[MCP] Failed to start server:", error);
  process.exit(1);
});
