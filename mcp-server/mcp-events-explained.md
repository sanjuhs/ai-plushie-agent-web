# 📡 MCP Events & Notifications - Complete Guide

## 🤔 What Are MCP Events?

MCP Events are **proactive notifications** that your MCP server can send to clients **without being asked**. This is perfect for:

- 🌡️ **IoT sensors** (like your Raspberry Pi temperature sensor)
- 📊 **Real-time monitoring** systems
- 🚨 **Alert systems** that need to notify immediately
- 📈 **Live data streams** from external sources

## 🔄 How Events Work vs Regular Tool Calls

### Regular Tool Calls (Request-Response):

```
Client: "Hey server, what's the temperature?"
Server: "It's 22°C"
```

### MCP Events (Proactive Notifications):

```
Server: "🚨 ALERT! Temperature is now 30°C!"
Client: "Thanks for letting me know!"
```

## 🏗️ Event Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│   Next.js API    │◄──►│   MCP Server    │
│  (React SSE)    │    │  (SSE Bridge)    │    │  (Notifications)│
│                 │    │                  │    │                 │
│ EventSource()   │    │ ReadableStream   │    │ console.log()   │
│ onmessage       │    │ controller       │    │ JSON messages   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📤 How MCP Server Sends Events

### 1. **Enable Notifications Capability**

```javascript
this.server = new Server(
  { name: "my-server", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      notifications: {}, // ✅ Enable notifications!
    },
  }
);
```

### 2. **Send Notification via stdout**

```javascript
sendTemperatureUpdate() {
  const notification = {
    method: "notifications/temperature_update", // Notification method
    params: {
      timestamp: new Date().toISOString(),
      temperature: 25.5,
      isAlert: false,
      message: "🌡️ Temperature Update: 25.5°C (Normal)"
    }
  };

  // Send to stdout (this is how MCP sends events!)
  console.log(JSON.stringify(notification));
}
```

### 3. **Trigger Events Periodically**

```javascript
// Start monitoring with setInterval
this.intervalId = setInterval(() => {
  this.simulateTemperatureReading();
  this.sendTemperatureUpdate(); // Send event every 5 seconds
}, 5000);
```

## 📥 How Client Receives Events

### 1. **Next.js API Route (SSE Bridge)**

```javascript
// Listen to MCP server stdout
this.childProcess.stdout.on("data", (data) => {
  const lines = data.toString().split("\n");

  for (const line of lines) {
    try {
      const message = JSON.parse(line);

      // Check if it's a notification
      if (message.method && message.method.startsWith("notifications/")) {
        this.handleEvent(message); // Forward to frontend
      }
    } catch (error) {
      // Ignore non-JSON lines
    }
  }
});
```

### 2. **Server-Sent Events (SSE) to Frontend**

```javascript
// Create SSE stream
const stream = new ReadableStream({
  start(controller) {
    const encoder = new TextEncoder();

    // When MCP event received, send to frontend
    client.onEvent((event) => {
      const eventData = `data: ${JSON.stringify({
        type: "mcp_event",
        event: event.method,
        data: event.params,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      controller.enqueue(encoder.encode(eventData));
    });
  },
});
```

### 3. **Frontend Receives via EventSource**

```javascript
const eventSource = new EventSource("/api/mcp-events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "mcp_event") {
    console.log("🌡️ Temperature update:", data.data.temperature);
    setCurrentTemp(data.data.temperature);

    if (data.data.isAlert) {
      showAlert("🚨 Temperature Alert!");
    }
  }
};
```

## 🎯 Event Flow Example

### Step-by-Step Temperature Alert:

1. **MCP Server** detects temperature > threshold
2. **MCP Server** sends notification via `console.log(JSON.stringify(...))`
3. **API Route** receives notification from server's stdout
4. **API Route** forwards event via SSE to frontend
5. **Frontend** receives event via EventSource
6. **Frontend** updates UI and shows alert

### Complete Flow:

```
🌡️ Sensor Reading (30°C)
    ↓
