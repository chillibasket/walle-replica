"""
Wall-E Web Interface - Flask APP configuration.
"""

import os
BASEDIR = os.path.abspath(os.path.dirname(__file__))

# Secret key used for login session cookies
SECRET_KEY = b'\xccCL\xb2&S\xcb\xfa&\x0e\x90\x03\xe7h5\x0f\x1e\r\xef\xd6 2\x05&'

# Web Interface Settings
APP_PORT = 5000                                         # Port of the application
APP_DEBUG = False                                       # Enable / Disable Python Server Debugging
LOGIN_PASSWORD = "walle"                                # Password for web-interface
ARDUINO_PORT = "/dev/ttyACM0"                           # Default port which will be selected
AUTOSTART_ARDUINO = True                                # False = no auto connect, True = automatically try to connect to default port
AUTOSTART_CAM = True                                    # False = no auto start, True = automatically start up the camera
SOUND_FOLDER = os.path.join(BASEDIR, "static/sounds/")  # Location of the folder containing all audio files
ESPEAK_CMD = ['espeak-ng', '-v', 'en', '-b', '1']       # ESpeak Command and Language
RB_CMD = ['rubberband', '-t', '1.1', '-p', '2', '-c', '6', '-f', '1.8', '-q']  # Rubberband for pitch shifting TTS
AUDIOPLAYER_CMD = ['aplay']                             # Command for local audioplayer
SOUND_FORMAT = "wav"                                    # Audio file format

# Values for Codeblock Movement
CODEBLOCK_MOTORPOWER = 0.8   # Motorpower at which the speed below is reached
CODEBLOCK_MOTORSPEED = 17    # this WALLE_E drives at 17 cm/s at given MOTORPOWER
CODEBLOCK_TURNPOWER = 0.5    # Motorpower for the turn movement
CODEBLOCK_TURNTIME = 1.8     # the time (s) it takes to move 90° at given TURNPOWER
