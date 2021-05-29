/**
 * WALL-E CONTROLLER CODE
 *
 * @file       wall-e.ino
 * @brief      Main Wall-E Controller Sketch
 * @author     Simon Bluett
 * @email      hello@chillibasket.com
 * @copyright  Copyright (C) 2021 - Distributed under MIT license
 * @version    2.9
 * @date       29th May 2021
 *
 * HOW TO USE:
 * 1. Install the Adafruit_PWMServoDriver library
 *    a. In the Arduino IDE, go to Sketch->Include Library->Manage Libraries
 *    b. Search for Adafruit PWM Library, and install the latest version
 * 2. Calibrate the servo motors, using the calibration sketch provided in the
 *    GitHub repository. Paste the calibrated values between lines 144 to 150.
 * 3. Upload the sketch to the micro-controller, and open the serial monitor 
 *    at a baud rate of 115200.
 * 4. Additional instructions and hints can be found at:
 *    https://wired.chillibasket.com/3d-printed-wall-e/
 */

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include "Queue.hpp"
#include "MotorController.hpp"


/// Define pin-mapping
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define DIRECTION_L_PIN 12           // Motor direction pins
#define DIRECTION_R_PIN 13
#define PWM_SPEED_L_PIN  3           // Motor PWM pins
#define PWM_SPEED_R_PIN 11
#define BRAKE_L_PIN  9               // Motor brake pins
#define BRAKE_R_PIN  8
#define SERVO_ENABLE_PIN 10          // Servo shield output enable pin


/**
 * Battery level detection
 *
 *   .------R1-----.-------R2------.     | The diagram to the left shows the  |
 *   |             |               |     | potential divider circuit used by  |
 * V_Raw     Analogue pin A2      GND    | the battery level detection system |
 *
 * @note The scaling factor is calculated according to ratio of the two resistors:
 *       DIVIDER_SCALING_FACTOR = R2 / (R1 + R2)
 *       For example: 47000 / (100000 + 47000) = 0.3197
 *
 * To enable battery level detection, uncomment the next line:
 */
//#define BAT_L
#ifdef BAT_L
	#define BATTERY_LEVEL_PIN A2
	#define BATTERY_MAX_VOLTAGE 12.6
	#define BATTERY_MIN_VOLTAGE 10.2
	#define DIVIDER_SCALING_FACTOR 0.3197


	/**
	 * OLED Battery Level Display
	 *
	 * Displays the battery level on an oLed display. Supports a 1.3 inch oLed display using I2C.
	 * The constructor is set to a SH1106 1.3 inch display. Change the constructor if you want to use a different display.
	 * 
	 * @note Requires Battery level detection to be enabled above
	 * @note You may get a "Low memory available" warning when compiling for Arduino UNO boards (79% memory usage).
	 *       It did work in my case, so you should be able to ignore this message.
	 *
	 * To enable the oLED display, uncomment the next line:
	 */
	//#define OLED
	#ifdef OLED
	  
	  #include <U8g2lib.h>
	  U8G2_SH1106_128X64_NONAME_1_HW_I2C u8g2(U8G2_R0, 10);

	#endif /* OLED */
#endif /* BAT_L */


/// Define other constants
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define NUMBER_OF_SERVOS 7        // Number of servo motors
#define SERVO_UPDATE_TIME 10      // Time in milliseconds of how often to update servo and motor positions
#define SERVO_OFF_TIME 6000       // Turn servo motors off after 6 seconds
#define STATUS_CHECK_TIME 10000   // Time in milliseconds of how often to check robot status (eg. battery level)
#define CONTROLLER_THRESHOLD 1    // The minimum error which the dynamics controller tries to achieve
#define MAX_SERIAL_LENGTH 5       // Maximum number of characters that can be received



