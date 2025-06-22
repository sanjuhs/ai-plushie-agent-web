#!/usr/bin/env python3
"""
Raspberry Pi LED Agent for Bhindi Platform
A simple IoT agent that controls an LED connected to GPIO pin 18

Requirements:
- pip install flask RPi.GPIO
- Connect LED to GPIO pin 18 with appropriate resistor
- Run with: python3 raspberry_pi_led_agent.py
"""

from flask import Flask, request, jsonify
import RPi.GPIO as GPIO
import time
import threading
from functools import wraps

# GPIO Setup
LED_PIN = 18
GPIO.setmode(GPIO.BCM)
GPIO.setup(LED_PIN, GPIO.OUT)
GPIO.output(LED_PIN, GPIO.LOW)

# Global state
led_state = False
blink_thread = None
blink_active = False

app = Flask(__name__)

# Authentication decorator
def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('x-api-key')
        if not api_key:
            return create_error_response("API key required", 401, "Missing x-api-key header")
        # In a real implementation, you'd validate the API key
        # For demo purposes, we'll accept any non-empty key
        return f(*args, **kwargs)
    return decorated_function

# Response helper functions
def create_success_response(data, response_type='mixed'):
    """Create a Bhindi-compliant success response"""
    if response_type == 'text':
        return {
            "success": True,
            "responseType": "text",
            "data": {
                "text": data
            }
        }
    elif response_type == 'mixed':
        return {
            "success": True,
            "responseType": "mixed",
            "data": data
        }

def create_error_response(message, code=500, details=""):
    """Create a Bhindi-compliant error response"""
    return {
        "success": False,
        "error": {
            "message": message,
            "code": code,
            "details": details
        }
    }, code

# LED control functions
def turn_on_led():
    global led_state
    GPIO.output(LED_PIN, GPIO.HIGH)
    led_state = True

def turn_off_led():
    global led_state, blink_active
    blink_active = False  # Stop any blinking
    GPIO.output(LED_PIN, GPIO.LOW)
    led_state = False

def blink_led_worker(duration, frequency):
    """Worker function for LED blinking"""
    global blink_active
    blink_active = True
    interval = 1.0 / frequency / 2  # Half period for on/off cycle
    end_time = time.time() + duration
    
    while blink_active and time.time() < end_time:
        GPIO.output(LED_PIN, GPIO.HIGH)
        time.sleep(interval)
        if not blink_active:
            break
        GPIO.output(LED_PIN, GPIO.LOW)
        time.sleep(interval)
    
    # Ensure LED is off when blinking stops
    GPIO.output(LED_PIN, GPIO.LOW)
    blink_active = False

# Required Endpoint 1: GET /tools
@app.route('/tools', methods=['GET'])
@require_api_key
def get_tools():
    """Return available LED control tools"""
    tools = [
        {
            "name": "turnOnLED",
            "description": "Turn on the LED connected to the Raspberry Pi",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "turnOffLED", 
            "description": "Turn off the LED connected to the Raspberry Pi",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        },
        {
            "name": "blinkLED",
            "description": "Make the LED blink for a specified duration and frequency",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration": {
                        "type": "number",
                        "description": "How long to blink in seconds",
                        "default": 5
                    },
                    "frequency": {
                        "type": "number", 
                        "description": "Blinks per second (Hz)",
                        "default": 2
                    }
                },
                "required": []
            },
            "confirmationRequired": True
        },
        {
            "name": "getLEDStatus",
            "description": "Get the current status of the LED (on/off/blinking)",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    ]
    
    return jsonify({"tools": tools})

# Required Endpoint 2: POST /tools/<toolName>
@app.route('/tools/<tool_name>', methods=['POST'])
@require_api_key
def execute_tool(tool_name):
    """Execute a specific LED control tool"""
    global blink_thread, blink_active
    
    try:
        data = request.get_json() or {}
        
        if tool_name == "turnOnLED":
            turn_on_led()
            return jsonify(create_success_response({
                "message": "LED turned ON successfully",
                "led_status": "on",
                "gpio_pin": LED_PIN
            }))
            
        elif tool_name == "turnOffLED":
            turn_off_led()
            return jsonify(create_success_response({
                "message": "LED turned OFF successfully", 
                "led_status": "off",
                "gpio_pin": LED_PIN
            }))
            
        elif tool_name == "blinkLED":
            # Stop any existing blink
            blink_active = False
            if blink_thread and blink_thread.is_alive():
                blink_thread.join(timeout=1)
            
            # Get parameters with defaults
            duration = data.get('duration', 5)
            frequency = data.get('frequency', 2)
            
            # Validate parameters
            if duration <= 0 or duration > 60:
                return create_error_response("Duration must be between 0 and 60 seconds", 400)
            if frequency <= 0 or frequency > 10:
                return create_error_response("Frequency must be between 0 and 10 Hz", 400)
            
            # Start blinking in a separate thread
            blink_thread = threading.Thread(target=blink_led_worker, args=(duration, frequency))
            blink_thread.start()
            
            return jsonify(create_success_response({
                "message": f"LED blinking started for {duration} seconds at {frequency} Hz",
                "led_status": "blinking",
                "duration": duration,
                "frequency": frequency,
                "gpio_pin": LED_PIN
            }))
            
        elif tool_name == "getLEDStatus":
            status = "blinking" if blink_active else ("on" if led_state else "off")
            return jsonify(create_success_response({
                "led_status": status,
                "gpio_pin": LED_PIN,
                "message": f"LED is currently {status}"
            }))
            
        else:
            return create_error_response(f"Unknown tool: {tool_name}", 404)
            
    except Exception as e:
        return create_error_response(f"Error executing tool: {str(e)}", 500)

# Root endpoint for basic info
@app.route('/', methods=['GET'])
def root():
    """Root endpoint - basic agent info"""
    return jsonify({
        "agent": "Raspberry Pi LED Controller",
        "version": "1.0.0",
        "description": "Controls an LED connected to GPIO pin 18",
        "endpoints": {
            "tools": "/tools",
            "health": "/health"
        },
        "gpio_pin": LED_PIN
    })

# Optional health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "agent": "Raspberry Pi LED Controller",
        "gpio_pin": LED_PIN,
        "led_status": "blinking" if blink_active else ("on" if led_state else "off")
    })

# Cleanup function
def cleanup():
    """Clean up GPIO on exit"""
    global blink_active
    blink_active = False
    GPIO.output(LED_PIN, GPIO.LOW)
    GPIO.cleanup()

if __name__ == '__main__':
    try:
        print("🚀 Starting Raspberry Pi LED Agent for Bhindi Platform")
        print(f"📍 LED connected to GPIO pin {LED_PIN}")
        print("🔗 Use ngrok to expose this server publicly")
        print("📋 Available at: http://localhost:5000")
        print("🛠️  Test with: curl -H 'x-api-key: test123' http://localhost:5000/tools")
        print("⚠️  Start ngrok with: ngrok http 5000 --host-header=rewrite")
        print("📝 Or for static domain: ngrok http 5000 --host-header=your-domain.ngrok.io")
        
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        cleanup() 