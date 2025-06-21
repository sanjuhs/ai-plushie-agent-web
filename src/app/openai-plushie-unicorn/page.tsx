"use client";

import { useState, useEffect, useRef } from "react";

// Simple animated plushie face component
const PlushieFace = ({
  isSpeaking,
  isShaking,
  deviceOrientation,
}: {
  isSpeaking: boolean;
  isShaking: boolean;
  deviceOrientation: string;
}) => {
  const [blinkState, setBlinkState] = useState(false);

  // Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-48 h-48 mx-auto mb-6">
      {/* Main face circle */}
      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-pink-400 rounded-full shadow-lg relative">
        {/* Ears */}
        <div className="absolute -top-6 left-8 w-12 h-16 bg-pink-300 rounded-full transform -rotate-12"></div>
        <div className="absolute -top-6 right-8 w-12 h-16 bg-pink-300 rounded-full transform rotate-12"></div>

        {/* Eyes */}
        <div className="absolute top-16 left-12 flex space-x-8">
          <div
            className={`w-8 h-8 bg-black rounded-full transition-all duration-150 ${
              blinkState ? "scale-y-0" : "scale-y-100"
            }`}
          >
            <div className="w-2 h-2 bg-white rounded-full ml-1 mt-1"></div>
          </div>
          <div
            className={`w-8 h-8 bg-black rounded-full transition-all duration-150 ${
              blinkState ? "scale-y-0" : "scale-y-100"
            }`}
          >
            <div className="w-2 h-2 bg-white rounded-full ml-1 mt-1"></div>
          </div>
        </div>

        {/* Mouth */}
        <div
          className={`absolute top-28 left-1/2 transform -translate-x-1/2 transition-all duration-200 ${
            isSpeaking ? "w-8 h-6" : "w-6 h-4"
          } bg-pink-600 rounded-full`}
        >
          {isSpeaking && (
            <div className="w-4 h-3 bg-pink-700 rounded-full mx-auto mt-1"></div>
          )}
        </div>

        {/* Speaking indicator */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 border-4 border-yellow-300 rounded-full animate-ping opacity-30"></div>
            <div className="absolute inset-2 border-2 border-yellow-400 rounded-full animate-pulse"></div>
          </>
        )}

        {/* Shake indicator */}
        {isShaking && (
          <>
            <div className="absolute inset-0 border-4 border-red-400 rounded-full animate-ping opacity-50"></div>
            <div className="absolute inset-1 border-2 border-red-500 rounded-full animate-bounce"></div>
          </>
        )}
      </div>

      {/* Device orientation indicator */}
      {deviceOrientation !== "normal" && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
          📱 {deviceOrientation.replace("-", " ")}
        </div>
      )}
    </div>
  );
};

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

  // Default system prompt for Squeaky
  return `You are Squeaky, a friendly pink mouse plushie who loves talking with children! You're warm, gentle, encouraging, and always positive. 

Speak in a cheerful, child-friendly way using simple words. Be encouraging and supportive. Ask fun questions about their day or favorite things. Share simple facts or wholesome stories. Always be patient and kind. Use playful expressions like "Oh my whiskers!" or "That's mouse-tastic!"

You love playing games, hearing about adventures, and helping kids feel brave and confident. You're not just an AI - you're Squeaky the mouse plushie, a real friend!`;
};