/// Instantiate Objects
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo shield controller class - assumes default address 0x40
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// Set up motor controller classes
MotorController motorL(DIRECTION_L_PIN, PWM_SPEED_L_PIN, BRAKE_L_PIN, false);
MotorController motorR(DIRECTION_R_PIN, PWM_SPEED_R_PIN, BRAKE_R_PIN, false);

// Queue for animations - buffer is defined outside of the queue class
// so that the compiler knows how much dynamic memory will be used
struct animation_t {
	uint16_t timer;
	int8_t servos[NUMBER_OF_SERVOS]; 
};

#define QUEUE_LENGTH 40
animation_t buffer[QUEUE_LENGTH];
Queue <animation_t> queue(QUEUE_LENGTH, buffer);


/// Motor Control Variables
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
int pwmspeed = 255;
int moveValue = 0;
int turnValue = 0;
int turnOffset = 0;
int motorDeadzone = 0;


/// Runtime Variables
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
unsigned long lastTime = 0;
unsigned long animeTimer = 0;
unsigned long motorTimer = 0;
unsigned long statusTimer = 0;
unsigned long updateTimer = 0;
bool autoMode = false;


// Serial Parsing
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
char firstChar;
char serialBuffer[MAX_SERIAL_LENGTH];
uint8_t serialLength = 0;


// ****** SERVO MOTOR CALIBRATION *********************
// Servo Positions:  Low,High
int preset[][2] =  {{410,120},  // head rotation
                    {532,178},  // neck top
                    {120,310},  // neck bottom
                    {465,271},  // eye right
                    {278,479},  // eye left
                    {340,135},  // arm left
                    {150,360}}; // arm right
// *****************************************************


// Servo Control - Position, Velocity, Acceleration
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo Pins:	     0,   1,   2,   3,   4,   5,   6,   -,   -
// Joint Name:	  head,necT,necB,eyeR,eyeL,armL,armR,motL,motR
float curpos[] = { 248, 560, 140, 475, 270, 250, 290, 180, 180};  // Current position (units)
float setpos[] = { 248, 560, 140, 475, 270, 250, 290,   0,   0};  // Required position (units)
float curvel[] = {   0,   0,   0,   0,   0,   0,   0,   0,   0};  // Current velocity (units/sec)
float maxvel[] = { 500, 400, 500,2400,2400, 600, 600, 255, 255};  // Max Servo velocity (units/sec)
float accell[] = { 350, 300, 480,1800,1800, 500, 500, 800, 800};  // Servo acceleration (units/sec^2)



// -------------------------------------------------------------------
/// Initial setup
// -------------------------------------------------------------------

void setup() {

	// Output Enable (EO) pin for the servo motors
	pinMode(SERVO_ENABLE_PIN, OUTPUT);
	digitalWrite(SERVO_ENABLE_PIN, HIGH);

	// Communicate with servo shield (Analog servos run at ~60Hz)
	pwm.begin();
	pwm.setPWMFreq(60);

	// Turn off servo outputs
	for (int i = 0; i < NUMBER_OF_SERVOS; i++) {
		pwm.setPin(i, 0);
	}

	// Initialize serial communication for debugging
	Serial.begin(115200);
	Serial.println(F("--- Wall-E Control Sketch ---"));

	randomSeed(analogRead(0));

	// Check if servo animation queue is working, and move servos to known starting positions
	if (queue.errors()) Serial.println(F("Error: Unable to allocate memory for servo animation queue"));
	
	// Soft start the servo motors
	Serial.println(F("Starting up the servo motors"));
	digitalWrite(SERVO_ENABLE_PIN, LOW);
	playAnimation(0);
	softStart(queue.pop(), 3500);

	// If an oLED is present, start it up
	#ifdef OLED
		Serial.println(F("Starting up the display"));
		u8g2.begin();
		displayLevel(100);
	#endif

	Serial.println(F("Sartup complete; entering main loop"));
}



