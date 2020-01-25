# walle-replica
Robot and controller code for a Wall-E replica robot. For more information about the robot, visit https://wired.chillibasket.com/3d-printed-wall-e/


## Arduino Code (wall-e)
Main program to control the motors and servos of the robot. Features include:
1. An animation queue, keeping track of the next servo movements the robot needs to perform.
1. A random movement generator, allowing the robot to autonomously move and appear animated.
1. Velocity control of all servo motors, facilitating smooth accelerations and decelerations. 
1. Non-blocking serial parsing, allowing the movements of the robot to be remote controlled.


## Raspberry Pi Web Server (web_interface)
The web interface is programmed in Python and uses *Flask* to generate a server. The Raspberry Pi is connected via USB to the Arduino micro-controller. The main features are:
1. A JavaScript joystick, with which the movement of the robot can easily be controller.
1. A list of sounds which can be played.
1. A list of movement animations which can be performed by the robot.
1. Settings page, where motor parameters, sound volume, and video options can be modified.
1. A simple login page to prevent everyone from having access to the controls (note: this is not a full access control system, please don't use this web interface on untrusted/public networks)

![](/images/wall-e_webinterface1.jpg) *Image of the web interface and robot*



## Setup Instructions

### Arduino

#### Basic Installation
1. Ensure that the wiring of the electronics matches the diagram shown below.
1. Download/clone the folder "wall-e" from the GitHub repository.
1. Open *wall-e.ino* in the Arduino IDE; the files *MotorController.hpp* and *Queue.hpp* should automatically open on separate tabs of the IDE as well.
1. Install the *Adafruit_PWMServoDriver.h* library
	1. Go to Sketch -> Include Library -> Manage Libraries...
	1. Search for  *Adafruit Servo*.
	1. Install version 1.0.2 of the library; the newest version currently has a bug and doesn't work properly.
1. Connect to the computer to the micro-controller with a USB cable. Ensure that the correct *Board* and *Port* are selected in the *Tools* menu.
1. Upload the sketch to the micro-controller.

![](/images/wall-e_wiring_diagram.jpg) *Diagram showing the wiring of the robot's electronic components*

#### Testing the Main Program
1. Once the sketch has been uploaded to the Arduino, power on the 12V battery while the micro-controller is still connected to the computer.
1. Open the *Serial Monitor* (button in top-right of Arduino IDE). Set the baud rate to 115200.
1. To control the movement of the robot, send the characters 'w', 'a', 's' or 'd' to move forward, left, back or right respectively. Send 'q' to stop all movement.
1. To move the head, send the characters 'j', 'l', 'i' or 'k' to tilt the head left or right and the eyes upwards or downwards. 
1. Only move on to using the Raspberry Pi if all these functions are working correctly!

#### Servo Motor Calibration
1. Download/clone the folder "wall-e_calibration" from the GitHub repository
1. Open *wall-e_calibration.ino* in the Arduino IDE.
1. Upload the sketch to the micro-controller, and open the serial monitor and set the baud rate to 115200.
1. The sketch is used to calibrate the maximum and minimum PWM pulse lengths required to move each servo motor across its desired range of motion. The standard LOW and HIGH positions of each of the servos can be seen on diagrams [on my website](https://wired.chillibasket.com/3d-printed-wall-e/). 
1. When starting the sketch and opening the serial monitor, the a message should appear after 2-3 seconds, saying that it is ready to calibrate the LOW position of the first servo motor (the head rotation).
1. Send the character 'a' and 'd' to move the motor backwards and forwards by -10 and +10. For finer control, use the characters 'z' and 'c' to move the motor by -1 and +1. 
1. Once the motor is position in the correct position, send the character 'n' to proceed to the calibration step. It will move on to the HIGH position of the same servo, after which the process will repeat for each of the 7 servos in the robot.
1. When all joints are calibrated, the sketch will output an array containing the calibration values to the serial monitor.
1. Copy the array, and paste it into lines 85 to 92 of the program *wall-e.ino*. The array should look similar to this:
```cpp
int preset[][2] =  {{398, 112},  // head rotation
                    {565, 188},  // neck top
                    {470, 100},  // neck bottom
                    {475, 230},  // eye right
                    {270, 440},  // eye left
                    {350, 185},  // arm left
                    {188, 360}}; // arm right
```


### Raspberry Pi Web Server

#### Basic Installation
1. Setup the Raspberry Pi to run the latest version of Raspbian/NOOBS. The setup instructions can be found on the [Raspberry Pi website](https://www.raspberrypi.org/documentation/installation/installing-images/).
1. Open the command line terminal on the Raspberry Pi.
1. Ensure that the package list has been updated (this may take some time): `sudo apt-get update`
1. Install *Flask* - this is a Python framework used to create webservers:
    1. Ensure that pip is installed: `sudo apt-get install python-pip`
    1. Install Flask and its dependencies: `sudo pip install flask`
1. Clone repository into the home directory of the Raspberry Pi:
    ```shell
    cd ~
    git clone https://github.com/chillibasket/walle-replica.git
    ``` 
1. Connect to the Arduino/micro-controller:
    1. Plug the Arduino/micro-controller into the USB port of the Raspberry Pi.
    1. Use the following command to list the connected USB devices. Record the name of the device you want to connect to:
    ```shell
	result=$(python <<EOF
    import serial.tools.list_ports
    for p in serial.tools.list_ports.comports():
        print(p)
    EOF
    )
    echo $result
    ```
    1. Open *app.py*: `nano ~/walle-replica/web_interface/app.py`
    1. Go to line 92 (you can do this with the keyboard command `CTRL + _`), and check whether the name of your micro-controller is already listed there. If not, add it where is says *ARDUINO*.
1. Set the web server password:    
    1. On line 183 of *app.py* where is says `put_password_here`, insert the password you want to use for the web interface.
    1. Press `CTRL + O` to save and `CTRL + X` to exit the nano editor.

#### Using the Web Server
1. To determine the current IP address of the Raspberry Pi on your network, type the command: `hostname -I`
1. To start the server: `python3 ~/walle-replica/web_interface/app.py`
1. To access the web interface, open a browser on any computer/device on the same network and type in the IP address of the Raspberry Pi, follow by `:5000`. For example `192.168.1.10:5000`
1. To stop the server press: `CTRL + C`
1. To connect to the Arduino controlling the motors, you need to go to the `Settings` tab of the web-interface and press on the `Reconnect` button.

#### Adding a Camera Stream
1. Install *mjpg-streamer* - this is used to stream the video to the webserver. A good description of the installation procedure is [described here](https://github.com/cncjs/cncjs/wiki/Setup-Guide:-Raspberry-Pi-%7C-MJPEG-Streamer-Install-&-Setup-&-FFMpeg-Recording). Complete the *Install & Setup* steps, as well as creating the *Auto Start Manager Script*. Stop when you reach the *Start on Boot* section. 
1. Make sure that the manager script you created has the correct name and is in the correct directory: `/home/pi/mjpg-streamer.sh`

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
1. Change the file name so that it has the following format: `[file name]_[length in milliseconds].ogg`. For example: `eva_1200.ogg`
1. Upload the sound file to Raspberry Pi in the following folder: `~/walle-replica/web_interface/static/sounds/`
1. All the files should appear in the web interface when you reload the page. If the files do not appear, you may need to change the privileges required to access the folder: `sudo chmod -R 755 ~/walle-replica/web_interface/static/sounds`


## Changelog

#### 25th January 2020 - Major Update!
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