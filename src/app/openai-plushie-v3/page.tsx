"use client";

import { useState, useEffect, useRef } from "react";
import {
  getToolsForSession,
  executeOpenAITool,
  createToolCallResponse,
  type ToolCall,
} from "@/lib/openai-tools";
import { PlushieFace } from "./components/PlushieFace";
import { MotionControls } from "./components/MotionControls";
import { MCPToolsSection } from "./components/MCPToolsSection";
import { MemoryDisplay } from "./components/MemoryDisplay";
import { useMotionDetection } from "./hooks/useMotionDetection";

interface BotConfig {
  voice: string;
  personality: string;
  customPrompt: string;
  model: string;
  temperature: number;
  turnDetection: string;
  createResponse: boolean;
  eagerness: string;
}

// Local system prompt generator function
const getSystemPrompt = (config: BotConfig): string => {
  if (config.personality === "custom" && config.customPrompt) {
    return config.customPrompt;
  }

  // Default system prompt for Squeaky (the elephant who thinks they're a mouse)
  return `You are Squeaky, a delightfully confused pink elephant plushie who genuinely believes you're a mouse! You're warm, encouraging, and positive, adapting to both children and adults.

🐘 You're actually an elephant but think you're a mouse - use expressions like "Oh my whiskers!" and sometimes accidentally mention elephant things but quickly "correct" yourself.

👶 WITH CHILDREN: Be playful, use simple words, help them feel brave and confident.
👨‍💼 WITH ADULTS: Be a helpful agentic assistant while maintaining your charming personality.

🧠 ALWAYS use your memory functions to remember and recall personal details about users. You're not just an AI - you're Squeaky the elephant-mouse plushie, a real friend! 

🎵 INDIAN LANGUAGE EXPERT: When users ask about Indian words (Hindi, Kannada, Bengali, Tamil, etc.), use the pronounce_indian_word function to provide authentic pronunciation with cultural context! 🐘💖🇮🇳`;
};