// -------------------------------------------------------------------
/// Read input from serial port
///
/// This function reads incoming characters in the serial port
/// and inserts them into a buffer to be processed later.
// -------------------------------------------------------------------

void readSerial() {

	// Read incoming byte
	char inchar = Serial.read();

	// If the string has ended, evaluate the serial buffer
	if (inchar == '\n' || inchar == '\r') {

		if (serialLength > 0) evaluateSerial();
		serialBuffer[0] = 0;
		serialLength = 0;

	// Otherwise add to the character to the buffer
	} else {
		if (serialLength == 0) firstChar = inchar;
		else {
			serialBuffer[serialLength-1] = inchar;
			serialBuffer[serialLength] = 0;
		}
		serialLength++;

		// To prevent overflows, evalute the buffer if it is full
		if (serialLength == MAX_SERIAL_LENGTH) {
			evaluateSerial();
			serialBuffer[0] = 0;
			serialLength = 0;
		}
	}
}



// -------------------------------------------------------------------
/// Evaluate input from serial port
///
/// Parse the received serial message which is stored in
/// the "serialBuffer" filled by the "readSerial()" function
// -------------------------------------------------------------------

void evaluateSerial() {

	// Evaluate integer number in the serial buffer
	int number = atoi(serialBuffer);

	Serial.print(firstChar); Serial.println(number);


	// Motor Inputs and Offsets
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if      (firstChar == 'X' && number >= -100 && number <= 100) turnValue = int(number * 2.55);       // Left/right control
	else if (firstChar == 'Y' && number >= -100 && number <= 100) moveValue = int(number * 2.55);       // Forward/reverse control
	else if (firstChar == 'S' && number >= -100 && number <= 100) turnOffset = number;                  // Steering offset
	else if (firstChar == 'O' && number >=    0 && number <= 250) motorDeadzone = int(number);          // Motor deadzone offset


	// Animations
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'A') playAnimation(number);


	// Autonomous servo mode
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'M' && number == 0) autoMode = false;
	else if (firstChar == 'M' && number == 1) autoMode = true;


	// Manual servo control
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'L' && number >= 0 && number <= 100) {   // Move left arm
		autoMode = false;
		queue.clear();
		setpos[5] = int(number * 0.01 * (preset[5][1] - preset[5][0]) + preset[5][0]);
	} else if (firstChar == 'R' && number >= 0 && number <= 100) { // Move right arm
		autoMode = false;
		queue.clear();
		setpos[6] = int(number * 0.01 * (preset[6][1] - preset[6][0]) + preset[6][0]);
	} else if (firstChar == 'B' && number >= 0 && number <= 100) { // Move neck bottom
		autoMode = false;
		queue.clear();
		setpos[2] = int(number * 0.01 * (preset[2][1] - preset[2][0]) + preset[2][0]);
	} else if (firstChar == 'T' && number >= 0 && number <= 100) { // Move neck top
		autoMode = false;
		queue.clear();
		setpos[1] = int(number * 0.01 * (preset[1][1] - preset[1][0]) + preset[1][0]);
	} else if (firstChar == 'G' && number >= 0 && number <= 100) { // Move head rotation
		autoMode = false;
		queue.clear();
		setpos[0] = int(number * 0.01 * (preset[0][1] - preset[0][0]) + preset[0][0]);
	} else if (firstChar == 'E' && number >= 0 && number <= 100) { // Move eye left
		autoMode = false;
		queue.clear();
		setpos[4] = int(number * 0.01 * (preset[4][1] - preset[4][0]) + preset[4][0]);
	} else if (firstChar == 'U' && number >= 0 && number <= 100) { // Move eye right
		autoMode = false;
		queue.clear();
		setpos[3] = int(number * 0.01 * (preset[3][1] - preset[3][0]) + preset[3][0]);
	}
	

	// Manual Movements with WASD
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'w') {		// Forward movement
		moveValue = pwmspeed;
		turnValue = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 'q') {		// Stop movement
		moveValue = 0;
		turnValue = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 's') {		// Backward movement
		moveValue = -pwmspeed;
		turnValue = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 'a') {		// Drive & look left
		moveValue = 0;
		turnValue = -pwmspeed;
		setpos[0] = preset[0][0];
	}
	else if (firstChar == 'd') {   		// Drive & look right
		moveValue = 0;
		turnValue = pwmspeed;
		setpos[0] = preset[0][1];
	}


	// Manual Eye Movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'j') {		// Left head tilt
		setpos[4] = preset[4][0];
		setpos[3] = preset[3][1];
	}
	else if (firstChar == 'l') {		// Right head tilt
		setpos[4] = preset[4][1];
		setpos[3] = preset[3][0];
	}
	else if (firstChar == 'i') {		// Sad head
		setpos[4] = preset[4][0];
		setpos[3] = preset[3][0];
	}
	else if (firstChar == 'k') {		// Neutral head
		setpos[4] = int(0.4 * (preset[4][1] - preset[4][0]) + preset[4][0]);
		setpos[3] = int(0.4 * (preset[3][1] - preset[3][0]) + preset[3][0]);
	}


	// Head movement
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'f') {		// Head up
		setpos[1] = preset[1][0];
		setpos[2] = (preset[2][1] + preset[2][0])/2;
	}
	else if (firstChar == 'g') {		// Head forward
		setpos[1] = preset[1][1];
		setpos[2] = preset[2][0];
	}
	else if (firstChar == 'h') {		// Head down
		setpos[1] = preset[1][0];
		setpos[2] = preset[2][0];
	}
	

	// Arm Movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'b') {		// Left arm low, right arm high
		setpos[5] = preset[5][0];
		setpos[6] = preset[6][1];
	}
	else if (firstChar == 'n') {		// Both arms neutral
		setpos[5] = (preset[5][0] + preset[5][1]) / 2;
		setpos[6] = (preset[6][0] + preset[6][1]) / 2;
	}
	else if (firstChar == 'm') {		// Left arm high, right arm low
		setpos[5] = preset[5][1];
		setpos[6] = preset[6][0];
	}
}



