// OpenAI Function Calling Tools for Squeaky the Plushie
import { getSwapQuote, getTokens } from "@coinbase/onchainkit/api";
import { setOnchainKitConfig } from "@coinbase/onchainkit";
import type { Token } from "@coinbase/onchainkit/token";

// Configure OnchainKit with the API key from environment variables
if (process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY) {
  console.log("🔧 [BASE] Configuring OnchainKit with API key...");

  setOnchainKitConfig({
    apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    chain: {
      id: 8453, // Base mainnet
      name: "Base",
      nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
      blockExplorers: {
        default: { name: "BaseScan", url: "https://basescan.org" },
      },
    },
  });
} else {
  console.log("⚠️ [BASE] No API key found - Base features may not work");
}

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

// Memory storage interface
interface MemoryItem {
  id: string;
  category: string;
  content: string;
  timestamp: number;
}

// In-memory storage for the conversation session
const conversationMemory: MemoryItem[] = [];

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
  {
    type: "function",
    name: "get_token_price",
    description:
      "Get the current price and information for any cryptocurrency token on the Base network. Perfect for answering 'What's the price of ETH?' or 'How much is USDC worth?'",
    parameters: {
      type: "object",
      properties: {
        token_symbol: {
          type: "string",
          description:
            "The token symbol to get price for (e.g., 'ETH', 'USDC', 'DEGEN', 'DAI')",
        },
        amount: {
          type: "string",
          description: "Optional: amount of tokens to price (default: '1')",
        },
      },
      required: ["token_symbol"],
    },
  },
  {
    type: "function",
    name: "search_tokens",
    description:
      "Search for tokens on the Base network by name or symbol. Great for finding tokens and getting their details.",
    parameters: {
      type: "object",
      properties: {
        search_query: {
          type: "string",
          description:
            "Token name or symbol to search for (e.g., 'ethereum', 'USDC', 'degen')",
        },
        limit: {
          type: "string",
          description: "Number of results to return (default: '5')",
        },
      },
      required: ["search_query"],
    },
  },
  {
    type: "function",
    name: "get_swap_quote",
    description:
      "Get a quote for swapping one token to another on Base network. Perfect for 'How much USDC would I get for 1 ETH?' type questions.",
    parameters: {
      type: "object",
      properties: {
        from_token: {
          type: "string",
          description: "Token symbol to swap from (e.g., 'ETH', 'USDC')",
        },
        to_token: {
          type: "string",
          description: "Token symbol to swap to (e.g., 'USDC', 'DAI')",
        },
        amount: {
          type: "string",
          description: "Amount to swap (e.g., '1', '0.5', '100')",
        },
      },
      required: ["from_token", "to_token", "amount"],
    },
  },
  {
    type: "function",
    name: "remember_about_user",
    description:
      "Store important information about the user for future reference. Use this when the user shares personal details, preferences, or important information.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Category of information (e.g., 'favorite_things', 'personal_info', 'preferences', 'important_dates', 'goals', 'interests')",
        },
        content: {
          type: "string",
          description:
            "The information to remember about the user (keep it concise but meaningful)",
        },
      },
      required: ["category", "content"],
    },
  },
  {
    type: "function",
    name: "recall_user_info",
    description:
      "Retrieve stored information about the user. Use this to personalize responses or answer questions about what you know about them.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Optional: specific category to search in (e.g., 'favorite_things', 'personal_info'). Leave empty to search all memories.",
        },
      },
      required: [],
    },
  },
  {
    type: "function",
    name: "update_user_memory",
    description:
      "Update or modify existing information about the user. Use this when the user corrects information or provides updates.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "Category of information to update (e.g., 'favorite_things', 'personal_info')",
        },
        old_content: {
          type: "string",
          description: "The old information to replace or update",
        },
        new_content: {
          type: "string",
          description: "The new information to store",
        },
      },
      required: ["category", "new_content"],
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

      case "get_token_price":
        return await getTokenPrice(args.token_symbol, args.amount);

      case "search_tokens":
        return await searchTokens(args.search_query, args.limit);

      case "get_swap_quote":
        return await getSwapQuotePrice(
          args.from_token,
          args.to_token,
          args.amount
        );

      case "remember_about_user":
        return rememberAboutUser(args.category, args.content);

      case "recall_user_info":
        return recallUserInfo(args.category);

      case "update_user_memory":
        return updateUserMemory(
          args.category,
          args.old_content,
          args.new_content
        );

      default:
        return `Sorry, I don't know how to use the tool "${name}" yet!`;
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return `Oops! I had trouble using my ${name} ability. Let me try again later!`;
  }
};

