#############################################
# Wall-e Robot Web-interface
#
# @file       app.py
# @brief      Flask web-interface to control Wall-e robot
# @author     Simon Bluett
# @website    https://wired.chillibasket.com
# @copyright  Copyright (C) 2021-2024 - Distributed under MIT license
# @version    3.0
# @date       9th June 2024
#############################################

from flask import Flask, request, session, redirect, url_for, jsonify, render_template

import os
import sys
from queue import Queue
from threading import Event, Thread
from serial import Serial
import serial.tools.list_ports
import subprocess
import time
import tempfile
from picamera2_stream import PiCameraStreamer
import logging
from waitress import serve


app = Flask(__name__)

# Load the configurations
if os.path.isfile("local_config.py"):
    app.config.from_pyfile("local_config.py")
else:
    app.config.from_pyfile("config.py")

# Set up global variables
volume: int = 8
startup: bool = False
camera: PiCameraStreamer = PiCameraStreamer()

# Set up logging
logger = logging.getLogger()
stream_handler = logging.StreamHandler(sys.stdout)

if app.config['APP_DEBUG']:
    logger.setLevel(logging.DEBUG)
    stream_handler.setLevel(logging.DEBUG)
else:
    logger.setLevel(logging.INFO)
    stream_handler.setLevel(logging.INFO)

logger.addHandler(stream_handler)



###############################################################
#
# Arduino Device Class
#
###############################################################

class ArduinoDevice:
    """Class used for managing communication with the Arduino"""

    # ---------------------------------------------------------
    def __init__(self):
        """
        Constructor for Arduino serial communication thread class
        :param port:     The serial port where the Arduino is connected
        """
        self.queue: Queue = Queue()
        self.exit_flag: Event = Event()
        self.port_name: str = ""
        self.serial_port: Serial | None = None
        self.serial_thread: Thread | None = None
        self.battery_level: str | None = None
        self.exit_flag.clear()

    # ---------------------------------------------------------
    def __del__(self):
        """Destructor - ensures serial port is closed correctly"""
        self.disconnect()

    # ---------------------------------------------------------
    def connect(self, port: str | int = "") -> bool:
        """
        Connect to the serial port
        :param port: The port to connect to (leave blank to use previous port)
        :return: True if connected successfully, False otherwise
        """
        try:
            usb_ports = [
                p.device for p in serial.tools.list_ports.comports()
            ]

            if type(port) is str and port == "":
                port = self.port_name

            if type(port) is int and port >= 0 and port < len(usb_ports):
                port = usb_ports[port]

            # Check port exists and we are not already connected
            if ((not self.is_connected() or port != self.port_name) and port in usb_ports):
                
               # Ensure old port is properly disconnected first
                self.disconnect() 

                # Connect to the new port
                self.serial_port = Serial(port, 115200)
                self.serial_port.flushInput()
                self.port_name = port

                # Start the command handler in a background thread
                self.exit_flag.clear()
                self.serial_thread = Thread(target = self.__communication_thread)
                self.serial_thread.start()

        except Exception as ex:
            logger.error(f'Serial connect error: {repr(ex)}')

        return self.is_connected()

    # ---------------------------------------------------------
    def disconnect(self) -> bool:
        """
        Disconnect from the serial port
        :return: True if disconnected successfully, False otherwise
        """
        try:
            self.battery_level = None

            if self.serial_thread is not None:
                self.exit_flag.set()
                self.serial_thread.join()
                self.serial_thread = None

            if self.serial_port is not None:
                self.serial_port.close()
                self.serial_port = None

        except Exception as ex:
            logger.error(f'Serial disconnect error: {repr(ex)}')

        return (self.serial_thread is None and self.serial_port is None)

    # ---------------------------------------------------------
    def is_connected(self) -> bool:
        """
        Check if serial device is connected
        :return: True if connected, False otherwise
        """
        return (self.serial_thread is not None and self.serial_thread.is_alive()
             and self.serial_port is not None and self.serial_port.is_open)

    # ---------------------------------------------------------
    def send_command(self, command: str) -> bool:
        """
        Send a serial command
        :param command: The command to be sent
        :return: True if port is open and message has been added to queue
        """
        success = False

        if self.is_connected():
            self.queue.put(command)
            success = True

        return success

    # ---------------------------------------------------------
    def clear_queue(self):
        """
        Clear the serial send queue
        """
        while not queue.empty():
            self.queue.get()

    # ---------------------------------------------------------
    def get_battery_level(self) -> str | None:
        """
        Get the robot battery level
        :return: The battery level as a string, or None
        """
        return self.battery_level

    # ---------------------------------------------------------
    def __communication_thread(self):
        """
        Handle sending and receiving data with the serial device
        """
        dataString: str = ""
        logger.info(f'Starting Arduino Thread ({self.port_name})')

        # Keep this thread running until the exit_flag changes
        while not self.exit_flag.is_set():
            try:
                # If there are any messages in the queue, send them
                if not self.queue.empty():
                    data = self.queue.get() + '\n'
                    self.serial_port.write(data.encode())

                # Read any incomming messages
                while (self.serial_port.in_waiting > 0):
                    data = self.serial_port.read()
                    if (data.decode() == '\n' or data.decode() == '\r'):
                        self.__parse_message(dataString)
                        dataString = ""
                    else:
                        dataString += data.decode()

            # If an error occured in the serial communication
            except Exception as ex:
                logger.error(f'Serial handler error: {repr(ex)}')
                #exit_flag.set()

            time.sleep(0.01)
        
        logger.info(f'Stopping Arduino Thread ({self.port_name})')

    # ---------------------------------------------------------
    def __parse_message(self, dataString: str):
        """
        Parse messages received from the connected device
        :param dataString: String containing the serial message to be parsed
        """
        try:
            # Battery level message
            if "Battery" in dataString:
                dataList = dataString.split('_')
                if len(dataList) > 1 and dataList[1].isdigit():
                    self.battery_level = dataList[1]

        except Exception as ex:
            logger.error(f'Error parsing message [{dataString}]: {repr(ex)}')