// -------------------------------------------------------------------
/// Sequence and generate animations
// -------------------------------------------------------------------

void manageAnimations() {

	// If we are running an animation
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if ((queue.size() > 0) && (animeTimer <= millis())) {
		// Set the next waypoint time
		animation_t newValues = queue.pop();
		animeTimer = millis() + newValues.timer;

		// Set all the joint positions
		for (int i = 0; i < NUMBER_OF_SERVOS; i++) {
			// Scale the positions using the servo calibration values
			setpos[i] = int(newValues.servos[i] * 0.01 * (preset[i][1] - preset[i][0]) + preset[i][0]);
		}


	// If we are in autonomous mode and no movements are queued, generate random movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	} else if (autoMode && queue.empty() && (animeTimer <= millis())) {

		// For each of the servos
		for (int i = 0; i < NUMBER_OF_SERVOS; i++) {

			// Randomly determine whether or not to update the servo
			if (random(2) == 1) {

				// For most of the servo motors
				if (i == 0 || i == 1 || i == 5 || i == 6) {

					// Randomly determine the new position
					unsigned int min = preset[i][0];
					unsigned int max = preset[i][1];
					if (min > max) {
						min = max;
						max = preset[i][0];
					}
					
					setpos[i] = random(min, max+1);

				// Since the eyes should work together, only look at one of them
				} else if (i == 3) {

					int midPos1 = int((preset[i][1] - preset[i][0])*0.4 + preset[i][0]);
					int midPos2 = int((preset[i+1][1] - preset[i+1][0])*0.4 + preset[i+1][0]);

					// Determine which type of eye movement to do
					// Both eye move downwards
					if (random(2) == 1) {
						setpos[i] = random(midPos1, preset[i][0]);
						float multiplier = (setpos[i] - midPos1) / float(preset[i][0] - midPos1);
						setpos[i+1] = ((1 - multiplier) * (midPos2 - preset[i+1][0])) + preset[i+1][0];

					// Both eyes move in opposite directions
					} else {
						setpos[i] = random(midPos1, preset[i][0]);
						float multiplier = (setpos[i] - preset[i][1]) / float(preset[i][0] - preset[i][1]);
						setpos[i+1] = (multiplier * (preset[i+1][1] - preset[i+1][0])) + preset[i+1][0];
					}
				}

			}
		}

		// Finally, figure out the amount of time until the next movement should be done
		animeTimer = millis() + random(500, 3000);

	}
}



