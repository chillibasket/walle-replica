[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
[![Issues](https://img.shields.io/github/issues-raw/chillibasket/walle-replica.svg?maxAge=25000)](https://github.com/chillibasket/walle-replica/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/chillibasket/walle-replica.svg?style=flat)](https://github.com/chillibasket/walle-replica/commits/master)

# Wall-E Robot Replica
Robot and controller code for a Wall-E replica robot. For more information about the robot, visit https://wired.chillibasket.com/3d-printed-wall-e/

<br />
<br />

## 1. Arduino Code (wall-e)
Main program to control the motors and servos of the robot. Features include:
1. An animation queue, keeping track of the next servo movements the robot needs to perform.
1. A random movement generator, allowing the robot to autonomously move and appear animated.
1. Velocity control of all servo motors, facilitating smooth accelerations and decelerations. 
1. Non-blocking serial parsing, allowing the movements of the robot to be remote controlled.
1. Battery level monitoring using a potential divider circuit.
<br />

## 2. Raspberry Pi Web Server (web_interface)
The web interface is programmed in Python and uses *Flask* to generate a server. The Raspberry Pi is connected via USB to the Arduino micro-controller. The main features are:
1. A JavaScript joystick, with which the movement of the robot can easily be controller.
1. Manual control of all the servo motors.
1. A list of movement animations which can be performed by the robot.
1. A list of sounds which can be played.
1. Settings page, where motor parameters, sound volume, and video options can be modified.
1. Gamepad support; on any modern browsers, you can use a connected Xbox of PlayStation controller to control the robot.
1. A simple login page to prevent everyone from having access to the controls (note: this is not a full access control system, please don't use this web interface on untrusted/public networks)
1. **[New]** Support for text-to-speech
1. **[New]** Program robot actions using CodeBlocks drag and drop editor within the browser.

![](/images/wall-e_webinterface1.jpg)
*Image of the web interface and robot*

<br />
<br />


## Setup Instructions

### 1. Arduino

#### [a] Basic Installation
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
<br />

<br />

#### [b] Testing the Main Program
1. Once the sketch has been uploaded to the Arduino, power on the 12V battery while the micro-controller is still connected to the computer.
1. Open the *Serial Monitor* (button in top-right of Arduino IDE). Set the baud rate to 115200.
1. To control the movement of the robot, send the characters 'w', 'a', 's' or 'd' to move forward, left, back or right respectively. Send 'q' to stop all movement.
1. To move the head, send the characters 'j', 'l', 'i' or 'k' to tilt the head left or right and the eyes upwards or downwards. At this stage, the servos may try to move further than they should and may look uncoordinated. This will be solved by performing the servo motor calibration steps below.

<br />

#### [c] Servo Motor Calibration
1. Download/clone the folder "wall-e_calibration" from the GitHub repository
1. Open `wall-e_calibration.ino` in the Arduino IDE.
1. Upload the sketch to the micro-controller, and open the serial monitor and set the baud rate to 115200.
1. The sketch is used to calibrate the maximum and minimum PWM pulse lengths required to move each servo motor across its desired range of motion. The standard LOW and HIGH positions of each of the servos can be seen on diagrams [on my website](https://wired.chillibasket.com/3d-printed-wall-e/). 
1. When starting the sketch and opening the serial monitor, a message should appear after 2-3 seconds, saying that it is ready to calibrate the LOW position of the first servo motor (the head rotation).
1. Send the character 'a' and 'd' to move the motor backwards and forwards by -10 and +10. For finer control, use the characters 'z' and 'c' to move the motor by -1 and +1. 
1. Once the motor is in the correct position, send the character 'n' to proceed to the calibration step. It will move on to the HIGH position of the same servo, after which the process will repeat for each of the 7 servos in the robot.
1. When all joints are calibrated, the sketch will output an array containing the calibration values to the serial monitor.
1. Copy the array, and paste it into [lines 144](https://github.com/chillibasket/walle-replica/blob/master/wall-e/wall-e.ino#L144) to 150 of the program *wall-e.ino*. The array should look similar to this:
    ```cpp
    int preset[][2] =  {{410,120},  // head rotation
                        {532,178},  // neck top
                        {120,310},  // neck bottom
                        {465,271},  // eye right
                        {278,479},  // eye left
                        {340,135},  // arm left
                        {150,360}}; // arm right
    ```

<br />

#### [d] Battery Level Detection (Optional)
When using batteries to power the robot, it is important to keep track of how much power is left. Some batteries may break if they are over-discharged, and the SD card of the Raspberry Pi may become corrupted if not enough power is delivered.
1. To use the battery level detection feature on the Arduino, connect the following resistors and wiring as shown in the image below. The resistors (potential divider) reduce the 12V voltage down to a value below 5V, which is safe for the Arduino to measure using its analogue pins. The recommended resistor values are `R1 = 100kΩ` and `R2 = 47kΩ`.
1. Uncomment [line 54](https://github.com/chillibasket/walle-replica/blob/master/wall-e/wall-e.ino#L54) `#define BAT_L` in the main Arduino sketch *wall-e.ino*.
1. If you are using different resistor values, change the value of the potential divider gain factor on line 54 of the sketch, according to the formula: `POT_DIV = R2 / (R1 + R2)`. 
1. The program should now automatically check the battery level every 10 seconds, and this level will be shown on the Raspberry Pi web-interface in the "Status" section.

![](/images/battery_level_circuit.jpg)
<br />
*Diagram showing the wiring of the battery level detection circuit*

<br />

#### [e] oLed Display (Optional) (Contributed by: [hpkevertje](https://github.com/hpkevertje))
It is possible to integrate a small oLED display which will show the battery level of the robot on the front battery indicator panel. This feature requires the battery level detection circuit in the previous section to be enabled, and the screen will update every time the battery level is calculated. This function uses the u8g2 display library in page mode; on the Arduino UNO you may get a warning that the memory usage is high, but this warning can be ignored. 
1. To use the oLed display feature on the Arduino, connect an i2c oLed display to the i2c bus on the servo motor module (see diagram).
1. Install the U8g2 library in the Arduino library manager:
    1. Go to Sketch -> Include Library -> Manage Libraries...
    1. Search for *U8gt*. The library publisher is "oliver".
    1. Install the latest version of the library.
1. Uncomment [line 74](https://github.com/chillibasket/walle-replica/blob/master/wall-e/wall-e.ino#L74) `#define OLED` in the main Arduino sketch *wall-e.ino*.
1. If you are using a different display that is supported by the library, you can change the constructor on [line 78](https://github.com/chillibasket/walle-replica/blob/master/wall-e/wall-e.ino#L78) as documented on the [library reference page](https://github.com/olikraus/u8g2/wiki/u8g2setupcpp#constructor-reference). The default is for an SH1106_128X64_NONAME display.

![](/images/oLed_circuit.jpg)
<br />
*Diagram showing the wiring of the oLed display*

<br />

#### [f] Adding your own Servo Animations (Optional)
My code comes with two animations which replicate scenes from the movie; the eye movement Wall-E does when booting-up, and a sequence of motions as Wall-E inquisitively looks around. From version 2.7 of the code, I've now made it easier to add your own servo motor animations so that you can make your Wall-E do other movements...
1. Open up the file `animations.ino`, which is located in the same folder as the main Arduino sketch. 
1. Each animation command consists of the positions you want all the servo motors to move to, and the amount of time the animation should wait until moving on to the next instruction.
1. You can add a new animation by inserting an extra `case` section into the switch statement. You should slot your extra code into the space above the `default` section. For example:
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


### 2. Raspberry Pi Web Server

#### [a] Hardware Setup
1. Connect the power cable of the Raspberry Pi to the USB power output port on the 12V to 5V buck converter.
2. Connect the USB data cable from the Arduino to the Raspberry Pi.
3. If you have a Raspberry Pi camera, plug the ribbon cable into the CSI camera connector.
4. For setup and installation, you can plug in a monitor into the HDMI port and a USB keyboard and mouse. Alternatively you can connect to and configure the Raspberry Pi from a different computer [using SSH](https://www.raspberrypi.com/documentation/computers/remote-access.html#ssh).
 
<br />

#### [b] Basic Installation
1. Setup the Raspberry Pi to run the latest version of Raspberry Pi OS Desktop. The setup instructions can be found on the [Raspberry Pi website](https://www.raspberrypi.com/documentation/computers/getting-started.html). Make sure that the Raspberry Pi is connected to the internet. 
2. Open the "Terminal" command line on the Raspberry Pi.
3. Clone repository into the home directory of the Raspberry Pi:
```shell
cd ~
git clone https://github.com/chillibasket/walle-replica.git
```

<br />

> [!NOTE]
> You can configure the web-interface settings by editing the "config.py" file:
> * Open the config file: `nano ~/walle-replica/web_interface/config.py`
> * On line [14](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L14) you can change the password for the web interface. The default password is "walle"
> * On line [15](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L15) the default serial port which is used to connect to the Arduino can be set. You can find a list of all the connected serial ports using the `dmseg | grep tty` command.
> * On lines [16](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L16) and [17](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L17) you can configure whether the Arduino and camera should automatically connect when starting up the web server.

<br />

4. Once you have finished editing the configurations, run the installation script which sets up all the required libraries for you (note - this may take some time to complete):
```shell
cd ~/walle-replica
sudo chmod +x ./raspi-setup.sh
sudo ./raspi-setup.sh
```

<br />

#### [c] Using the Web Server
1. If the installation completed successfully, the webserver should start automatically when the Raspberry Pi is powered on. This is done using a [Systemd service](https://learn.sparkfun.com/tutorials/how-to-run-a-raspberry-pi-program-on-startup/all#method-3-systemd). 
1. On the Raspberry Pi you can view the web interface from the browser at http://localhost:5000
1. To view the interface from a different computer on the same WiFi network, you first need to determine the current IP address of the Raspberry Pi on your network using the command: `hostname -I`
1. To access the web interface, open a browser on any computer/device on the same network and type in the IP address of the Raspberry Pi, follow by `:5000`. For example `192.168.1.10:5000`
1. To start controlling the robot, you first need to make sure that the serial communication with the Arduino has started. To do this, go to the `Settings` tab of the web-interface, select the correct serial port from the drop-down list and press on the `Reconnect` button. If the configurations were set up correctly, this should happen automatically.

<br />

> [!TIP]
> Here are some useful commands to control the web interface:
> * To stop the automatic web interface service: `sudo systemd stop walle.service`
> * To disable start on boot: `sudo systemd disable walle.service`
> * To reenable start on boot: `sudo systemd enable walle.service`
> * To start the service after it has been stopped: `sudo systemd start walle.service`
> * View the status of the service and check for errors: `sudo systemd status walle.service`
> * If you want to manually run the web server from the terminal, for example to check for errors: `python3 ~/walle-replica/web_interface/app.py`. You can then press `CTRL + C` to stop the web server again.

<br />

#### [d] Controlling the Robot using Blocky (Contributed by: [dkrey](https://github.com/dkrey))
Since version 3.0, a new tab has been added to the web interface where the robot can be controlled using a drag-and-drop scripting language. Simply drag the actions you want to perform from the left sidebar and drop them into the editor area. For example you can drive Wall-E, move the actuators, and play audio sounds. This is a great way for kids to learn the basics of programming while having fun!

For the commands which drive the motors, you may need to tune the parameters at the bottom of the "config.py" file on lines [25](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L25) to [28](https://github.com/chillibasket/walle-replica/blob/master/web_interface/config.py#L28) to make sure that the speed and turning amount is correct. 

<br />

#### [e] Adding a Camera Stream (Optional)

The web server automatically supports any camera which connects to the CSI connector on the Raspberry Pi with a ribbon cable. Unfortunately USB web cameras are not supported by this system, but I hope to add support for them again in the future. 

<br />

#### [f] Adding new Sounds (Optional)
1. By default the Raspberry should automatically select whether to output audio to the HDMI port or the headphone jack. However, you can ensure that it always uses the headphone jack with the following command: `amixer cset numid=3 1`
1. Make sure that all the sound files you want to use are of type `*.wav`. Most music/sound editors should be able to convert the sound file to this format.
1. Change the file name so that it has the following format: `[group name]_[file name]_[length in milliseconds].wav`. For example: `voice_eva_1200.wav`. In the web-interface, the audio files will be grouped using the "group name" and sorted alphabetically.
1. Upload the sound file to Raspberry Pi in the following folder: `~/walle-replica/web_interface/static/sounds/`
1. All the files should appear in the web interface when you reload the page. If the files do not appear, you may need to change the privileges required to access the folder: `sudo chmod -R 755 ~/walle-replica/web_interface/static/sounds`

<br />

#### [g] Set up the Raspberry Pi as a WiFi hotspot *(Optional)*
If you would like to control the robot outdoors or at conventions, there may not be any safe WiFi networks you can connect to. To overcome this issue the Raspberry Pi can broadcast its own WiFi network. You can then connect the computer/phone/tablet you are using to control the robot directly to this network.

To set up the WiFi hotspot, we will use the [RaspAP project](https://raspap.com/) which takes care of all the configuration and tools to get the system working. The following instructions are based on their quick installation guide:

1. Update Raspian, the kernel and firmware (and then reboot):
    ```
    sudo apt-get update
    sudo apt-get dist-upgrade
    sudo reboot now
    ```
1. Ensure that you have set the correct WiFi country in raspi-config’s Localisation Options: `sudo raspi-config`
1. Run the quick installer: `curl -sL https://install.raspap.com | bash`
    1. For the first few yes/no prompts which will appear during the install, type “y” (yes) to accept all of the recommended settings. The final two prompts (Ad Blocking and the next one) are not required so you can type “n” (no) for those.
1. Reboot the Raspberry Pi again to implement the changes: `sudo reboot`
1. Now the Raspberry Pi should be broadcasting a WiFi network with the following details:
    1. SSID (wifi name): `raspi-webgui`
    1. Password: `ChangeMe`
1. After connecting to the WiFi network from a your computer, phone or tablet, the Wall-E web-interface can be opened by typing this address into your browser: `http://10.3.141.1:5000`
1. (Recommended) To change the WiFi name and password, go to the WiFi configuration webpage at: `http://10.3.141.1`. The default username is `admin` and password is `secret`.
    1. Click on “Hotspot” in the left sidebar. In the “Basic” tab you can change the WiFi network name, while the WiFi password can be changed in the “Security” tab.
    1. To change the admin password for the interface used to manage the WiFi settings, click on the “Admin” icon in the top-right of the interface.

<br />
<br />


## Changelog

#### 9th June 2024 (Version 3.0)
1. Major revision of the Python code to implement best practices and make it more robust.
1. Added text to speech and integrated blocky scripting into the web interface (thanks to [dkrey](https://github.com/dkrey) for contributing this).
1. Switched the camera streamer to PiCamera2 since the old streamer no longer worked. 
1. Implemented an installation script to make setup a lot faster and easier. 

#### 31st October 2021 (Version 2.92)
1. Added options in *app.py* to automatically connect to the Arduino and to start the camera stream when the web-interface is opened for the first time.

#### 30th October 2021 (Version 2.91)
1. Changed camera stream port from 8081 to 8080 inline with changes made to the start/stop script.
1. Improved the camera setup instructions, listing all steps explicitly rather than linking to an external repository.

#### 29th May 2021 (Version 2.9)
1. Improved code commenting and variable/parameter naming to make it easier to understand.
1. Fixed bugs related to motor deadzone and trim parameters.

#### 21st March 2021 (Version 2.8)
1. Updated instructions of how to use an oLed display. 

#### 19th December 2020
1. Updated instructions of how to set up a WiFi hotspot on the Raspberry Pi. 
1. Added offline Lato font files to prevent errors when running the web-interface while disconnected from the internet.

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