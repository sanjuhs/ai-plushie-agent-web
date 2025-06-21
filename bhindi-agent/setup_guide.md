# Raspberry Pi LED Agent Setup Guide

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
```

### 2. Test the Agent Locally

```bash
# Run the agent
python3 raspberry_pi_led_agent.py

# In another terminal, test the endpoints
curl -H "x-api-key: test123" http://localhost:5000/tools
curl -H "x-api-key: test123" -X POST http://localhost:5000/tools/turnOnLED
curl -H "x-api-key: test123" -X POST http://localhost:5000/tools/getLEDStatus
```

### 3. Expose with ngrok

```bash
# Install ngrok (if not already installed)
# Download from https://ngrok.com/download or use snap:
sudo snap install ngrok

# Expose your local server
ngrok http 5000
```

Copy the HTTPS URL from ngrok output (e.g., `https://abc123.ngrok.io`)

### 4. Publish to Bhindi

1. Go to [Bhindi.io](https://bhindi.io)
2. Start a new chat
3. Send this message (replace YOUR_NGROK_URL):

```
Add my agent using Bhindi Agent Manager. The details are as follows:

id: raspberry-pi-led-controller
name: Raspberry Pi LED Controller
description: Controls an LED connected to a Raspberry Pi GPIO pin. Can turn LED on/off, make it blink with custom duration and frequency, and check LED status.
endpoint: YOUR_NGROK_URL
```

## Available Tools

- **turnOnLED**: Turn the LED on
- **turnOffLED**: Turn the LED off
- **blinkLED**: Make LED blink (with duration and frequency parameters)
- **getLEDStatus**: Check current LED state

## Troubleshooting

- **Permission Error**: Run with `sudo python3 raspberry_pi_led_agent.py`
- **GPIO Already in Use**: Restart your Pi or run `sudo python3 -c "import RPi.GPIO as GPIO; GPIO.cleanup()"`
- **ngrok Not Working**: Make sure your Pi can reach the internet and ngrok is properly installed

## Circuit Diagram

```
Raspberry Pi GPIO Pin 18 ──── 220Ω Resistor ──── LED Anode (+)
                                                      │
Raspberry Pi GND Pin ──────────────────────────── LED Cathode (-)
```