// -------------------------------------------------------------------
/// Manage the movement of the servo motors
///
/// @param  dt  Time in milliseconds since function was last called
///
/// This function uses the formulae:
///   (s = position, v = velocity, a = acceleration, t = time)
///   s = v^2 / (2*a)  <- to figure out whether to start slowing down
///   v = v + a*t      <- to calculate new servo velocity
///   s = s + v*t      <- to calculate new servo position
// -------------------------------------------------------------------

void manageServos(float dt) {

	bool moving = false;

	// For each of the servo motors
	for (int i = 0; i < NUMBER_OF_SERVOS; i++) {

		float posError = setpos[i] - curpos[i];

		// If position error is above the threshold
		if (abs(posError) > CONTROLLER_THRESHOLD && (setpos[i] != -1)) {

			digitalWrite(SERVO_ENABLE_PIN, LOW);
			moving = true;

			// Determine motion direction
			bool dir = true;
			if (posError < 0) dir = false;

			// Determine whether to accelerate or decelerate
			float acceleration = accell[i];
			if ((curvel[i] * curvel[i] / (2 * accell[i])) > abs(posError)) acceleration = -accell[i];

			// Update the current velocity
			if (dir) curvel[i] += acceleration * dt / 1000.0;
			else curvel[i] -= acceleration * dt / 1000.0;

			// Limit Velocity
			if (curvel[i] > maxvel[i]) curvel[i] = maxvel[i];
			if (curvel[i] < -maxvel[i]) curvel[i] = -maxvel[i];
			
			float dP = curvel[i] * dt / 1000.0;

			if (abs(dP) < abs(posError)) curpos[i] += dP;
			else curpos[i] = setpos[i];

			pwm.setPWM(i, 0, curpos[i]);

		} else {
			curvel[i] = 0;
		}
	}

	// Disable servos if robot is not moving
	// This helps prevents the motors from overheating
	if (moving) motorTimer = millis();
	else if (millis() - motorTimer >= SERVO_OFF_TIME) {
		//digitalWrite(SERVO_ENABLE_PIN, HIGH);
		for (int i = 0; i < NUMBER_OF_SERVOS; i++) {
			pwm.setPin(i, 0);
		}
	}
}



// -------------------------------------------------------------------
/// Servo "Soft Start" function
/// 
/// This function tries to start the servos up servo gently,
/// reducing the sudden jerking motion which usually occurs
/// when the motors power up for the first time.
///
/// @param  targetPos  The target position of the servos after startup
/// @param  timeMs     Time in milliseconds in which soft start should complete
// -------------------------------------------------------------------

void softStart(animation_t targetPos, int timeMs) {

	for (int i = 0; i < NUMBER_OF_SERVOS; i++) {
		if (targetPos.servos[i] >= 0) {
			curpos[i] = int(targetPos.servos[i] * 0.01 * (preset[i][1] - preset[i][0]) + preset[i][0]);

			unsigned long endTime = millis() + timeMs / NUMBER_OF_SERVOS;

			while (millis() < endTime) {
				pwm.setPWM(i, 0, curpos[i]);
				delay(10);
				pwm.setPin(i, 0);
				delay(50);
			}
			pwm.setPWM(i, 0, curpos[i]);
			setpos[i] = curpos[i];
		}
	}
}



