# Raspberry Pi LED Agent Setup Guide (with CORS Support)

## Hardware Setup

1. **Connect the LED to your Raspberry Pi:**
   - LED long leg (anode) → 220Ω resistor → GPIO pin 18
   - LED short leg (cathode) → Ground (GND) pin

## Software Setup

### 1. Install Dependencies

```bash
# Update your Pi
sudo apt update && sudo apt upgrade -y

# Install Python pip if not already installed
sudo apt install python3-pip -y

# Install required Python packages
pip3 install -r requirements.txt

# Or install manually:
pip3 install flask flask-cors RPi.GPIO
```

### 2. Test the Agent Locally

```bash
# Run the agent
python3 raspberry_pi_led_agent.py

# In another terminal, test the endpoints
curl -H "x-api-key: test123" http://localhost:5000/tools
curl -H "x-api-key: test123" -H "Content-Type: application/json" -X POST http://localhost:5000/tools/turnOnLED -d '{}'
curl -H "x-api-key: test123" -H "Content-Type: application/json" -X POST http://localhost:5000/tools/getLEDStatus -d '{}'
```

### 3. Expose with ngrok (with CORS support)

```bash
# Install ngrok (if not already installed)
sudo snap install ngrok

# Expose your local server with host header rewriting
ngrok http --domain=exact-marlin-splendid.ngrok-free.app 5000 --host-header=rewrite
```

### 4. Test CORS from Browser

Open browser developer console and test:

```javascript
fetch("https://exact-marlin-splendid.ngrok-free.app/tools", {
  method: "GET",
  headers: {
    "x-api-key": "test123",
  },
})
  .then((response) => response.json())
  .then((data) => console.log(data));
```

### 5. Publish to Bhindi

1. Go to [Bhindi.io](https://bhindi.io)
2. Start a new chat
3. Send this message:

```
Add my agent using Bhindi Agent Manager. The details are as follows:

id: raspberry-pi-led-controller
name: Raspberry Pi LED Controller
description: Controls an LED connected to a Raspberry Pi GPIO pin. Can turn LED on/off, make it blink with custom duration and frequency, and check LED status. Includes CORS support for web applications.
endpoint: https://exact-marlin-splendid.ngrok-free.app
```

## CORS Configuration Details

The Flask app now includes:

- **Origins**: `*` (allows all domains)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, x-api-key
- **Preflight**: Automatic handling of OPTIONS requests

## Available Tools

- **turnOnLED**: Turn the LED on
- **turnOffLED**: Turn the LED off
- **blinkLED**: Make LED blink (with duration and frequency parameters)
- **getLEDStatus**: Check current LED state

## Troubleshooting

- **CORS Error**: Make sure flask-cors is installed: `pip3 install flask-cors`
- **Permission Error**: Run with `sudo python3 raspberry_pi_led_agent.py`
- **GPIO Already in Use**: Run `sudo python3 -c "import RPi.GPIO as GPIO; GPIO.cleanup()"`
- **ngrok Host Header**: Use `--host-header=rewrite` flag

## Security Note

The current CORS configuration allows all origins (`*`) for development/demo purposes.
For production, consider restricting to specific domains:

```python
CORS(app, resources={
    r"/*": {
        "origins": ["https://bhindi.io", "https://your-domain.com"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "x-api-key"]
    }
})
```