// Base token definitions for common tokens
const BASE_TOKENS: Record<string, Token> = {
  ETH: {
    name: "Ethereum",
    address: "",
    symbol: "ETH",
    decimals: 18,
    image:
      "https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png",
    chainId: 8453,
  },
  USDC: {
    name: "USDC",
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    symbol: "USDC",
    decimals: 6,
    image:
      "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2",
    chainId: 8453,
  },
  DAI: {
    name: "Dai",
    address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    symbol: "DAI",
    decimals: 18,
    image:
      "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/d0/d7/d0d7784975771dbbac9a22c8c0c12928cc6f658cbcf2bbbf7c909f0fa2426dec-NmU4ZWViMDItOTQyYy00Yjk5LTkzODUtNGJlZmJiMTUxOTgy",
    chainId: 8453,
  },
};

// Base token implementation functions
async function getTokenPrice(
  tokenSymbol: string,
  amount: string = "1"
): Promise<string> {
  try {
    const symbol = tokenSymbol.toUpperCase();

    // Check if we have this token in our predefined list
    const fromToken = BASE_TOKENS[symbol];
    if (!fromToken) {
      // Try to search for the token first
      const searchResult = await searchTokens(tokenSymbol, "1");
      if (searchResult.includes("found 0 tokens")) {
        return `🤔 Oh my whiskers! I couldn't find a token called "${tokenSymbol}" on the Base network. Try searching for popular tokens like ETH, USDC, or DAI!`;
      }
      return `💡 I found some tokens matching "${tokenSymbol}"! ${searchResult}\n\nCould you be more specific about which token you want the price for?`;
    }

    // Get price by getting a quote to USDC
    const toToken = BASE_TOKENS.USDC;

    const quote = await getSwapQuote({
      from: fromToken,
      to: toToken,
      amount: amount,
      useAggregator: true,
    });

    if ("error" in quote) {
      return `🐘 Oops! I had trouble getting the price for ${symbol}. The Base network might be busy right now. Try again in a moment!`;
    }

    const priceInUSD = parseFloat(quote.toAmountUSD || "0");
    const tokenAmount = parseFloat(amount);
    const pricePerToken =
      tokenAmount > 0 ? priceInUSD / tokenAmount : priceInUSD;

    return (
      `💰 ${symbol} Price Update! 🐭\n\n` +
      `💵 ${amount} ${symbol} = $${priceInUSD.toFixed(2)} USD\n` +
      `📊 Price per ${symbol}: $${pricePerToken.toFixed(4)}\n` +
      `🔄 You'd get ${
        parseFloat(quote.toAmount || "0") / Math.pow(10, toToken.decimals)
      } USDC\n\n` +
      `✨ This data is fresh from the Base blockchain! What a mouse-tastic price! 🐘`
    );
  } catch (error) {
    console.error("Error getting token price:", error);
    return `🐘 Oh my trunk— I mean whiskers! I had trouble getting the ${tokenSymbol} price. The blockchain might be having a little hiccup. Let me try again later!`;
  }
}

async function searchTokens(
  searchQuery: string,
  limit: string = "5"
): Promise<string> {
  try {
    const tokens = await getTokens({
      search: searchQuery,
      limit: limit,
    });

    if ("error" in tokens) {
      return `🐘 Oops! I had trouble searching for tokens. The Base network might be busy right now.`;
    }

    if (tokens.length === 0) {
      return `🤔 I found 0 tokens matching "${searchQuery}" on Base. Try searching for popular tokens like ETH, USDC, DEGEN, or DAI!`;
    }

    const tokenList = tokens
      .slice(0, parseInt(limit))
      .map((token, index) => {
        const price =
          token.symbol === "USDC" ? "$1.00" : "Price available on request";
        return `${index + 1}. **${token.symbol}** (${
          token.name
        })\n   📍 Address: ${token.address || "Native ETH"}\n   💰 ${price}`;
      })
      .join("\n\n");

    return `🔍 Found ${tokens.length} tokens matching "${searchQuery}" on Base! 🐭\n\n${tokenList}\n\n✨ Want the current price for any of these? Just ask me "What's the price of [TOKEN]"!`;
  } catch (error) {
    console.error("Error searching tokens:", error);
    return `🐘 Oh my whiskers! I had trouble searching for tokens. Let me try again later!`;
  }
}