📊 MCP Server detects threshold exceeded
    ↓
📤 Send notification: {"method": "notifications/temperature_update", ...}
    ↓
📡 API Route receives via stdout
    ↓
📨 Forward via SSE: data: {"type": "mcp_event", ...}
    ↓
🖥️ Frontend EventSource receives message
    ↓
🚨 UI shows alert + updates temperature display
```

## 🛠️ Implementation Details

### MCP Server Side:

```javascript
class EventDrivenMCPServer {
  sendTemperatureUpdate() {
    const notification = {
      method: "notifications/temperature_update",
      params: {
        temperature: this.temperature,
        threshold: this.threshold,
        isAlert: this.temperature > this.threshold,
        message:
          this.temperature > this.threshold
            ? `🚨 Alert! ${this.temperature}°C exceeds ${this.threshold}°C`
            : `🌡️ Normal: ${this.temperature}°C`,
      },
    };

    // This goes to stdout, which the API route listens to
    console.log(JSON.stringify(notification));
  }
}
```

### API Route (SSE Bridge):

```javascript
// GET /api/mcp-events - SSE endpoint
export async function GET(request) {
  const stream = new ReadableStream({
    start(controller) {
      const client = await getEventMCPClient();

      // Register event handler
      client.onEvent((event) => {
        const eventData = `data: ${JSON.stringify({
          type: 'mcp_event',
          event: event.method,
          data: event.params
        })}\n\n`;

        controller.enqueue(encoder.encode(eventData));
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });
}
```

### Frontend (React):

```javascript
useEffect(() => {
  const eventSource = new EventSource("/api/mcp-events");

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setEvents((prev) => [...prev, data]); // Add to events log

    if (
      data.type === "mcp_event" &&
      data.event === "notifications/temperature_update"
    ) {
      setCurrentTemp(data.data.temperature);

      if (data.data.isAlert) {
        // Show alert in UI
        showTemperatureAlert(data.data.message);
      }
    }
  };

  return () => eventSource.close();
}, []);
```

## 🚀 Real-World Applications

### 1. **Raspberry Pi Temperature Sensor**

```javascript
// On your Raspberry Pi MCP server
setInterval(() => {
  const temp = readTemperatureSensor(); // Read actual sensor

  if (temp > THRESHOLD) {
    sendNotification({
      method: "notifications/temperature_alert",
      params: { temperature: temp, location: "Living Room" },
    });
  }
}, 5000);
```

### 2. **Stock Price Alerts**

```javascript
// Monitor stock prices
setInterval(async () => {
  const price = await fetchStockPrice("AAPL");

  if (price > userThreshold) {
    sendNotification({
      method: "notifications/stock_alert",
      params: { symbol: "AAPL", price, threshold: userThreshold },
    });
  }
}, 60000);
```

### 3. **System Monitoring**

```javascript
// Monitor server health
setInterval(() => {
  const cpuUsage = getCPUUsage();
  const memoryUsage = getMemoryUsage();

  if (cpuUsage > 80 || memoryUsage > 90) {
    sendNotification({
      method: "notifications/system_alert",
      params: { cpu: cpuUsage, memory: memoryUsage },
    });
  }
}, 10000);
```

## 💡 Key Benefits

1. **Real-time Updates**: No polling needed - events arrive instantly
2. **Efficient**: Only sends data when something important happens
3. **Scalable**: Can handle multiple clients receiving the same events
4. **Flexible**: Any type of data can be sent as events
5. **Standard**: Uses web standards (SSE) for reliable delivery

## 🔧 Testing Your Setup

1. **Start the event server**: `npm run start:events`
2. **Visit the test page**: `http://localhost:3001/test-mcp`
3. **Click "Start Monitoring"**: Begin receiving events every 5 seconds
4. **Simulate alerts**: Use "Simulate Heat Spike" to trigger alerts
5. **Watch real-time updates**: See events appear instantly in the UI

This simulates exactly how your Raspberry Pi temperature sensor would work in production! 🎉
