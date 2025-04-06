from flask import Flask, render_template, jsonify
import paho.mqtt.client as mqtt
import json

app = Flask(__name__)

# Define the MQTT settings
broker = 'localhost'
port = 1883
topic = 'smartmeter/device_data'

# Global variable to store the latest data for up to 8 devices
latest_data = [{} for _ in range(9)]

# Define the callback function for when a message is received
def on_message(client, userdata, message):
    global latest_data
    payload = message.payload.decode()
    data = json.loads(payload)
    device_id = data.get('device_id', 0)
    if 1 <= device_id < 9:
        latest_data[device_id] = data
    print(f"Received data: {data}")

# Define the callback function for when the client connects to the broker
def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    client.subscribe(topic)

# Create an MQTT client instance
mqtt_client = mqtt.Client()

# Assign the on_message and on_connect callback functions
mqtt_client.on_message = on_message
mqtt_client.on_connect = on_connect

# Connect to the MQTT broker
mqtt_client.connect(broker, port)

# Start the MQTT client loop in a separate thread
mqtt_client.loop_start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data')
def data():
    return jsonify(latest_data)

if __name__ == '__main__':
    app.run(debug=True)
