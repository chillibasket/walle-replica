[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
[![Issues](https://img.shields.io/github/issues-raw/chillibasket/walle-replica.svg?maxAge=25000)](https://github.com/chillibasket/walle-replica/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/chillibasket/walle-replica.svg?style=flat)](https://github.com/chillibasket/walle-replica/commits/master)

# Wall-E Robot Replica
Robot and controller code for a Wall-E replica robot. For more information about the robot, visit https://wired.chillibasket.com/3d-printed-wall-e/
<br />
<br />

## Arduino Code (wall-e)
Main program to control the motors and servos of the robot. Features include:
1. An animation queue, keeping track of the next servo movements the robot needs to perform.
1. A random movement generator, allowing the robot to autonomously move and appear animated.
1. Velocity control of all servo motors, facilitating smooth accelerations and decelerations. 
1. Non-blocking serial parsing, allowing the movements of the robot to be remote controlled.
1. Battery level monitoring using a potential divider circuit.


## Raspberry Pi Web Server (web_interface)
The web interface is programmed in Python and uses *Flask* to generate a server. The Raspberry Pi is connected via USB to the Arduino micro-controller. The main features are:
1. A JavaScript joystick, with which the movement of the robot can easily be controller.
1. Manual control of all the servo motors.
1. A list of movement animations which can be performed by the robot.
1. A list of sounds which can be played.
1. Settings page, where motor parameters, sound volume, and video options can be modified.
1. Gamepad support; on any modern browsers, you can use a connected Xbox of PlayStation controller to control the robot.
1. A simple login page to prevent everyone from having access to the controls (note: this is not a full access control system, please don't use this web interface on untrusted/public networks)

![](/images/wall-e_webinterface1.jpg)
*Image of the web interface and robot*
<br />
<br />


## Setup Instructions

### Arduino

#### Basic Installation
1. Ensure that the wiring of the electronics matches the diagram shown below.
1. Download/clone the folder "wall-e" from the GitHub repository.
1. Open `wall-e.ino` in the Arduino IDE; the files `animations.ino`, `MotorController.hpp` and `Queue.hpp` should automatically open on separate tabs of the IDE as well.
1. Install the `Adafruit_PWMServoDriver.h` library
	1. Go to Sketch -> Include Library -> Manage Libraries...
	1. Search for *Adafruit Servo*.
	1. Install latest version of the library.
1. Connect to the computer to the micro-controller with a USB cable. Ensure that the correct *Board* and *Port* are selected in the *Tools* menu.
1. Upload the sketch to the micro-controller.

![](/images/wall-e_wiring_diagram.jpg)
*Diagram showing the wiring of the robot's electronic components*

#### Testing the Main Program
1. Once the sketch has been uploaded to the Arduino, power on the 12V battery while the micro-controller is still connected to the computer.
1. Open the *Serial Monitor* (button in top-right of Arduino IDE). Set the baud rate to 115200.
1. To control the movement of the robot, send the characters 'w', 'a', 's' or 'd' to move forward, left, back or right respectively. Send 'q' to stop all movement.
1. To move the head, send the characters 'j', 'l', 'i' or 'k' to tilt the head left or right and the eyes upwards or downwards. At this stage, the servos may try to move further than they should and may look uncoordinated. This will be solved by performing the servo motor calibration steps below.

#### Servo Motor Calibration
1. Download/clone the folder "wall-e_calibration" from the GitHub repository
1. Open `wall-e_calibration.ino` in the Arduino IDE.
1. Upload the sketch to the micro-controller, and open the serial monitor and set the baud rate to 115200.
1. The sketch is used to calibrate the maximum and minimum PWM pulse lengths required to move each servo motor across its desired range of motion. The standard LOW and HIGH positions of each of the servos can be seen on diagrams [on my website](https://wired.chillibasket.com/3d-printed-wall-e/). 
1. When starting the sketch and opening the serial monitor, the a message should appear after 2-3 seconds, saying that it is ready to calibrate the LOW position of the first servo motor (the head rotation).
1. Send the character 'a' and 'd' to move the motor backwards and forwards by -10 and +10. For finer control, use the characters 'z' and 'c' to move the motor by -1 and +1. 
1. Once the motor is position in the correct position, send the character 'n' to proceed to the calibration step. It will move on to the HIGH position of the same servo, after which the process will repeat for each of the 7 servos in the robot.
1. When all joints are calibrated, the sketch will output an array containing the calibration values to the serial monitor.
1. Copy the array, and paste it into lines 116 to 122 of the program *wall-e.ino*. The array should look similar to this:
    ```cpp
    int preset[][2] =  {{410,120},  // head rotation
                        {532,178},  // neck top
                        {120,310},  // neck bottom
                        {465,271},  // eye right
                        {278,479},  // eye left
                        {340,135},  // arm left
                        {150,360}}; // arm right
    ```

#### Battery Level Detection
When using batteries to power the robot, it is important to keep track of how much power is left. Some batteries may break if they are over-discharged, and the SD card of the Raspberry Pi may become corrupted if not enough power is delivered.
1. To use the battery level detection feature on the Arduino, connect the following resistors and wiring as shown in the image below. The resistors (potential divider) reduce the 12V voltage down to a value below 5V, which is safe for the Arduino to measure using its analogue pins. The recommended resistor values are `R1 = 100kΩ` and `R2 = 47kΩ`.
1. Uncomment line 50 in the main Arduino sketch *wall-e.ino*.
1. If you are using different resistor values, change the value of the potential divider gain factor on line 54 of the sketch, according to the formula: `POT_DIV = R2 / (R1 + R2)`. 
1. The program should now automatically check the battery level every 10 seconds, and this level will be shown on the Raspberry Pi web-interface in the "Status" section.

![](/images/battery_level_circuit.jpg)
<br />
*Diagram showing the wiring of the battery level detection circuit*

#### Adding your own Servo Animations
My code comes with two animations which replicate scenes from the movie; the eye movement Wall-E does when booting-up, and a sequence of motions as Wall-E inquisitively looks around. From version 2.7 of the code, I've now made it easier to add your own servo motor animations so that you can make your Wall-E do other movements...
1. Open up the file `animations.ino`, which is located in the same folder as the main Arduino sketch. 
1. Each animation command consists of the positions you want each of the servo motors to move to, and the amount of time the animation should wait until moving on to the next instruction.
1. You can add a new animation by inserting an extra `case` section into the switch statement. You should slot you extra code into the space above the `default` section. For example:
    ```cpp
    case 3:
            // --- Title of your new motion sequence ---
            //          time,head,necT,necB,eyeR,eyeL,armL,armR
            queue.push({  12,  48,  40,   0,  35,  45,  60,  59});
            queue.push({1500,  48,  40,  20, 100,   0,  80,  80});
            // Add as many additional movements here as you need to complete the animation
            // queue.push({time, head rotation, neck top, neck bottom, eye right, eye left, arm left, arm right})
            break;
    ```
1. The time needs to be a number in milliseconds (for example, 3.5 seconds = 3500)
1. The servo motor position commands need to be an integer number between 0 to 100, where `0 = LOW` and `100 = HIGH` servo position as calibrated in the `wall-e_calibration.ino` sketch.
1. If you want to disable a motor for a specific move, you can use -1. 

<br />
<br />


### Raspberry Pi Web Server

#### Basic Installation
1. Setup the Raspberry Pi to run the latest version of Raspbian/NOOBS. The setup instructions can be found on the [Raspberry Pi website](https://www.raspberrypi.org/documentation/installation/installing-images/).
1. Open the command line terminal on the Raspberry Pi.
1. Ensure that the package list has been updated (this may take some time): `sudo apt-get update`
1. Install *Flask* - this is a Python framework used to create web servers:
    1. Ensure that pip is installed: `sudo apt-get install python-pip`
    1. Install Flask and its dependencies: `sudo pip install flask`
1. Clone repository into the home directory of the Raspberry Pi:
    ```shell
    cd ~
    git clone https://github.com/chillibasket/walle-replica.git
    ```
1. Set the web server password:
    1. Open *app.py*: `nano ~/walle-replica/web_interface/app.py` 
    1. On line 20 of *app.py* where is says `put_password_here`, insert the password you want to use for the web interface.
1. (Optional) Change the default audio directory and location of the script used to start/stop the video stream.
    1. If you followed the steps above exactly, there is no need to do this. However, if you want to move the web-interface files to a different directory on the Raspberry Pi, you will need to change the location where the program will look for the audio files.
    1. On line 23 of *app.py*, type the directory where the audio files are located. Ensure that the directory location ends with a forward slash: `/`.
    1. On line 22 of *app.py*, the location of the script used to start and stop the video camera stream can be modified.
1. Connect to the Arduino/micro-controller:
    1. Plug the Arduino/micro-controller into the USB port of the Raspberry Pi.
    1. If you would like the serial port used by the Arduino to be selected by default in the web-interface, you can set a preferred serial port device in the code. Go to line 21 of *app.py* and replace the text "ARDUINO" with the name of your device. The name must match the one which appears in the drop-down menu in the "Settings" tab of the web-interface.
    1. Press `CTRL + O` to save and `CTRL + X` to exit the nano editor.


#### Using the Web Server
1. To determine the current IP address of the Raspberry Pi on your network, type the command: `hostname -I`
1. To start the server: `python3 ~/walle-replica/web_interface/app.py`
1. To access the web interface, open a browser on any computer/device on the same network and type in the IP address of the Raspberry Pi, follow by `:5000`. For example `192.168.1.10:5000`
1. To stop the server press: `CTRL + C`
1. To start controlling the robot, you first need to start serial communication with the Arduino. To do this, go to the `Settings` tab of the web-interface, select the correct serial port from the drop-down list and press on the `Reconnect` button.

#### Adding a Camera Stream
1. Install *mjpg-streamer* - this is used to stream the video to the webserver. A good description of the installation procedure is [described here](https://github.com/cncjs/cncjs/wiki/Setup-Guide:-Raspberry-Pi-%7C-MJPEG-Streamer-Install-&-Setup-&-FFMpeg-Recording). Complete the *Install & Setup* steps, as well as creating the *Auto Start Manager Script*. Stop when you reach the *Start on Boot* section. 
1. Make sure that the manager script you created has the correct name and is in the correct directory: `/home/pi/mjpg-streamer.sh`. If you want the save the script in a different location, you need to update line 22 of *app.py*.
1. To make the script executable by the web-server, run this command in the terminal: `chmod +x /home/pi/mjpg-streamer.sh`

#### Automatically start Server on Boot
1. Create a `.service` file which is used to start the web interface: `nano ~/walle.service`
1. Paste the following text into the file:
    ```text
    [Unit]
    Description=Start Wall-E Web Interface
    After=network.target

    [Service]
    WorkingDirectory=/home/pi/walle-replica/web_interface
    ExecStart=/usr/bin/python3 app.py
    Restart=always
    StandardOutput=syslog
    StandardError=syslog
    SyslogIdentifier=walle
    User=pi

    [Install]
    WantedBy=multi-user.target
    ```
1. Press `CTRL + O` to save and `CTRL + X` to exit the nano editor.
1. Copy this file into the startup directory using the command: `sudo cp ~/walle.service /etc/systemd/system/walle.service`
1. To enable auto-start, use the following command: `sudo systemctl enable walle.service`
1. The web interface should now automatically start when the Raspberry Pi is turned on. You can also manually start and stop the service using the commands: `sudo systemctl start walle.service` and `sudo systemctl stop walle.service` 

#### Adding new Sounds
1. By default the Raspberry should automatically select whether to output audio to the HDMI port or the headphone jack. However, you can ensure that it always uses the headphone jack with the following command: `amixer cset numid=3 1`
1. Make sure that all the sound files you want to use are of type `*.ogg`. Most music/sound editors should be able to convert the sound file to this format.
1. Change the file name so that it has the following format: `[group name]_[file name]_[length in milliseconds].ogg`. For example: `voice_eva_1200.ogg`. In the web-interface, the audio files will be grouped using the "group name" and sorted alphabetically.
1. Upload the sound file to Raspberry Pi in the following folder: `~/walle-replica/web_interface/static/sounds/`
1. All the files should appear in the web interface when you reload the page. If the files do not appear, you may need to change the privileges required to access the folder: `sudo chmod -R 755 ~/walle-replica/web_interface/static/sounds`

#### Set up the Raspberry Pi as a WiFi hotspot
If you would like to control the robot outdoors or at conventions, there may not be any safe WiFi networks you can connect to. To overcome this issue and eliminate the need for any external networking equipment, the Raspberry Pi can broadcast its own WiFi network. You can then connect the computer/phone/tablet you are using to control the robot directly to this network.

The instructions for setting up such a WiFi hotspot can be found on [this website](https://thepi.io/how-to-use-your-raspberry-pi-as-a-wireless-access-point/). You only have to complete steps 1 to 5 for this project.
<br />
<br />

## Changelog

#### 7th August 2020 (Version 2.7)
1. Added a soft servo start function to the main Wall-E sketch and the servo calibration sketch. This prevents the servos from jumping as violently on startup.
1. Changed the data-type of the animation queue to reduce the amount of dynamic memory required. Also updated the Queue class so that the buffer memory can be declared globally; this means the compiler can keep track of how much memory the queue actually uses.
1. Moved the preset servo animations into a separate file, to make it easier to add your own animations. 

#### 20th June 2020
1. Minor bug fixes of the `Queue.hpp` and `MotoController.hpp` classes.
1. Updated commenting of code to make it more consistent.

#### 16th February 2020
1. Added gamepad support; any controller can now be used (such as the Xbox or PlayStation controllers) to puppet the robot.
1. Improved serial port handling; in the settings tab, all of the available serial ports are listed in a drop-down menu. 
1. New status indicators are now shown below the video stream. They visualise whether the Arduino and/or gamepad are connected.
1. Added support for battery level detection in both the Arduino code and the Raspberry Pi web interface.
1. Fixed the bug where the virtual joystick no longer worked properly when the window was resized.
1. Plus many other bug fixes!

#### 25th January 2020
1. Restructured the web-interface to make it display more nicely on mobile devices; fancy icons are now used!
1. Added manual servo control - this allows individual servos to be controlled directly from the web-interface.
1. Improved error handling - error messages are now consistently displayed in a pop-up at the bottom of the page.
1. Added instructions about how to automatically start server on boot to the Readme.

#### 31st October 2019
1. Fixed some bugs related to sound playback.
1. Added 2 sample sound files, which ensures that the sound directory is included in the git files.

#### 30th October 2019 
1. Added *wall-e_calibration.ino*, with which the maximum and minimum pulse widths of the servo motors can be calibrated.
1. Updated *wall-e.ino* to use relative coordinates rather than absolute servo pulse widths for the animation presets. This allows the servo calibration data to be used to ensure the movements are the same on all variants of the robot.