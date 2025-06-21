"use client";

import { useState, useEffect, useRef } from "react";

interface MCPEvent {
  type: string;
  event?: string;
  data?: any;
  message?: string;
  timestamp: string;
}

interface TemperatureData {
  temperature: number;
  threshold: number;
  isAlert: boolean;
  status: string;
  message: string;
  timestamp: string;
}

export default function TestMCPPage() {
  const [events, setEvents] = useState<MCPEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  // Connect to MCP Events via Server-Sent Events
  const connectToEvents = () => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    console.log("🔌 Connecting to MCP Events...");
    setConnectionStatus("Connecting...");

    const eventSource = new EventSource("/api/mcp-events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("✅ Connected to MCP Events");
      setIsConnected(true);
      setConnectionStatus("Connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data: MCPEvent = JSON.parse(event.data);
        console.log("📡 MCP Event received:", data);

        setEvents((prev) => [...prev, data]);

        // Handle temperature updates specifically
        if (
          data.type === "mcp_event" &&
          data.event === "notifications/temperature_update"
        ) {
          const tempData = data.data as TemperatureData;
          setCurrentTemp(tempData.temperature);
        }
      } catch (error) {
        console.error("Error parsing event data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ MCP Events connection error:", error);
      setIsConnected(false);
      setConnectionStatus("Connection Error");

      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          eventSourceRef.current = null;
          connectToEvents();
        }
      }, 3000);
    };
  };

  // Disconnect from events
  const disconnectFromEvents = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus("Disconnected");
  };

  // Call MCP tools
  const callMCPTool = async (tool: string, args: any = {}) => {
    try {
      const response = await fetch("/api/mcp-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Tool ${tool} executed:`, data.result);

        // Update monitoring state based on tool calls
        if (tool === "start_monitoring") {
          setIsMonitoring(true);
        } else if (tool === "stop_monitoring") {
          setIsMonitoring(false);
        }

        return data.result;
      } else {
        console.error(`❌ Tool ${tool} failed:`, data.error);
      }
    } catch (error) {
      console.error(`❌ Error calling tool ${tool}:`, error);
    }
  };

  // Clear events log
  const clearEvents = () => {
    setEvents([]);
  };

  // Auto-connect on component mount
  useEffect(() => {
    connectToEvents();

    return () => {
      disconnectFromEvents();
    };
  }, []);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get event color based on type
  const getEventColor = (event: MCPEvent) => {
    if (event.type === "connection") return "bg-blue-50 border-blue-200";
    if (event.type === "error") return "bg-red-50 border-red-200";
    if (event.type === "mcp_event") {
      if (event.data?.isAlert) return "bg-red-50 border-red-300";
      return "bg-green-50 border-green-200";
    }
    return "bg-gray-50 border-gray-200";
  };

  const getEventIcon = (event: MCPEvent) => {
    if (event.type === "connection") return "🔌";
    if (event.type === "error") return "❌";
    if (event.type === "mcp_event") {
      if (event.data?.isAlert) return "🚨";
      return "🌡️";
    }
    return "📡";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">
            🌡️ MCP Temperature Monitor
          </h1>
          <p className="text-indigo-600">
            Real-time events from your MCP server (simulating Raspberry Pi
            sensor)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                📊 Status
              </h2>

              {/* Connection Status */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Connection:
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isConnected
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {connectionStatus}
                  </span>
                </div>
              </div>

              {/* Current Temperature */}
              {currentTemp !== null && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Current Temperature:
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      currentTemp > 25 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {currentTemp.toFixed(1)}°C
                  </div>
                </div>
              )}

              {/* Monitoring Status */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Monitoring:
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isMonitoring
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {isMonitoring ? "🟢 Active" : "🔴 Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                🎛️ Controls
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() =>
                    callMCPTool("start_monitoring", {
                      interval: 5,
                      threshold: 25,
                    })
                  }
                  disabled={isMonitoring}
                  className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  🟢 Start Monitoring
                </button>

                <button
                  onClick={() => callMCPTool("stop_monitoring")}
                  disabled={!isMonitoring}
                  className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  🛑 Stop Monitoring
                </button>

                <button
                  onClick={() =>
                    callMCPTool("simulate_temperature_spike", {
                      temperature: 30,
                    })
                  }
                  className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  🔥 Simulate Heat Spike
                </button>

                <button
                  onClick={() => callMCPTool("get_current_temperature")}
                  className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  🌡️ Get Temperature
                </button>
              </div>
            </div>
          </div>

          {/* Events Log */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  📡 Live Events
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={clearEvents}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    Clear
                  </button>
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${
                        isConnected
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {events.length} events
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {events.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-4xl mb-2">📡</div>
                    <div>Waiting for events...</div>
                    <div className="text-sm mt-2">
                      Click "Start Monitoring" to begin receiving temperature
                      updates
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${getEventColor(
                          event
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2">
                            <span className="text-lg">
                              {getEventIcon(event)}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {event.type === "mcp_event"
                                  ? event.data?.message
                                  : event.message}
                              </div>
                              {event.data && event.type === "mcp_event" && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Temp: {event.data.temperature}°C | Threshold:{" "}
                                  {event.data.threshold}°C | Status:{" "}
                                  {event.data.status}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={eventsEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">
            🚀 How to Test
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                1. Start Monitoring
              </h4>
              <p className="text-gray-600">
                Click "Start Monitoring" to begin receiving temperature updates
                every 5 seconds.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                2. Simulate Events
              </h4>
              <p className="text-gray-600">
                Use "Simulate Heat Spike" to trigger temperature alerts and see
                real-time notifications.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                3. Watch Events
              </h4>
              <p className="text-gray-600">
                The events log shows all temperature updates and alerts as they
                happen.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                4. Real-time Updates
              </h4>
              <p className="text-gray-600">
                This simulates your Raspberry Pi sensor sending data to your web
                app!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
