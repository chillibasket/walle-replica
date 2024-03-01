"""Flask APP configuration."""
import os

BASEDIR = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(24)      # Secret key used for login session cookies

# VARIABLES WHICH YOU CAN MODIFY
APP_PORT = 5000             # Port of the application
APP_DEBUG = False           # Enable / Disable Python Server Debugging
LOGIN_PASSWORD = "put_password_here"    # Password for web-interface
ARDUINO_PORT = "ARDUINO"    # Default port which will be selected
AUTOSTART_ARDUINO = True    # False = no auto connect, True = automatically try to connect to default port
AUTOSTART_CAM = False       # False = no auto start, True = automatically start up the camera
SOUND_FOLDER = os.path.join(BASEDIR, "static/sounds/")  # Location of the folder containing all audio files
ESPEAK_CMD = ['espeak-ng', '-v', 'en', '-b', '1']         # ESpeak Command and Language
RB_CMD = ['rubberband', '-t', '1.2', '-p', '2', '-c', '6', '-f', '1.8', '-q']  # Rubberband for pitch shifting TTS
AUDIOPLAYER_CMD = ['pw-play']   # Command for local audioplayer

# Values for Codeblock Movement
CODEBLOCK_MOTORPOWER = 0.8   # Motorpower at which the speed below is reached
CODEBLOCK_MOTORSPEED = 17    # this WALLE_E drives at 17 cm/s at given MOTORPOWER
CODEBLOCK_TURNPOWER = 0.5    # Motorpower for the turn movement
CODEBLOCK_TURNTIME = 1.8     # the time (s) it takes to move 90° at given TURNPOWER