async function getSwapQuotePrice(
  fromToken: string,
  toToken: string,
  amount: string
): Promise<string> {
  try {
    const fromSymbol = fromToken.toUpperCase();
    const toSymbol = toToken.toUpperCase();

    const from = BASE_TOKENS[fromSymbol];
    const to = BASE_TOKENS[toSymbol];

    if (!from || !to) {
      const missingTokens = [];
      if (!from) missingTokens.push(fromSymbol);
      if (!to) missingTokens.push(toSymbol);

      return `🤔 I don't have ${missingTokens.join(
        " and "
      )} in my Base token list yet! Currently I support ETH, USDC, and DAI. Want me to search for other tokens?`;
    }

    const quote = await getSwapQuote({
      from: from,
      to: to,
      amount: amount,
      useAggregator: true,
    });

    if ("error" in quote) {
      return `🐘 Oops! I couldn't get a swap quote right now. The Base network might be busy. Try again in a moment!`;
    }

    const fromAmountFormatted = parseFloat(amount);
    const toAmountFormatted =
      parseFloat(quote.toAmount || "0") / Math.pow(10, to.decimals);
    const fromAmountUSD = parseFloat(quote.fromAmountUSD || "0");
    const toAmountUSD = parseFloat(quote.toAmountUSD || "0");
    const priceImpact = parseFloat(quote.priceImpact || "0");

    return (
      `🔄 Swap Quote on Base! 🐭\n\n` +
      `📤 You give: ${fromAmountFormatted} ${fromSymbol} ($${fromAmountUSD.toFixed(
        2
      )})\n` +
      `📥 You get: ${toAmountFormatted.toFixed(
        6
      )} ${toSymbol} ($${toAmountUSD.toFixed(2)})\n\n` +
      `📊 Exchange Rate: 1 ${fromSymbol} = ${(
        toAmountFormatted / fromAmountFormatted
      ).toFixed(6)} ${toSymbol}\n` +
      `⚡ Price Impact: ${priceImpact}%\n` +
      `🏦 Slippage: ${quote.slippage}%\n\n` +
      `✨ This quote is fresh from Base's decentralized exchanges! What a mouse-tastic deal! 🐘`
    );
  } catch (error) {
    console.error("Error getting swap quote:", error);
    return `🐘 Oh my trunk— I mean tiny mouse nose! I had trouble getting that swap quote. Let me try again later!`;
  }
}

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

// Memory management functions
function rememberAboutUser(category: string, content: string): string {
  const memoryId = `memory_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const newMemory: MemoryItem = {
    id: memoryId,
    category: category.toLowerCase(),
    content: content,
    timestamp: Date.now(),
  };

  conversationMemory.push(newMemory);

  console.log(`🧠 [MEMORY] Stored: [${category}] ${content}`);
  return `🧠 Got it! I'll remember that ${content.toLowerCase()}. I've stored this in my ${category} memories so I can refer to it later!`;
}

function recallUserInfo(category?: string): string {
  if (conversationMemory.length === 0) {
    return `🤔 I don't have any memories about you yet! Tell me something about yourself so I can remember it for our future chats!`;
  }

  let memories = conversationMemory;

  if (category) {
    memories = conversationMemory.filter(
      (memory) => memory.category.toLowerCase() === category.toLowerCase()
    );

    if (memories.length === 0) {
      return `🤔 I don't have any memories in the "${category}" category yet. But I do remember other things about you! Want me to share what I know?`;
    }
  }

  const memoryList = memories
    .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
    .map((memory) => `• ${memory.content} (${memory.category})`)
    .join("\n");

  const categoryText = category ? ` about ${category}` : "";
  return `🧠 Here's what I remember${categoryText}:\n\n${memoryList}\n\nI love getting to know you better! 🐘💖`;
}

function updateUserMemory(
  category: string,
  oldContent: string,
  newContent: string
): string {
  const categoryLower = category.toLowerCase();

  // Find memories to update
  const memoriesToUpdate = conversationMemory.filter(
    (memory) =>
      memory.category.toLowerCase() === categoryLower &&
      (!oldContent ||
        memory.content.toLowerCase().includes(oldContent.toLowerCase()))
  );

  if (memoriesToUpdate.length === 0) {
    // If no existing memory found, create a new one
    return rememberAboutUser(category, newContent);
  }

  // Update the most recent matching memory
  const memoryToUpdate = memoriesToUpdate[0];
  const oldContentText = memoryToUpdate.content;
  memoryToUpdate.content = newContent;
  memoryToUpdate.timestamp = Date.now();

  console.log(
    `🧠 [MEMORY] Updated: [${category}] "${oldContentText}" → "${newContent}"`
  );
  return `🧠 Perfect! I've updated my memory. I used to remember "${oldContentText}" but now I know "${newContent}". Thanks for keeping me up to date! 🐘`;
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