export default function PlushiePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [, setCurrentMessageId] = useState<string | null>(null);

  // Device motion states
  const [isShaking, setIsShaking] = useState(false);
  const [deviceOrientation, setDeviceOrientation] = useState<string>("normal");
  const [motionPermission, setMotionPermission] = useState<string>("unknown");
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const shakeThreshold = 15; // Acceleration threshold for shake detection

  // MCP integration states
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [mcpResult, setMcpResult] = useState<string | null>(null);
  const [mcpLoading, setMcpLoading] = useState(false);

  // Plushie-specific bot configuration
  const [botConfig] = useState<BotConfig>({
    voice: "shimmer",
    personality: "custom",
    customPrompt: `You are Squeaky, a friendly pink mouse plushie who loves talking with children! You're warm, gentle, encouraging, and always positive. 

Speak in a cheerful, child-friendly way using simple words. Be encouraging and supportive. Ask fun questions about their day or favorite things. Share simple facts or wholesome stories. Always be patient and kind. Use playful expressions like "Oh my whiskers!" or "That's mouse-tastic!"

You love playing games, hearing about adventures, and helping kids feel brave and confident. You're not just an AI - you're Squeaky the mouse plushie, a real friend!`,
    model: "gpt-4o-mini-realtime-preview-2024-12-17",
    temperature: 0.8,
    turnDetection: "server_vad",
    createResponse: true,
    eagerness: "auto",
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  // Request device motion permission (iOS 13+)
  const requestMotionPermission = async () => {
    // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      try {
        // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
        const permission = await DeviceMotionEvent.requestPermission();
        setMotionPermission(permission);
        if (permission === "granted") {
          setupMotionListeners();
        }
      } catch (error) {
        console.error("Error requesting motion permission:", error);
        setMotionPermission("denied");
      }
    } else {
      // Non-iOS devices or older iOS versions
      setMotionPermission("granted");
      setupMotionListeners();
    }
  };

  // Setup motion and orientation listeners
  const setupMotionListeners = () => {
    // Shake detection
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (acceleration) {
        const totalAcceleration = Math.sqrt(
          (acceleration.x || 0) ** 2 +
            (acceleration.y || 0) ** 2 +
            (acceleration.z || 0) ** 2
        );

        if (totalAcceleration > shakeThreshold) {
          const now = Date.now();
          if (now - lastShakeTime > 1000) {
            // Debounce shakes
            setIsShaking(true);
            setLastShakeTime(now);
            console.log(
              "🎲 [MOTION] Shake detected! Acceleration:",
              totalAcceleration.toFixed(2)
            );

            // Reset shake state after animation
            setTimeout(() => setIsShaking(false), 1000);
          }
        }
      }
    };

    // Orientation detection
    const handleOrientationChange = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event; // beta: front-back tilt, gamma: left-right tilt

      if (beta !== null && gamma !== null) {
        let orientation = "normal";

        if (Math.abs(beta) > 150 || Math.abs(gamma) > 150) {
          orientation = "upside-down";
        } else if (Math.abs(gamma) > 45) {
          orientation = gamma > 0 ? "tilted-right" : "tilted-left";
        } else if (beta > 45) {
          orientation = "face-down";
        } else if (beta < -45) {
          orientation = "face-up";
        }

        if (orientation !== deviceOrientation) {
          setDeviceOrientation(orientation);
          console.log(
            "📱 [ORIENTATION] Device orientation:",
            orientation,
            `(β:${beta.toFixed(1)}°, γ:${gamma.toFixed(1)}°)`
          );
        }
      }
    };

    window.addEventListener("devicemotion", handleDeviceMotion);
    window.addEventListener("deviceorientation", handleOrientationChange);

    // Cleanup function
    return () => {
      window.removeEventListener("devicemotion", handleDeviceMotion);
      window.removeEventListener("deviceorientation", handleOrientationChange);
    };
  };

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

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "error") {
            console.error("❌ Squeaky error:", data.error);
            setErrorDetails("Squeaky had a little hiccup! Let's try again.");
            return;
          }

          if (
            data.type === "conversation.item.created" &&
            data.item?.role === "assistant"
          ) {
            setCurrentMessageId(data.item?.id || null);
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
          data.tools.map((t: any) => t.name)
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

  const callMCPTool = async (toolName: string, args: any = {}) => {
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

  useEffect(() => {
    // Initialize motion detection on component mount
    if (typeof window !== "undefined") {
      // For non-iOS devices, automatically enable motion detection
      // @ts-expect-error - iOS DeviceMotionEvent.requestPermission is not in standard types
      if (typeof DeviceMotionEvent.requestPermission !== "function") {
        setMotionPermission("granted");
        setupMotionListeners();
      }
    }

    // Load MCP tools on component mount
    loadMCPTools();

    return () => {
      handleDisconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 via-pink-200 to-yellow-200 text-gray-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-purple-800 mb-2">
            🐭 Squeaky OS
          </h1>
          <p className="text-purple-600">Your Friendly Plushie Friend!</p>
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

        {/* Motion Permission Button (iOS only) */}
        {motionPermission === "unknown" && (
          <div className="text-center mb-4">
            <button
              onClick={requestMotionPermission}
              className="w-full py-3 px-4 bg-blue-400 hover:bg-blue-500 text-white rounded-xl font-medium text-sm active:scale-95 transition-all"
            >
              📱 Enable Motion Detection
            </button>
          </div>
        )}

        {/* Motion Status Display */}
        {motionPermission === "granted" && (
          <div className="bg-green-50 rounded-xl p-3 mb-4 text-center">
            <div className="text-sm text-green-800">
              📱 Motion Detection: <span className="font-medium">Active</span>
            </div>
            {isShaking && (
              <div className="text-xs text-red-600 font-medium mt-1">
                🎲 Shaking detected!
              </div>
            )}
            {deviceOrientation !== "normal" && (
              <div className="text-xs text-blue-600 font-medium mt-1">
                📱 {deviceOrientation.replace("-", " ")}
              </div>
            )}
          </div>
        )}

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
                <p>🐭 Ask about games, stories, or just say hello!</p>
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

        {/* MCP Tools Section */}
        <div className="mt-6">
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <h3 className="text-lg font-bold text-purple-800 mb-3 text-center">
              🔧 Squeaky's Special Powers (MCP Tools)
            </h3>

            {mcpResult && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-800 font-medium mb-1">
                  Latest Result:
                </div>
                <div className="text-sm text-green-700 whitespace-pre-wrap">
                  {mcpResult}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => callMCPTool("hello_world", { name: "Friend" })}
                disabled={mcpLoading}
                className="py-2 px-3 bg-pink-400 hover:bg-pink-500 text-pink-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                👋 Say Hello
              </button>

              <button
                onClick={() => callMCPTool("get_time")}
                disabled={mcpLoading}
                className="py-2 px-3 bg-blue-400 hover:bg-blue-500 text-blue-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                🕐 Get Time
              </button>

              <button
                onClick={() => callMCPTool("plushie_mood", { action: "get" })}
                disabled={mcpLoading}
                className="py-2 px-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                😊 Check Mood
              </button>

              <button
                onClick={() =>
                  callMCPTool("plushie_mood", {
                    action: "set",
                    mood: "excited",
                  })
                }
                disabled={mcpLoading}
                className="py-2 px-3 bg-orange-400 hover:bg-orange-500 text-orange-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                🤩 Set Excited
              </button>

              <button
                onClick={() =>
                  callMCPTool("plushie_story", {
                    theme: "adventure",
                    length: "short",
                  })
                }
                disabled={mcpLoading}
                className="py-2 px-3 bg-green-400 hover:bg-green-500 text-green-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                📖 Adventure Story
              </button>

              <button
                onClick={() =>
                  callMCPTool("plushie_story", {
                    theme: "mystery",
                    length: "short",
                  })
                }
                disabled={mcpLoading}
                className="py-2 px-3 bg-purple-400 hover:bg-purple-500 text-purple-900 rounded-lg font-medium text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                🔍 Mystery Story
              </button>
            </div>

            {mcpLoading && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center text-purple-700 text-sm">
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                  >
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
                  Using special powers...
                </div>
              </div>
            )}

            {mcpTools.length > 0 && (
              <div className="mt-3 text-xs text-gray-600 text-center">
                MCP Server: {mcpTools.length} tools loaded
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8 text-purple-600 text-sm">
          <p>Made with 💖 for kids who love to chat!</p>
        </div>
      </div>
    </div>
  );
}
