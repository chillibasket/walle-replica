"""Flask APP configuration."""
import os

BASEDIR = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(24)      # Secret key used for login session cookies

##### VARIABLES WHICH YOU CAN MODIFY #####
LOGIN_PASSWORD  = "put_password_here"                     # Password for web-interface
ARDUINO_PORT    = "ARDUINO"                               # Default port which will be selected
AUTOSTART_ARDUINO = True                                  # False = no auto connect, True = automatically try to connect to default port
AUTOSTART_CAM   = False                                   # False = no auto start, True = automatically start up the camera
SOUND_FOLDER    = os.path.join(BASEDIR, "static/sounds/") # Location of the folder containing all audio files
ESPEAK_CMD      = ['espeak-ng','-v', 'en','-b', '1']      # ESpeak Command and Language
RB_CMD          = ['rubberband', '-t', '1.2','-p','2','-c','6','-f','1.8','-q']  # Rubberband Command
AUDIOPLAYER_CMD = ['pw-play']                             # Command for local audioplayer
AUDIOMIXER_CMD  = ["amixer", "sset", "Master"]            # Audio mixer of your OS, leave empty on Mac or Windows
