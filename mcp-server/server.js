#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

class HelloWorldMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "hello-world-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

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
            name: "plushie_mood",
            description: "Get or set the plushie's mood",
            inputSchema: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["get", "set"],
                  description: "Whether to get or set the mood",
                },
                mood: {
                  type: "string",
                  enum: ["happy", "excited", "sleepy", "playful", "curious"],
                  description: "The mood to set (only for 'set' action)",
                },
              },
              required: ["action"],
            },
          },
          {
            name: "plushie_story",
            description: "Generate a short story for the plushie",
            inputSchema: {
              type: "object",
              properties: {
                theme: {
                  type: "string",
                  description: "Theme for the story",
                  default: "adventure",
                },
                length: {
                  type: "string",
                  enum: ["short", "medium", "long"],
                  description: "Length of the story",
                  default: "short",
                },
              },
            },
          },
          {
            name: "get_time",
            description: "Get current time and date",
            inputSchema: {
              type: "object",
              properties: {
                format: {
                  type: "string",
                  enum: ["12h", "24h"],
                  description: "Time format preference",
                  default: "12h",
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

          case "plushie_mood":
            return this.handlePlushieMood(args);

          case "plushie_story":
            return this.handlePlushieStory(args);

          case "get_time":
            return this.handleGetTime(args);

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
    const message = `Hello, ${name}! 🌟 Squeaky the plushie says hi!`;

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

  handlePlushieMood(args) {
    const { action, mood } = args;

    if (action === "get") {
      const currentMood = this.currentMood || "happy";
      console.log(`[MCP] Getting plushie mood: ${currentMood}`);

      return {
        content: [
          {
            type: "text",
            text: `Squeaky is feeling ${currentMood} right now! 😊`,
          },
        ],
      };
    } else if (action === "set" && mood) {
      this.currentMood = mood;
      console.log(`[MCP] Setting plushie mood to: ${mood}`);

      const moodEmojis = {
        happy: "😊",
        excited: "🤩",
        sleepy: "😴",
        playful: "🎮",
        curious: "🤔",
      };

      return {
        content: [
          {
            type: "text",
            text: `Squeaky is now feeling ${mood}! ${moodEmojis[mood] || "✨"}`,
          },
        ],
      };
    }

    throw new Error("Invalid mood action or missing mood parameter");
  }

  handlePlushieStory(args) {
    const theme = args?.theme || "adventure";
    const length = args?.length || "short";

    console.log(`[MCP] Generating ${length} story with theme: ${theme}`);

    const stories = {
      adventure: {
        short:
          "Once upon a time, Squeaky discovered a magical toy chest that led to a world of endless adventures! 🗺️✨",
        medium:
          "Squeaky the brave plushie ventured into the enchanted forest, where talking animals taught him about friendship and courage. Together, they solved puzzles and found a treasure that turned out to be the best gift of all - new friends! 🌲🦋👫",
        long: "In a cozy bedroom, Squeaky noticed a mysterious glow coming from under the bed. Upon investigation, he found a portal to Plushie Land, where all toys come to life! He met Princess Fluffy, a wise teddy bear who showed him around the magical kingdom. They went on quests, helped other toys find their lost buttons, and learned that every plushie has a special power - Squeaky's was bringing joy and comfort to children. When it was time to return, Squeaky promised to visit again in dreams. 🏰🧸💫",
      },
      mystery: {
        short:
          "Squeaky became Detective Mouse, solving the case of the missing bedtime story! 🔍📚",
        medium:
          "When all the nighttime stories disappeared from the bookshelf, Detective Squeaky put on his tiny hat and magnifying glass. Following clues of scattered letters and bookmark trails, he discovered the Sleepy Sandman had borrowed them all to create the most wonderful dream ever! 🕵️‍♂️💤",
        long: "The Case of the Vanishing Lullabies began when children everywhere reported that their bedtime songs had mysteriously disappeared. Detective Squeaky, with his keen nose and brave heart, investigated playrooms and nurseries. He interviewed other toys, examined evidence, and followed a trail of musical notes that led to the Moon's palace. There, he found the Music Fairy collecting all the lullabies to fix a broken star that sang children to sleep. Together, they restored the star and returned all the songs, ensuring sweet dreams for everyone. 🌙🎵⭐",
      },
    };

    const storyTheme = stories[theme] || stories.adventure;
    const story = storyTheme[length];

    return {
      content: [
        {
          type: "text",
          text: `📖 Squeaky's ${theme} story:\n\n${story}`,
        },
      ],
    };
  }

  handleGetTime(args) {
    const format = args?.format || "12h";
    const now = new Date();

    let timeString;
    if (format === "24h") {
      timeString = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      timeString = now.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "2-digit",
      });
    }

    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    console.log(`[MCP] Time requested in ${format} format`);

    return {
      content: [
        {
          type: "text",
          text: `🕐 Current time: ${timeString}\n📅 Date: ${dateString}`,
        },
      ],
    };
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP] Server error:", error);
    };

    process.on("SIGINT", async () => {
      console.log("\n[MCP] Shutting down server...");
      await this.server.close();
      process.exit(0);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    console.log("[MCP] Hello World MCP Server starting...");
    console.log(
      "[MCP] Available tools: hello_world, plushie_mood, plushie_story, get_time"
    );

    await this.server.connect(transport);
    console.log("[MCP] Server connected and ready!");
  }
}

// Start the server
const server = new HelloWorldMCPServer();
server.start().catch((error) => {
  console.error("[MCP] Failed to start server:", error);
  process.exit(1);
});