# End of class: ArduinoDevice



arduino: ArduinoDevice = ArduinoDevice()


###############################################################
#
# Flask Pages and Functions
#
###############################################################

@app.route('/')
def index():
    """
    Show the main web-interface page
    :return: Render HTML template for the webpage
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    files = []
    errors = []

    # Get list of audio files
    try:
        for item in sorted(os.listdir(app.config['SOUND_FOLDER'])):
            if item.endswith(f".{app.config['SOUND_FORMAT']}"):
                audiofiles = os.path.splitext(os.path.basename(item))[0]

                # Set up default details
                audiogroup = "Other"
                audionames = audiofiles
                audiotimes = 0

                audio_details = audiofiles.split('_')

                # Get item details from name, and make sure they are valid
                if len(audio_details) == 2:
                    if audio_details[1].isdigit():
                        audionames = audio_details[0]
                        audiotimes = float(audio_details[1]) / 1000.0
                    else:
                        audiogroup = audio_details[0]
                        audionames = audio_details[1]
                elif len(audio_details) == 3:
                    audiogroup = audio_details[0]
                    audionames = audio_details[1]
                    if audio_details[2].isdigit():
                        audiotimes = float(audio_details[2]) / 1000.0

                # Add the details to the list
                files.append((audiogroup, audiofiles, audionames, audiotimes))

    except Exception as ex:
        errors.append(repr(ex))
        logging.error(f'Failed to initialise audio files: {repr(ex)}')

    # Get list of connected USB devices
    ports = serial.tools.list_ports.comports()
    usb_ports = [
        p.description
        for p in ports
    ]

    # Ensure that the preferred Arduino port is selected by default
    selectedPort: int = 0
    for index, item in enumerate(usb_ports):
        if app.config['ARDUINO_PORT'] in item:
            selectedPort = index
            logger.info(f'Found serial port ({item}) index [{index}]')
            break

    # Automatically connect systems on startup
    global startup
    global arduino
    global camera

    if not startup:
        startup = True

        try:
            # If user has selected for the Arduino to connect by default, do so now
            if app.config['AUTOSTART_ARDUINO'] and selectedPort < len(usb_ports):
                if arduino.connect(selectedPort):
                    logging.info("Auto-start Complete: Arduino communication")
                else:
                    logging.warning("Auto-start Failed: Arduino communication")

            # If user has selected for the camera stream to be active by default, turn it on now
            if app.config['AUTOSTART_CAM'] and not camera.is_stream_active():
                if camera.start_stream():
                    logging.info("Auto-start Complete: Camera stream")
                else:
                    logging.warning("Auto-start Failed: Camera stream")

        except Exception as ex:
            errors.append(repr(ex))
            logging.error(f'Auto-start Error: {repr(ex)}')

    return render_template('index.html',
                           sounds=files,
                           ports=usb_ports,
                           portSelect=selectedPort,
                           connected=arduino.is_connected(),
                           cameraActive=camera.is_stream_active(),
                           errorMessages=errors)


# =============================================================
@app.route('/login')
def login():
    """
    Show the Login page
    :return: Render HTML template for login page
    """
    if session.get('active'):
        return redirect(url_for('index'))
    else:
        return render_template('login.html', incorrectPassword=False)


# =============================================================
@app.route('/login_request', methods=['POST'])
def login_request():
    """
    Check if the login password is correct
    :return: Redirect to dashboard or login page
    """
    password = request.form.get('password')
    if password == app.config['LOGIN_PASSWORD']:
        session['active'] = True
        return redirect(url_for('index'))
    return render_template('login.html', incorrectPassword=True)


# =============================================================
@app.route('/motor', methods=['POST'])
def motor():
    """
    Control the main movement motors
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    stickX = request.form.get('stickX')
    stickY = request.form.get('stickY')

    if stickX is not None and stickY is not None:
        xVal = int(float(stickX) * 100)
        yVal = int(float(stickY) * 100)

        if arduino.is_connected():
            arduino.send_command("X" + str(xVal))
            arduino.send_command("Y" + str(yVal))
            return jsonify({'status': 'OK'})
        else:
            return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/settings', methods=['POST'])
