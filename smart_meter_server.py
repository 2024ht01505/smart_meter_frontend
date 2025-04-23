from flask import Flask, render_template, jsonify
import paho.mqtt.client as mqtt
import json
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

# Define the MQTT settings
broker = 'localhost'
port = 1883
topic = 'smartmeter/device_data'

# Global variable to store the latest data for up to 8 devices
latest_data = [{} for _ in range(9)]

# Define the callback function for when a message is received
def on_message(client, userdata, message):
    global latest_data
    try:
        payload = message.payload.decode()
        data = json.loads(payload)
        device_id = data.get('device_id', 0)
        if 1 <= device_id < 9:
            latest_data[device_id] = data
        logging.info(f"Received data: {data}")
    except Exception as e:
        logging.error(f"Error processing message: {e}")

# Define the callback function for when the client connects to the broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logging.info("Connected to MQTT broker")
        client.subscribe(topic)
    else:
        logging.error(f"Failed to connect to MQTT broker, return code {rc}")

# Define the callback function for when the client disconnects from the broker
def on_disconnect(client, userdata, rc):
    if rc != 0:
        logging.warning(f"Unexpected disconnection from MQTT broker, return code {rc}")

# Create an MQTT client instance
mqtt_client = mqtt.Client()

# Assign the on_message, on_connect, and on_disconnect callback functions
mqtt_client.on_message = on_message
mqtt_client.on_connect = on_connect
mqtt_client.on_disconnect = on_disconnect

# Connect to the MQTT broker with error handling
try:
    mqtt_client.connect(broker, port)
except Exception as e:
    logging.error(f"Error connecting to MQTT broker: {e}")

# Start the MQTT client loop in a separate thread
mqtt_client.loop_start()

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        logging.error(f"Error rendering template: {e}")
        return "An error occurred while rendering the page.", 500

@app.route('/data')
def data():
    try:
        return jsonify(latest_data)
    except Exception as e:
        logging.error(f"Error returning data: {e}")
        return "An error occurred while fetching data.", 500

if __name__ == '__main__':
    try:
        app.run(debug=True)
    except Exception as e:
        logging.error(f"Error starting Flask app: {e}")
 