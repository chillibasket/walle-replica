# walle-replica
Robot and controller code for a Wall-E replica robot. For more information about the robot, visit https://wired.chillibasket.com


## Arduino Code (wall-e)
Main program to control the motors and servos of the robot. Features include:
1. An animation queue, keeping track of the next servo movements the robot needs to perform.
1. A random movement generator, allowing the robot to autonomously move and appear animated.
1. Velocity control of all servo motors, facilitating smooth accelerations and decelerations. 
1. Non-blocking serial parsing, allowing the movements of the robot to be remote controlled.


## Raspberry Pi Web Server (web_interface)
The web interface is programmed in Python and uses *Flask* to generate a server. The Raspberry Pi is connected via USB to the Arduino micro-controller. The main features are:
1. A javascript joystick, with which the movement of the robot can easily be controller.
1. A list of sounds which can be played.
1. A list of movement animations which can be performed by the robot.
1. Settings page, where motor parameters, sound volume, and video options can be modified.
1. A simple login page to prevent everyone from having access to the controls (note: this is not a full access control system, please don't use this web interface on untrusted/public networks)