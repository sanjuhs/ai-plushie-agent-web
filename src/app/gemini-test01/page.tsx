"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// @ts-ignore - Fix Blob type conflict between DOM and Gemini library
declare const Blob: any;
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
} from "@google/genai";
import { createBlob, decode, decodeAudioData } from "../../lib/gemini-utils";

export default function GeminiLiveTest() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Use ref for recording state in audio callback to avoid stale closure
  const isRecordingRef = useRef(false);

  // Audio contexts and nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);

  // Media and session refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const clientRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // Initialize audio contexts
  const initAudio = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({
        sampleRate: 16000,
      });
      outputAudioContextRef.current = new AudioContextClass({
        sampleRate: 24000,
      });

      inputNodeRef.current = inputAudioContextRef.current.createGain();
      outputNodeRef.current = outputAudioContextRef.current.createGain();

      outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

      return true;
    } catch (err) {
      console.error("Error initializing audio:", err);
      setError("Failed to initialize audio contexts");
      return false;
    }
  };

  // Initialize Gemini client
  const initClient = async () => {
    try {
      console.log("🔵 [GEMINI] Starting client initialization...");
      setStatus("Fetching API key...");

      // Fetch API key from serverless endpoint
      console.log("🔵 [GEMINI] Fetching API key from /api/gemini-key...");
      const response = await fetch("/api/gemini-key");
      const data = await response.json();
      console.log("🔵 [GEMINI] API key response:", {
        status: response.status,
        hasApiKey: !!data.apiKey,
      });

      if (!response.ok || !data.apiKey) {
        throw new Error(data.error || "Failed to get API key");
      }

      setStatus("Initializing Gemini client...");
      console.log("🔵 [GEMINI] Creating GoogleGenAI client...");

      clientRef.current = new GoogleGenAI({
        apiKey: data.apiKey,
      });
      console.log("🔵 [GEMINI] GoogleGenAI client created successfully");

      await initSession();
      setIsInitialized(true);
      setStatus("Ready! Click Start to begin recording.");
      console.log("🔵 [GEMINI] Client initialization complete!");
    } catch (err) {
      console.error("❌ [GEMINI] Error initializing client:", err);
      setError(
        `Failed to initialize: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Initialize session
  const initSession = async () => {
    if (
      !clientRef.current ||
      !outputAudioContextRef.current ||
      !outputNodeRef.current
    ) {
      throw new Error("Client or audio context not initialized");
    }

    try {
      console.log("🟢 [GEMINI] Starting session initialization...");
      const model = "gemini-2.5-flash-preview-native-audio-dialog";
      console.log("🟢 [GEMINI] Using model:", model);

      console.log("🟢 [GEMINI] Attempting to connect to Gemini Live...");
      sessionRef.current = await clientRef.current.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log("✅ [GEMINI] Session opened successfully!");
            setStatus("Session opened - Ready to record!");
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log(
              "📨 [GEMINI] Received message:",
              (message as any).type || "unknown"
            );
            console.log(
              "📨 [GEMINI] Full message:",
              JSON.stringify(message, null, 2)
            );

            const audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData;

            if (audio && audio.data) {
              console.log(
                "🎵 [GEMINI] Audio data received, length:",
                audio.data.length
              );

              if (outputAudioContextRef.current && outputNodeRef.current) {
                nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  outputAudioContextRef.current.currentTime
                );

                try {
                  console.log("🎵 [GEMINI] Decoding audio data...");
                  const audioBuffer = await decodeAudioData(
                    decode(audio.data),
                    outputAudioContextRef.current,
                    24000,
                    1
                  );
                  console.log(
                    "🎵 [GEMINI] Audio decoded, duration:",
                    audioBuffer.duration
                  );

                  const source =
                    outputAudioContextRef.current.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNodeRef.current);

                  source.addEventListener("ended", () => {
                    console.log("🎵 [GEMINI] Audio playback ended");
                    sourcesRef.current.delete(source);
                  });

                  source.start(nextStartTimeRef.current);
                  console.log(
                    "🎵 [GEMINI] Audio playback started at:",
                    nextStartTimeRef.current
                  );
                  nextStartTimeRef.current =
                    nextStartTimeRef.current + audioBuffer.duration;
                  sourcesRef.current.add(source);
                } catch (audioError) {
                  console.error(
                    "❌ [GEMINI] Error processing audio:",
                    audioError
                  );
                }
              }
            } else {
              console.log("📨 [GEMINI] Message has no audio data");
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              console.log(
                "🛑 [GEMINI] Session interrupted, stopping all audio"
              );
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("❌ [GEMINI] Session error:", e.message);
            setError(`Session error: ${e.message}`);
          },
          onclose: (e: CloseEvent) => {
            console.log(
              "🔴 [GEMINI] Session closed - Code:",
              e.code,
              "Reason:",
              e.reason,
              "WasClean:",
              e.wasClean
            );
            setStatus(`Session closed: ${e.reason}`);
            setIsRecording(false);
            isRecordingRef.current = false;
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
          },
        },
      });
      console.log("✅ [GEMINI] Session connection established!");
    } catch (err) {
      console.error("❌ [GEMINI] Error initializing session:", err);
      throw err;
    }
  };

  // Start recording
  const startRecording = async () => {
    console.log("🎤 [GEMINI] startRecording called");
    console.log(
      "🎤 [GEMINI] Current state - isRecording:",
      isRecording,
      "hasInputContext:",
      !!inputAudioContextRef.current,
      "hasInputNode:",
      !!inputNodeRef.current,
      "hasSession:",
      !!sessionRef.current
    );

    if (
      isRecording ||
      !inputAudioContextRef.current ||
      !inputNodeRef.current ||
      !sessionRef.current
    ) {
      console.log("🎤 [GEMINI] Early return - conditions not met");
      return;
    }

    try {
      console.log("🎤 [GEMINI] Resuming audio context...");
      await inputAudioContextRef.current.resume();
      console.log(
        "🎤 [GEMINI] Audio context resumed, state:",
        inputAudioContextRef.current.state
      );
      setStatus("Requesting microphone access...");

      console.log("🎤 [GEMINI] Requesting microphone access...");
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      console.log(
        "🎤 [GEMINI] Microphone access granted, tracks:",
        mediaStreamRef.current.getTracks().length
      );

      setStatus("Microphone access granted. Starting capture...");

      console.log("🎤 [GEMINI] Creating media stream source...");
      sourceNodeRef.current =
        inputAudioContextRef.current.createMediaStreamSource(
          mediaStreamRef.current
        );
      sourceNodeRef.current.connect(inputNodeRef.current);
      console.log("🎤 [GEMINI] Media stream source connected");

      const bufferSize = 256;
      console.log(
        "🎤 [GEMINI] Creating script processor with buffer size:",
        bufferSize
      );
      scriptProcessorNodeRef.current =
        inputAudioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

      scriptProcessorNodeRef.current.onaudioprocess = async (
        audioProcessingEvent
      ) => {
        if (!isRecordingRef.current || !sessionRef.current) {
          console.log(
            "🎤 [GEMINI] Audio process skipped - isRecording:",
            isRecordingRef.current,
            "hasSession:",
            !!sessionRef.current
          );
          return;
        }

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // Check if we actually have audio data
        const hasAudio = pcmData.some((sample) => Math.abs(sample) > 0.001);
        console.log(
          "🎤 [GEMINI] Audio chunk - size:",
          pcmData.length,
          "hasAudio:",
          hasAudio,
          "maxLevel:",
          Math.max(...pcmData.map(Math.abs))
        );

        if (hasAudio) {
          console.log("🎤 [GEMINI] Sending audio chunk to Gemini...");
          try {
            const audioBlob = createBlob(pcmData);
            console.log(
              "🎤 [GEMINI] Created audio blob - type:",
              audioBlob.type,
              "size:",
              audioBlob.size
            );

            // Convert blob to base64 for Gemini (newer format)
            const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const base64Data = btoa(String.fromCharCode(...uint8Array));

            sessionRef.current.sendRealtimeInput({
              audio: {
                data: base64Data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
            console.log(
              "🎤 [GEMINI] Audio chunk sent successfully (base64 length:",
              base64Data.length,
              ")"
            );
          } catch (sendError) {
            console.error("❌ [GEMINI] Error sending audio:", sendError);
            if (
              (sendError as Error).message?.includes("CLOSING") ||
              (sendError as Error).message?.includes("CLOSED")
            ) {
              console.log("🔴 [GEMINI] WebSocket closed, stopping recording");
              setIsRecording(false);
              isRecordingRef.current = false;
            }
          }
        }
      };

      console.log("🎤 [GEMINI] Connecting audio processing chain...");
      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(
        inputAudioContextRef.current.destination
      );

      setIsRecording(true);
      isRecordingRef.current = true; // Set ref immediately for audio callback
      setStatus("🔴 Recording... Speak now!");
      setError("");
      console.log("🎤 [GEMINI] Recording started successfully!");
    } catch (err) {
      console.error("❌ [GEMINI] Error starting recording:", err);
      setError(
        `Recording error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      stopRecording();
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!isRecording && !mediaStreamRef.current) return;

    setStatus("Stopping recording...");
    setIsRecording(false);
    isRecordingRef.current = false; // Set ref immediately

    if (scriptProcessorNodeRef.current && sourceNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setStatus("Recording stopped. Click Start to begin again.");
  };

  // Reset session
  const reset = async () => {
    sessionRef.current?.close();
    setStatus("Resetting session...");
    try {
      await initSession();
      setStatus("Session reset. Ready to record!");
    } catch (err) {
      console.error("Error resetting session:", err);
      setError("Failed to reset session");
    }
  };

  // Initialize on component mount
  useEffect(() => {
    const init = async () => {
      if (initAudio()) {
        await initClient();
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      stopRecording();
      sessionRef.current?.close();
      inputAudioContextRef.current?.close();
      outputAudioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🤖 Gemini Live Kit
          </h1>
          <p className="text-gray-600">
            Real-time voice conversation with Gemini AI
          </p>
        </div>

        {/* Status Display */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-lg">
          <div className="text-center">
            {error ? (
              <div className="text-red-600 font-medium mb-2">❌ {error}</div>
            ) : (
              <div className="text-gray-700 mb-2">{status}</div>
            )}

            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isInitialized
                  ? isRecording
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  isInitialized
                    ? isRecording
                      ? "bg-red-500 animate-pulse"
                      : "bg-green-500"
                    : "bg-gray-500"
                }`}
              ></div>
              {isRecording
                ? "Recording"
                : isInitialized
                ? "Ready"
                : "Initializing"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4 mb-6">
          {/* Reset Button */}
          <button
            onClick={reset}
            disabled={isRecording || !isInitialized}
            className="p-4 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-full shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
            title="Reset Session"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="currentColor"
            >
              <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>

          {/* Start Button */}
          <button
            onClick={startRecording}
            disabled={isRecording || !isInitialized}
            className="p-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-full shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
            title="Start Recording"
          >
            <svg
              viewBox="0 0 100 100"
              width="24px"
              height="24px"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="50" />
            </svg>
          </button>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className="p-4 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-full shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed"
            title="Stop Recording"
          >
            <svg
              viewBox="0 0 100 100"
              width="24px"
              height="24px"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="20" y="20" width="60" height="60" rx="8" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm">
          <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800">
            <li>Wait for initialization to complete</li>
            <li>Click the red circle to start recording</li>
            <li>Speak naturally to Gemini</li>
            <li>Click the black square to stop recording</li>
            <li>Use reset button to start a new session</li>
          </ol>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