// -------------------------------------------------------------------
/// Manage the movement of the main motors
///
/// @param  dt  Time in milliseconds since function was last called
// -------------------------------------------------------------------

void manageMotors(float dt) {

	// Update Main Motor Values
	setpos[NUMBER_OF_SERVOS] = moveValue - turnValue;
	setpos[NUMBER_OF_SERVOS + 1] = moveValue + turnValue;

	// Apply turn offset (motor trim) only when motors are active
	if (setpos[NUMBER_OF_SERVOS] != 0) setpos[NUMBER_OF_SERVOS] -= turnOffset;
	if (setpos[NUMBER_OF_SERVOS + 1] != 0) setpos[NUMBER_OF_SERVOS + 1] += turnOffset;

	for (int i = NUMBER_OF_SERVOS; i < NUMBER_OF_SERVOS + 2; i++) {

		float velError = setpos[i] - curvel[i];

		// If velocity error is above the threshold
		if (abs(velError) > CONTROLLER_THRESHOLD && (setpos[i] != -1)) {

			// Determine whether to accelerate or decelerate
			float acceleration = accell[i];
			if (setpos[i] < curvel[i] && curvel[i] >= 0) acceleration = -accell[i];
			else if (setpos[i] < curvel[i] && curvel[i] < 0) acceleration = -accell[i]; 
			else if (setpos[i] > curvel[i] && curvel[i] < 0) acceleration = accell[i];

			// Update the current velocity
			float dV = acceleration * dt / 1000.0;
			if (abs(dV) < abs(velError)) curvel[i] += dV;
			else curvel[i] = setpos[i];
		} else {
			curvel[i] = setpos[i];
		}

		// Apply deadzone offset
		if (curvel[i] > 0) curvel[i] += motorDeadzone;
		else if (curvel[i] < 0) curvel[i] -= motorDeadzone; 

		// Limit Velocity
		if (curvel[i] > maxvel[i]) curvel[i] = maxvel[i];
		if (curvel[i] < -maxvel[i]) curvel[i] = -maxvel[i];
	}

	// Update motor speeds
	motorL.setSpeed(curvel[NUMBER_OF_SERVOS]);
	motorR.setSpeed(curvel[NUMBER_OF_SERVOS+1]);
}



// -------------------------------------------------------------------
/// Battery level detection
// -------------------------------------------------------------------

#ifdef BAT_L
void checkBatteryLevel() {

	// Read the analogue pin and calculate battery voltage
	float voltage = analogRead(BATTERY_LEVEL_PIN) * 5 / 1024.0;
	voltage = voltage / DIVIDER_SCALING_FACTOR;
	int percentage = int(100 * (voltage - BATTERY_MIN_VOLTAGE) / float(BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE));

  // Update the oLed Display if installed
  #ifdef OLED
    displayLevel(percentage);
  #endif

	// Send the percentage via serial
	Serial.print(F("Battery_")); Serial.println(percentage);
}
#endif



// -------------------------------------------------------------------
/// Main program loop
// -------------------------------------------------------------------

void loop() {

	// Read any new serial messages
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if (Serial.available() > 0){
		readSerial();
	}


	// Load or generate new animations
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	manageAnimations();


	// Move Servos and wheels at regular time intervals
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if (millis() - updateTimer >= SERVO_UPDATE_TIME) {
		updateTimer = millis();

		unsigned long newTime = micros();
		float dt = (newTime - lastTime) / 1000.0;
		lastTime = newTime;

		manageServos(dt);
		manageMotors(dt);
	}


	// Update robot status
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if (millis() - statusTimer >= STATUS_CHECK_TIME) {
		statusTimer = millis();

		#ifdef BAT_L
			checkBatteryLevel();
		#endif
	}
}