def settings():
    """
    Update Settings
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    thing = request.form.get('type')
    value = request.form.get('value')

    if thing is not None and value is not None:
        # Motor deadzone threshold
        if thing == "motorOff":
            logging.info(f'Motor Offset: {value}')
            if arduino.is_connected():
                arduino.send_command("O" + value)
            else:
                return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})

        # Motor steering offset/trim
        elif thing == "steerOff":
            logging.info(f'Steering Offset: {value}')
            if arduino.is_connected():
                arduino.send_command("S" + value)
            else:
                return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})

        # Automatic/manual animation mode
        elif thing == "animeMode":
            logging.info(f'Animation Mode: {value}')
            if arduino.is_connected():
                arduino.send_command("M" + value)
            else:
                return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})

        # Sound mode currently doesn't do anything
        # elif thing == "soundMode":
            # logger.debug(f"Sound Mode: {value}")

        # Change the sound effects volume
        elif thing == "volume":
            global volume
            volume = int(value)

        # Turn on/off the webcam
        elif thing == "streamer":
            logging.info("Turning on/off MJPG Streamer")
            global camera
            result: int = 0

            if not camera.is_stream_active():
                response, error = camera.start_stream()
                if response:
                    time.sleep(1) # Give time for the stream to start fully
                    return jsonify({'status': 'OK', 'streamer': 'Active'})
                else:
                    return jsonify({'status': 'Error', 'msg': f'Unable to start stream: {error}'})

            else:
                if camera.stop_stream():
                    return jsonify({'status': 'OK', 'streamer': 'Offline'})
                else:
                    return jsonify({'status': 'Error', 'msg': 'Unable to stop the stream'})

        # Restart the web-interface
        elif thing == "restart":
            command = "sleep 5 && sudo systemctl restart --quiet walle"
            subprocess.Popen(command, shell=True)
            return redirect(url_for('login'))

        # Shut down the Raspberry Pi
        elif thing == "shutdown":
            logging.info("Shutting down Raspberry Pi!")
            subprocess.run(['sudo', 'nohup', 'shutdown', '-h', 'now'], stdout=subprocess.PIPE).stdout.decode('utf-8')
            return jsonify({'status': 'OK', 'msg': 'Raspberry Pi is shutting down'})

        # Unknown command
        else:
            return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})

        return jsonify({'status': 'OK'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/audio', methods=['POST'])
def audio():
    """
    Play an Audio clip on the Raspberry Pi
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    clip = request.form.get('clip')
    if clip is not None:
        clip = f"{app.config['SOUND_FOLDER']}{clip}.{app.config['SOUND_FORMAT']}"

        # Volume control only on linux via amixer
        if sys.platform == "linux":
            audiomixer_cmd = ["amixer", "sset", "Master", "{}%".format(volume * 10)]
            subprocess.run(audiomixer_cmd,
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)

        p = subprocess.Popen(app.config['AUDIOPLAYER_CMD'] + [clip],
                         stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE)

        if app.config['APP_DEBUG']:
            p.wait()
            if p.stderr is not None:
                logger.error(p.stderr.readlines())
            if p.stdout is not None:
                logger.info(p.stdout.readlines())

        return jsonify({'status': 'OK'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/tts', methods=['POST'])
def tts():
    """
    Text to Speech on the Raspberry Pi
    Requires Espeak-NG and optionally Rubberband
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    text = request.form.get('text')

    # Shell commands
    espeak_cmd = app.config['ESPEAK_CMD']
    rb_cmd = app.config['RB_CMD']

    # Don't react to empty strings
    if text is not None and text != "":

        infile = tempfile.NamedTemporaryFile()
        outfile = tempfile.NamedTemporaryFile()

        text_e = text.encode('utf8')
        espeak_args = ['-w', infile.name, text_e]

        try:
            # Generate Speech
            subprocess.run(espeak_cmd + espeak_args,
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)

            if not rb_cmd:
                outfile = infile

            else:
                # Shift pitch
                subprocess.run(rb_cmd + [infile.name, outfile.name],
                               stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)

            # Volume control only on linux via amixer
            if sys.platform == "linux":
                audiomixer_cmd = ["amixer", "sset", "Master", "{}%".format(volume * 10)]
                subprocess.run(audiomixer_cmd,
                               stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)

            # Play it
            subprocess.run(app.config['AUDIOPLAYER_CMD'] + [outfile.name],
                           stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL)

        finally:
            infile.close()
            outfile.close()

        return jsonify({'status': 'OK'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/animate', methods=['POST'])
def animate():
    """
    Send an Animation command to the Arduino
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    clip = request.form.get('clip')

    if clip is not None:
        logger.debug(f"Animate: {clip}")

        if arduino.is_connected():
            arduino.send_command("A" + clip)
            return jsonify({'status': 'OK'})
        else:
            return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/servoControl', methods=['POST'])
def servoControl():
    """
    Send a Servo Control command to the Arduino
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    servo = request.form.get('servo')
    value = request.form.get('value')

    if servo is not None and value is not None:
        logger.debug(f"servo: {servo}")
        logger.debug(f"value: {value}")

        if arduino.is_connected():
            arduino.send_command(servo + value)
            return jsonify({'status': 'OK'})
        else:
            return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})


# =============================================================
@app.route('/arduinoConnect', methods=['POST'])
def arduinoConnect():
    """
    Connect/Disconnect the Arduino Serial Port
    :return: JSON response with success or error status
    """
    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    action = request.form.get('action')

    if action is not None:
        # Update drop-down selection with list of connected USB devices
        if action == "updateList":
            logger.debug("Reload list of connected USB ports")

            # Get list of connected USB devices
            ports = serial.tools.list_ports.comports()
            usb_ports = [p.description for p in ports]

            # Ensure that the preferred Arduino port is selected by default
            selectedPort = 0
            for index, item in enumerate(usb_ports):
                if app.config['ARDUINO_PORT'] in item:
                    selectedPort = index
                    break

            return jsonify({'status': 'OK', 'ports': usb_ports, 'portSelect': selectedPort})

        # If we want to connect/disconnect Arduino device
        elif action == "reconnect":

            logger.debug("Reconnect to Arduino")

            if arduino.is_connected():
                arduino.disconnect()
                return jsonify({'status': 'OK', 'arduino': 'Disconnected'})

            else:
                port = request.form.get('port')

                if port is not None and port.isdigit():
                    portNum = int(port)

                    # Test whether connection to the selected port is possible
                    ports = serial.tools.list_ports.comports()
                    usb_ports = [p.device for p in ports]

                    if portNum >= 0 and portNum < len(usb_ports):
                        # Try opening and closing port to see if connection is possible
                        try:
                            ser = serial.Serial(usb_ports[portNum], 115200)
                            if (ser.inWaiting() > 0):
                                ser.flushInput()
                            ser.close()
                            arduino.connect(usb_ports[portNum])
                            return jsonify({'status': 'OK', 'arduino': 'Connected'})
                        except:
                            return jsonify({'status': 'Error', 'msg': 'Unable to connect to selected serial port'})
                    else:
                        return jsonify({'status': 'Error', 'msg': 'Invalid serial port selected'})
                else:
                    return jsonify({'status': 'Error', 'msg': 'Unable to read [port] POST data'})
        else:
            return jsonify({'status': 'Error', 'msg': 'Unable to read [action] POST data'})
    else:
        return jsonify({'status': 'Error', 'msg': 'Unable to read [action] POST data'})


# =============================================================
@app.route('/arduinoStatus', methods=['POST'])
def arduinoStatus():
    """
    Update the Arduino Status
    :return: JSON containing the current battery level, or an error
    """

    if not session.get('active'):
        return redirect(url_for('login'))

    global arduino
    action = request.form.get('type')

    if action is not None:
        if action == "battery":
            
            battery_level = arduino.get_battery_level()

            if arduino.is_connected():
                if battery_level is not None:
                    return jsonify({'status': 'OK', 'battery': battery_level})
                else:
                    return jsonify({'status': 'Info', 'msg': 'No battery level available'})
            else:
                return jsonify({'status': 'Error', 'msg': 'Arduino not connected'})

    return jsonify({'status': 'Error', 'msg': 'Unable to read POST data'})



###############################################################
#
# Program start code, which initialises the web-interface
#
###############################################################

if __name__ == '__main__':
    # Debug mode
    if app.config['APP_DEBUG']:
        app.run(port=app.config['APP_PORT'], debug=app.config['APP_DEBUG'], host='0.0.0.0')
    
    # Production mode
    else:
        serve(app, host='0.0.0.0', port=app.config['APP_PORT'])