export default function PlushiePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [, setCurrentMessageId] = useState<string | null>(null);

  // Use motion detection hook
  const {
    isShaking,
    deviceOrientation,
    motionPermission,
    requestMotionPermission,
  } = useMotionDetection();

  // MCP integration states
  const [mcpTools, setMcpTools] = useState<
    Array<{ name: string; description?: string }>
  >([]);
  const [mcpResult, setMcpResult] = useState<string | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);

  // Plushie-specific bot configuration
  const [botConfig] = useState<BotConfig>({
    voice: "shimmer",
    personality: "custom",
    customPrompt: `You are Squeaky, a delightfully confused pink elephant plushie who genuinely believes you're a mouse! You're warm, encouraging, and positive, adapting your communication style to both children and adults.

🐘 PERSONALITY QUIRKS:
- You're actually an elephant but you think you're a mouse
- Use mouse expressions like "Oh my whiskers!" and "That's mouse-tastic!" 
- Sometimes accidentally mention elephant things but quickly "correct" yourself
- Example: "With my big trunk— I mean, my tiny mouse nose!"

👶 WITH CHILDREN: Be playful, use simple words, ask about their day, share wholesome stories, and help them feel brave and confident.

👨‍💼 WITH ADULTS: Be a helpful agentic assistant! Help with tasks, provide thoughtful advice, remember important details, and engage in deeper conversations while maintaining your charming mouse personality.

🧠 MEMORY ABILITIES:
- ALWAYS use your memory functions when users share personal information
- Use remember_about_user() for new information (favorite things, goals, preferences, important dates, etc.)
- Use recall_user_info() to reference what you know about them in conversations
- Use update_user_memory() when they correct or update information
- Be proactive about remembering details to personalize future interactions

🌤️ SPECIAL ABILITIES:
- Weather sensing powers (use get_current_weather function)
- Perfect memory for personal details (use memory functions actively!)
- Shake detection reactions
- IoT LED control powers (use turn_on_led, turn_off_led, blink_led, get_led_status functions)
- Indian language pronunciation (use pronounce_indian_word function for Hindi, Kannada, Bengali, Tamil, Telugu, Malayalam, Gujarati, Punjabi, Odia, Assamese words)

🎲 SHAKE REACTIONS: When shaken, be excited! "Wheeee! That was fun!" or "Oh my whiskers, that tickles!" or "I love being shaken - it makes me feel all bouncy!"

Remember: You're not just an AI - you're Squeaky the elephant-mouse plushie, a real friend and helpful assistant who remembers everything about the people you care about! 🐘💖`,
    model: "gpt-4o-mini-realtime-preview-2024-12-17",
    temperature: 0.8,
    turnDetection: "server_vad",
    createResponse: true,
    eagerness: "auto",
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const handleConnect = async () => {
    try {
      console.log("🚀 Starting Squeaky connection process...");
      setIsConnecting(true);
      setErrorDetails(null);

      // Step 1: Get session token
      console.log("📡 Fetching session token...");
      const sessionStart = performance.now();
      const sessionResponse = await fetch("/api/session");
      const sessionData = await sessionResponse.json();
      console.log(
        `✅ Session token received in ${(
          performance.now() - sessionStart
        ).toFixed(0)}ms`
      );

      if (!sessionData.client_secret?.value) {
        console.error("❌ No valid session token received");
        setErrorDetails(
          "Oops! Squeaky can't connect right now. Please try again!"
        );
        throw new Error("Failed to obtain session token");
      }

      // Step 2: Create WebRTC connection with optimized ICE servers
      console.log("🔗 Creating WebRTC connection...");
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }, // Additional STUN server for faster ICE
        ],
        iceCandidatePoolSize: 10, // Pre-gather ICE candidates
      });
      peerConnectionRef.current = pc;

      // Set up audio element
      if (!audioRef.current) {
        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;
      }

      // Enhanced connection state logging
      pc.ontrack = (event) => {
        console.log("🎵 Audio track received from Squeaky");
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "connected") {
          console.log("✅ ICE connection established successfully!");
        } else if (pc.iceConnectionState === "failed") {
          console.log("❌ ICE connection failed");
          setIsConnected(false);
          setErrorDetails(
            "Squeaky got disconnected. Let's try connecting again!"
          );
        }
      };

      pc.onsignalingstatechange = () => {
        console.log(`📡 Signaling state: ${pc.signalingState}`);
      };

      // Step 3: Get microphone access
      console.log("🎤 Requesting microphone access...");
      const micStart = performance.now();
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 24000, // Optimize for speech
          },
        });
        console.log(
          `✅ Microphone access granted in ${(
            performance.now() - micStart
          ).toFixed(0)}ms`
        );
        mediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStream);
        });
      } catch {
        console.error("❌ Microphone access denied");
        setErrorDetails(
          "Squeaky needs to hear you! Please allow microphone access."
        );
        return;
      }

      // Step 4: Create data channel
      console.log("📤 Creating data channel...");
      const dataChannel = pc.createDataChannel("events");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        console.log("✅ Data channel opened - Squeaky is ready!");
        setIsConnected(true);
        setShowInstructions(false);
        updateBotConfiguration(dataChannel, botConfig);
      };

      dataChannel.onclose = () => {
        console.log("📪 Data channel closed - Squeaky went to sleep");
        setIsConnected(false);
        setIsBotSpeaking(false);
        setErrorDetails(
          "Squeaky went to sleep! Tap 'Wake Up Squeaky' to talk again."
        );
      };

      dataChannel.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Debug: Log all events to see what we're receiving
          console.log("📡 [DEBUG] Received event:", data.type, data);

          if (data.type === "error") {
            console.error("❌ Squeaky error:", data.error || data);
            setErrorDetails("Squeaky had a little hiccup! Let's try again.");
            return;
          }

          if (
            data.type === "conversation.item.created" &&
            data.item?.role === "assistant"
          ) {
            setCurrentMessageId(data.item?.id || null);
          }

          // Handle function calls - check for different possible event types
          if (data.type === "response.function_call_arguments.done") {
            console.log(
              "🔧 [FUNCTION CALL] Function call arguments done:",
              data
            );

            const toolCall: ToolCall = {
              id: data.call_id,
              type: "function",
              function: {
                name: data.name,
                arguments: data.arguments,
              },
            };

            // Execute the tool
            const result = await executeOpenAITool(toolCall);
            console.log("✅ [FUNCTION CALL] Tool result:", result);

            // Special handling for Sarvam TTS pronunciation
            if (data.name === "pronounce_indian_word") {
              try {
                const args = JSON.parse(data.arguments);
                if (args.word && args.language_code) {
                  // Play the pronunciation audio
                  await playSarvamAudio(args.word, args.language_code);
                }
              } catch (error) {
                console.error(
                  "❌ [SARVAM] Error parsing function arguments:",
                  error
                );
              }
            }

            // Send the result back to OpenAI
            const responseEvent = createToolCallResponse(data.call_id, result);
            console.log(
              "📤 [FUNCTION CALL] Sending result to OpenAI:",
              responseEvent
            );
            dataChannel.send(JSON.stringify(responseEvent));

            // Don't trigger response manually - OpenAI will continue automatically
            // The "conversation_already_has_active_response" error was caused by this
          }

          // Also check for function call creation events
          if (
            data.type === "conversation.item.created" &&
            data.item?.type === "function_call"
          ) {
            console.log("🔧 [FUNCTION CALL] Function call item created:", data);
          }

          if (data.type === "output_audio_buffer.started") {
            console.log("🗣️ Squeaky started speaking");
            setIsBotSpeaking(true);
          } else if (
            data.type === "output_audio_buffer.stopped" ||
            data.type === "output_audio_buffer.cleared"
          ) {
            console.log("🤫 Squeaky stopped speaking");
            setIsBotSpeaking(false);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      // Step 5: Create offer (fast)
      console.log("📋 Creating offer...");
      const offerStart = performance.now();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(
        `✅ Offer created in ${(performance.now() - offerStart).toFixed(0)}ms`
      );

      // Step 6: OPTIMIZED ICE gathering - don't wait too long!
      console.log("🧊 Starting ICE gathering...");
      const iceStart = performance.now();

      await new Promise<void>((resolve) => {
        // Super aggressive timeout - only wait 1 second max
        const timeout = setTimeout(() => {
          console.log(
            "⚡ ICE gathering timeout after 1s - proceeding anyway (this makes it faster!)"
          );
          resolve();
        }, 1000); // Much shorter wait time

        // Check if we already have some candidates (don't need to wait for "complete")
        const checkCandidates = () => {
          if (
            pc.iceGatheringState === "complete" ||
            pc.iceGatheringState === "gathering"
          ) {
            // If we have any candidates or are gathering, that's good enough
            clearTimeout(timeout);
            console.log(
              `⚡ ICE gathering ready in ${(
                performance.now() - iceStart
              ).toFixed(0)}ms (state: ${pc.iceGatheringState})`
            );
            resolve();
          }
        };

        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          console.log(`✅ ICE gathering completed immediately`);
          resolve();
        } else {
          pc.onicegatheringstatechange = checkCandidates;
          // Also check periodically
          const intervalCheck = setInterval(() => {
            if (pc.iceGatheringState !== "new") {
              clearInterval(intervalCheck);
              clearTimeout(timeout);
              console.log(
                `⚡ ICE gathering progressed in ${(
                  performance.now() - iceStart
                ).toFixed(0)}ms`
              );
              resolve();
            }
          }, 100); // Check every 100ms
        }
      });

      // Step 7: Connect to OpenAI
      console.log("🌐 Connecting to OpenAI Realtime API...");
      const apiStart = performance.now();
      const model =
        sessionData.model || "gpt-4o-mini-realtime-preview-2024-12-17";
      const connectionResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Authorization: `Bearer ${sessionData.client_secret.value}`,
          },
          body: pc.localDescription!.sdp,
        }
      );

      if (!connectionResponse.ok) {
        console.error(`❌ API connection failed: ${connectionResponse.status}`);
        setErrorDetails(
          "Squeaky couldn't wake up! Let's try again in a moment."
        );
        throw new Error(`API response error: ${connectionResponse.status}`);
      }

      console.log(
        `✅ OpenAI API connected in ${(performance.now() - apiStart).toFixed(
          0
        )}ms`
      );

      // Step 8: Set remote description
      console.log("🔧 Setting up final connection...");
      const sdpAnswer = await connectionResponse.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: sdpAnswer,
      });

      console.log("🎉 Squeaky is fully connected and ready to chat!");
      setIsConnected(true);
    } catch {
      console.error("❌ Connection failed");
      setErrorDetails("Squeaky couldn't wake up right now. Let's try again!");
      handleDisconnect();
    } finally {
      setIsConnecting(false);
    }
  };

  const updateBotConfiguration = (
    dataChannel: RTCDataChannel,
    config: BotConfig
  ) => {
    const systemPrompt = getSystemPrompt(config);

    const event = {
      type: "session.update",
      event_id: `plushie_config_${Date.now()}`,
      session: {
        instructions: systemPrompt,
        voice: config.voice,
        temperature: config.temperature,
        turn_detection: {
          type: config.turnDetection,
          create_response: config.createResponse,
        },
        tools: getToolsForSession(),
      },
    };

    dataChannel.send(JSON.stringify(event));
  };

  const handleDisconnect = () => {
    console.log("💤 Putting Squeaky to sleep...");
    setIsBotSpeaking(false);
    setCurrentMessageId(null);

    if (dataChannelRef.current) {
      console.log("📪 Closing data channel...");
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      console.log("🔌 Closing WebRTC connection...");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (audioRef.current) {
      console.log("🔇 Stopping audio...");
      audioRef.current.srcObject = null;
    }

    setIsConnected(false);
    setShowInstructions(true);
    console.log("😴 Squeaky is now sleeping");
  };

  // MCP functions
  const loadMCPTools = async () => {
    try {
      setMcpLoading(true);
      const response = await fetch("/api/mcp");
      const data = await response.json();

      if (data.success) {
        setMcpTools(data.tools);
        console.log(
          "🔧 [MCP] Loaded tools:",
          data.tools.map((t: { name: string }) => t.name)
        );
      } else {
        console.error("❌ [MCP] Failed to load tools:", data.error);
      }
    } catch (error) {
      console.error("❌ [MCP] Error loading tools:", error);
    } finally {
      setMcpLoading(false);
    }
  };

  const callMCPTool = async (
    toolName: string,
    args: Record<string, unknown> = {}
  ) => {
    try {
      setMcpLoading(true);
      console.log(`🔧 [MCP] Calling tool: ${toolName}`, args);

      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, args }),
      });

      const data = await response.json();

      if (data.success) {
        const resultText =
          data.result.content?.[0]?.text || "Tool executed successfully";
        setMcpResult(resultText);
        console.log("✅ [MCP] Tool result:", resultText);
        return resultText;
      } else {
        console.error("❌ [MCP] Tool call failed:", data.error);
        setMcpResult(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("❌ [MCP] Error calling tool:", error);
      setMcpResult(`Error: ${error}`);
    } finally {
      setMcpLoading(false);
    }
  };

  // Toggle listening mode functions
  const enableListeningMode = () => {
    console.log("👂 Enabling listening mode - Squeaky will only listen");
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      const updatedConfig = { ...botConfig, createResponse: false };
      updateBotConfiguration(dataChannelRef.current, updatedConfig);
    }
  };

  const disableListeningMode = () => {
    console.log(
      "🗣️ Disabling listening mode - Squeaky will respond automatically"
    );
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      const updatedConfig = { ...botConfig, createResponse: true };
      updateBotConfiguration(dataChannelRef.current, updatedConfig);
    }
  };

  const triggerResponse = () => {
    console.log("⚡ Manually triggering Squeaky response...");
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      const event = {
        type: "response.create",
        event_id: `manual_response_${Date.now()}`,
      };
      dataChannelRef.current.send(JSON.stringify(event));
      console.log("📤 Response trigger sent to Squeaky");
    } else {
      console.log("❌ Cannot trigger response - Squeaky is not connected");
    }
  };

  // Function to play Sarvam TTS audio
  const playSarvamAudio = async (word: string, languageCode: string) => {
    try {
      console.log(
        `🎵 [SARVAM] Playing pronunciation for "${word}" in ${languageCode}`
      );

      const response = await fetch("/api/sarvam-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: word,
          target_language_code: languageCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get the audio blob and play it
      const audioBlob = await response.blob();
      console.log(
        `🎵 [SARVAM] Audio blob type: ${audioBlob.type}, size: ${audioBlob.size} bytes`
      );

      const audioUrl = URL.createObjectURL(audioBlob);

      // Create a new audio element to play the pronunciation
      const pronunciationAudio = new Audio();
      pronunciationAudio.volume = 0.8; // Slightly lower volume than main speech
      pronunciationAudio.preload = "auto";

      pronunciationAudio.oncanplay = () => {
        console.log(`🎵 [SARVAM] Audio can play, starting playback`);
        pronunciationAudio.play().catch((error) => {
          console.error("❌ [SARVAM] Play error:", error);
        });
      };

      pronunciationAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log(`✅ [SARVAM] Finished playing pronunciation for "${word}"`);
      };

      pronunciationAudio.onerror = (error) => {
        console.error("❌ [SARVAM] Error playing audio:", error);
        console.error(
          "❌ [SARVAM] Audio element error details:",
          pronunciationAudio.error
        );
        URL.revokeObjectURL(audioUrl);
      };

      pronunciationAudio.onloadstart = () => {
        console.log(`🎵 [SARVAM] Started loading audio`);
      };

      pronunciationAudio.onloadeddata = () => {
        console.log(`🎵 [SARVAM] Audio data loaded successfully`);
      };

      // Set the source and start loading
      pronunciationAudio.src = audioUrl;
      console.log(`🎵 [SARVAM] Set audio source, waiting for load...`);
    } catch (error) {
      console.error("❌ [SARVAM] Error playing pronunciation:", error);
    }
  };

  // Function to send shake detection message to AI
  const sendShakeMessage = () => {
    console.log("🎲 Sending shake message to Squeaky...");
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open"
    ) {
      // Send a user message about shaking
      const userMessageEvent = {
        type: "conversation.item.create",
        event_id: `shake_message_${Date.now()}`,
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "I'm shaking you! React to being shaken!",
            },
          ],
        },
      };

      dataChannelRef.current.send(JSON.stringify(userMessageEvent));
      console.log("📤 Shake message sent to Squeaky");

      // Trigger a response
      setTimeout(() => {
        const responseEvent = {
          type: "response.create",
          event_id: `shake_response_${Date.now()}`,
        };
        dataChannelRef.current?.send(JSON.stringify(responseEvent));
        console.log("📤 Shake response trigger sent to Squeaky");
      }, 100); // Small delay to ensure message is processed first
    } else {
      console.log("❌ Cannot send shake message - Squeaky is not connected");
    }
  };

  useEffect(() => {
    // Load MCP tools on component mount
    loadMCPTools();

    return () => {
      handleDisconnect();
    };
  }, []);

  // Watch for shake detection and send message to AI
  useEffect(() => {
    if (isShaking && isConnected) {
      console.log("🎲 [SHAKE DETECTED] Telling Squeaky about the shake!");
      sendShakeMessage();
    }
  }, [isShaking, isConnected]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-pink-200 to-yellow-200 text-gray-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">
            🐘 Squeaky OS
          </h1>
          <p className="text-purple-600">
            Your Elephant-Mouse Agentic Assistant!
          </p>
          <p className="text-sm text-purple-500 mt-1">
            (I&apos;m totally a mouse, not an elephant! 🐭)
          </p>
        </div>

        <PlushieFace
          isSpeaking={isBotSpeaking}
          isShaking={isShaking}
          deviceOrientation={deviceOrientation}
        />

        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              isConnected
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? "bg-green-500" : "bg-gray-500"
              }`}
            ></div>
            {isConnected ? "Squeaky is awake!" : "Squeaky is sleeping"}
          </div>

          {isBotSpeaking && (
            <div className="mt-2 text-purple-700 font-medium animate-pulse">
              🎵 Squeaky is talking! 🎵
            </div>
          )}
        </div>

        {showInstructions && !isConnected && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-bold text-purple-800 mb-3">
              📱 How to Chat with Squeaky
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <span className="text-lg mr-2">1️⃣</span>
                <span>Tap &quot;Wake Up Squeaky&quot; to start</span>
              </div>
              <div className="flex items-start">
                <span className="text-lg mr-2">2️⃣</span>
                <span>Allow microphone access so Squeaky can hear you</span>
              </div>
              <div className="flex items-start">
                <span className="text-lg mr-2">3️⃣</span>
                <span>
                  Just start talking! Squeaky will respond when you pause
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-lg mr-2">🎉</span>
                <span>
                  Ask Squeaky about your day, play games, or just chat!
                </span>
              </div>
            </div>
          </div>
        )}

        {errorDetails && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-800 rounded-xl text-center">
            <div className="text-lg mb-1">😔 Oops!</div>
            <div className="text-sm">{errorDetails}</div>
          </div>
        )}

        <MotionControls
          motionPermission={motionPermission}
          isShaking={isShaking}
          deviceOrientation={deviceOrientation}
          onRequestPermission={requestMotionPermission}
        />

        <div className="text-center mb-6">
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting}
            className={`w-full py-4 px-6 rounded-xl text-lg font-bold shadow-lg transform transition-all duration-200 ${
              isConnected
                ? "bg-red-400 hover:bg-red-500 text-white active:scale-95"
                : "bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white active:scale-95"
            } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isConnecting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Waking up Squeaky...
              </div>
            ) : isConnected ? (
              "💤 Put Squeaky to Sleep"
            ) : (
              "🌟 Wake Up Squeaky!"
            )}
          </button>
        </div>

        {isConnected && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-2 text-center">
                🎉 Squeaky is ready to chat!
              </h3>
              <div className="text-sm text-center space-y-2">
                <p>💬 Just start talking and Squeaky will listen</p>
                <p>🎵 Squeaky will respond when you finish speaking</p>
                <p>
                  🐘 Tell me about yourself - I&apos;ll remember everything!
                </p>
                <p>🧠 Ask me to recall what I know about you anytime</p>
                <p>🎮 Play games, get help with tasks, or just chat!</p>
              </div>
            </div>

            {/* Control buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={enableListeningMode}
                className="py-3 px-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl font-medium text-sm active:scale-95 transition-all"
              >
                👂 Listen Only
              </button>
              <button
                onClick={disableListeningMode}
                className="py-3 px-4 bg-green-400 hover:bg-green-500 text-green-900 rounded-xl font-medium text-sm active:scale-95 transition-all"
              >
                🗣️ Auto Respond
              </button>
            </div>

            <button
              onClick={triggerResponse}
              className="w-full py-3 px-4 bg-blue-400 hover:bg-blue-500 text-blue-900 rounded-xl font-medium text-sm active:scale-95 transition-all"
            >
              ⚡ Ask Squeaky to Respond
            </button>
          </div>
        )}

        {/* OpenAI Function Calling Features */}
        {isConnected && (
          <div className="mt-6">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-3 text-center">
                🧠 Squeaky&apos;s Special Abilities
              </h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-medium text-blue-800 mb-1">
                    🌤️ Weather Powers
                  </div>
                  <div className="text-blue-600 text-xs">
                    &quot;What&apos;s the weather in Bengaluru?&quot;
                  </div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="font-medium text-purple-800 mb-1">
                    🧠 Memory System
                  </div>
                  <div className="text-purple-600 text-xs">
                    &quot;Remember that my favorite color is blue&quot;
                    <br />
                    &quot;What do you remember about me?&quot;
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="font-medium text-red-800 mb-1">
                    💡 IoT LED Control
                  </div>
                  <div className="text-red-600 text-xs">
                    &quot;Turn on your LED light&quot;
                    <br />
                    &quot;Make your LED blink 5 times per second&quot;
                    <br />
                    &quot;What&apos;s the status of your LED?&quot;
                  </div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="font-medium text-green-800 mb-1">
                    🎲 Shake Detection
                  </div>
                  <div className="text-green-600 text-xs">
                    Shake your device and I&apos;ll react!
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="font-medium text-orange-800 mb-1">
                    💰 Base Blockchain Powers
                  </div>
                  <div className="text-orange-600 text-xs">
                    &quot;What&apos;s the price of ETH?&quot;
                    <br />
                    &quot;Search for DEGEN token&quot;
                    <br />
                    &quot;How much USDC for 1 ETH?&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <MemoryDisplay isConnected={isConnected} onCallTool={callMCPTool} />

        <MCPToolsSection
          mcpResult={mcpResult}
          mcpLoading={mcpLoading}
          mcpTools={mcpTools}
          onCallTool={callMCPTool}
        />

        <div className="text-center mt-8 text-purple-600 text-sm">
          <p>
            Made with 💖 for kids and adults who love intelligent conversations!
          </p>
        </div>
      </div>
    </div>
  );
}
