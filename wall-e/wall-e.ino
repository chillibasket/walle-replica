/* WALL-E CONTROLLER CODE
 ********************************************
 * Code by: Simon Bluett
 * Email:   hello@chillibasket.com
 * Version: 2.6 (Eyebrow Version)
 * Date:    23rd February 2020
 ********************************************/

/* HOW TO USE:
 * 1. Install the Adafruit_PWMServoDriver library
 *    a. In the Arduino IDE, go to Sketch->Include Library->Manage Libraries
 *    b. Search for Adafruit PWM Library, and install version 1.0.2
 * 2. Calibrate the servo motors, using the calibration sketch provided in the
 *    GitHub repository. Paste the calibrated values between line 108 to 114.
 * 3. Upload the sketch to the micro-controller, and open serial monitor at 
 *    a baud rate of 115200.
 * 4. Additional instructions and hints can be found at:
 *    https://wired.chillibasket.com/3d-printed-wall-e/
 */

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include "Queue.hpp"
#include "MotorController.hpp"


// Define the pin-mapping
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define DIR_L 12           // Motor direction pins
#define DIR_R 13
#define PWM_L  3           // Motor PWM pins
#define PWM_R 11
#define BRK_L  9           // Motor brake pins
#define BRK_R  8
#define SR_OE 10           // Servo shield output enable pin


// Battery level detection
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
//
//   .------R1-----.-------R2------.     | The diagram to the left shows the  |
//   |             |               |     | potential divider circuit used by  |
// V_Raw     Analogue pin A2      GND    | the battery level detection system |
//
// The scaling factor is calculated according to ratio of the two resistors:
//   POT_DIV = R2 / (R1 + R2)
//   For example: 47000 / (100000 + 47000) = 0.3197
//
// To enable battery level detection, uncomment the next line:
//#define BAT_L A2 			// Battery level detection analogue pin
#ifdef BAT_L
	#define BAT_MAX 12.6   // Maximum voltage
	#define BAT_MIN 10.2   // Minimum voltage
	#define POT_DIV 0.3197 // Potential divider scaling factor
#endif


// Define other constants
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define FREQUENCY 10       // Time in milliseconds of how often to update servo and motor positions
#define SERVOS 9           // Number of servo motors (7 normal servos plus the two eyebrow servos)
#define THRESHOLD 1        // The minimum error which the dynamics controller tries to achieve
#define MOTOR_OFF 6000 	   // Turn servo motors off after 6 seconds
#define MAX_SERIAL 5       // Maximum number of characters that can be received
#define STATUS_TIME 10000  // Time in milliseconds of how often to check robot status (eg. battery level)


// Instantiate objects
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo shield controller class - assumes default address 0x40
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

// Set up motor controller classes
MotorController motorL(DIR_L, PWM_L, BRK_L, false);
MotorController motorR(DIR_R, PWM_R, BRK_R, false);

// Queue for animations
Queue <int> queue(400);


// Motor Control Variables
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
int pwmspeed = 255;
int moveVal = 0;
int turnVal = 0;
int turnOff = 0;


// Runtime Variables
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
char serialBuffer[MAX_SERIAL];
uint8_t serialLength = 0;


// ****** SERVO MOTOR CALIBRATION *********************
// Servo Positions:  Low,High
int preset[][2] =  {{410, 125},   // head rotation
                    {205, 538},   // neck top
                    {140, 450},   // neck bottom
                    {485, 230},   // eye right
                    {274, 495},   // eye left
                    {355, 137},   // arm left
                    {188, 420},   // arm right
                    {200, 400},   // eyebrow left
                    {400, 200}};  // eyebrow right
// *****************************************************


// Servo Control - Position, Velocity, Acceleration
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo Pins:	     0,   1,   2,   3,   4,   5,   6,   7,   8,   -,   -
// Joint Name:	  head,necT,necB,eyeR,eyeL,armL,armR,ebrL,ebrR,motL,motR
float curpos[] = { 248, 560, 140, 475, 270, 250, 290, 300, 300, 180, 180};  // Current position (units)
float setpos[] = { 248, 560, 140, 475, 270, 250, 290, 300, 300,   0,   0};  // Required position (units)
float curvel[] = {   0,   0,   0,   0,   0,   0,   0,   0,   0,   0,   0};  // Current velocity (units/sec)
float maxvel[] = { 500, 750, 255,2400,2400, 500, 500,1000,1000, 255, 255};  // Max Servo velocity (units/sec)
float accell[] = { 350, 480, 150,1800,1800, 300, 300,1200,1200, 800, 800};  // Servo acceleration (units/sec^2)


// Animation Presets 
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// (Time is in milliseconds)
// (Servo values are between 0 to 100, use -1 to disable the servo)
#define SOFT_LEN 7
// Starting Sequence:              time,head,necT,necB,eyeR,eyeL,armL,armR,ebrL,ebrR
const int softSeq[][SERVOS+1] =  {{ 200,  50,  69,  29,   1,   1,  41,  41,   1,   1},
                                  { 200,  50,  70,  29,   1,   1,  41,  41,   0,   0},
                                  { 200,  50,  70,  30,   1,   1,  41,  41,   0,   0},
                                  { 200,  50,  70,  30,   0,   1,  41,  41,   0,   0},
                                  { 200,  50,  70,  30,   0,   0,  41,  41,   0,   0},
                                  { 200,  50,  70,  30,   0,   0,  40,  41,   0,   0},
                                  { 200,  50,  70,  30,   0,   0,  40,  40,   0,   0}};

#define BOOT_LEN 9
// Bootup Eye Sequence:            time,head,necT,necB,eyeR,eyeL,armL,armR,ebrL,ebrR
const int bootSeq[][SERVOS+1] =  {{2000,  50,  68,   0,  40,  40,  40,  40,   0,   0},
                                  { 700,  50,  68,   0,  40,   0,  40,  40,   0,   0},
                                  { 700,  50,  68,   0,   0,   0,  40,  40,   0,   0},
                                  { 700,  50,  68,   0,   0,  40,  40,  40,   0,   0},
                                  { 700,  50,  68,   0,  40,  40,  40,  40,   0,   0},
                                  { 400,  50,  68,   0,   0,   0,  40,  40,   0,   0},
                                  { 400,  50,  68,   0,  40,  40,  40,  40,   0,   0},
                                  {2000,  50,  85,   0,  40,  40,  40,  40,   0,   0},
                                  {1000,  50,  85,   0,   0,   0,  40,  40,   0,   0}};

#define INQU_LEN 9
// Inquisitive Movements:          time,head,necT,necB,eyeR,eyeL,armL,armR,ebrL,ebrR
const int inquSeq[][SERVOS+1] =  {{3000,  48,  60,   0,  35,  45,  60,  59,   0,   0},
                                  {1500,  48,  60,   0, 100,   0, 100, 100,   0,   0},
                                  {3000,   0,   0,   0, 100,   0, 100, 100,   0,   0},
                                  {1500,  48,   0,   0,  40,  40, 100, 100,   0,   0},
                                  {1500,  48,  60,   0,  45,  35,   0,   0,  50,  50},
                                  {1500,  34,  44,   0,  14, 100,   0,   0, 100,   0},
                                  {1500,  48,  60,   0,  35,  45,  60,  59,   0,   0},
                                  {3000, 100,  60,   0,  40,  40,  60, 100,   0,   0},
                                  {1500,  48, 100,   0,   0,   0,   0,   0,   0,   0}};

void queueAnimation(const int seq[][SERVOS+1], int len);


// ------------------------------------------------------------------
// 		INITIAL SETUP
// ------------------------------------------------------------------
void setup() {

	// Initialize serial communication for debugging
	Serial.begin(115200);

	randomSeed(analogRead(0));

	// Output Enable (EO) pin for the servo motors
	pinMode(SR_OE, OUTPUT);
	digitalWrite(SR_OE, HIGH);

	// Communicate with servo shield (Analog servos run at ~60Hz)
	pwm.begin();
	pwm.setPWMFreq(60);

	Serial.println("Starting Program");

	// Move servos to known starting positions
	queueAnimation(softSeq, SOFT_LEN);
}


// ------------------------------------------------------------------
// 		QUEUE ANIMATIONS
// ------------------------------------------------------------------
void queueAnimation(const int seq[][SERVOS+1], int len) {
	for (int i = 0; i < len; i++) {
		for (int j = 0; j < SERVOS+1; j++) {
			queue.push(seq[i][j]);
		}
	}
}


// -------------------------------------------------------------------
// 		READ INPUT FROM SERIAL
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
		if (serialLength == MAX_SERIAL) {
			evaluateSerial();
			serialBuffer[0] = 0;
			serialLength = 0;
		}
	}
}


// -------------------------------------------------------------------
// 		EVALUATE INPUT FROM SERIAL
// -------------------------------------------------------------------
void evaluateSerial() {
	// Evaluate integer number in the serial buffer
	int number = atoi(serialBuffer);

	Serial.print(firstChar); Serial.println(number);

	// Motor Inputs and Offsets
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if      (firstChar == 'X' && number >= -100 && number <= 100) turnVal = int(number * 2.55); 		// Left/right control
	else if (firstChar == 'Y' && number >= -100 && number <= 100) moveVal = int(number * 2.55); 		// Forward/reverse movement
	else if (firstChar == 'S' && number >=  100 && number <= 100) turnOff = number; 					// Steering offset
	else if (firstChar == 'O' && number >=    0 && number <= 250) curpos[7] = curpos[8] = int(number); 	// Motor deadzone offset

	// Animations
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'A' && number == 0) queueAnimation(softSeq, SOFT_LEN);
	else if (firstChar == 'A' && number == 1) queueAnimation(bootSeq, BOOT_LEN);
	else if (firstChar == 'A' && number == 2) queueAnimation(inquSeq, INQU_LEN);

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
	} else if (firstChar == 'J' && number >= 0 && number <= 100) { // Move eyebrow left
		autoMode = false;
		queue.clear();
		setpos[7] = int(number * 0.01 * (preset[7][1] - preset[7][0]) + preset[7][0]);
	} else if (firstChar == 'K' && number >= 0 && number <= 100) { // Move eyebrow right
		autoMode = false;
		queue.clear();
		setpos[8] = int(number * 0.01 * (preset[8][1] - preset[8][0]) + preset[8][0]);
	}
	
	// Manual Movements with WASD
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'w') {		// Forward movement
		moveVal = pwmspeed;
		turnVal = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 'q') {		// Stop movement
		moveVal = 0;
		turnVal = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 's') {		// Backward movement
		moveVal = -pwmspeed;
		turnVal = 0;
		setpos[0] = (preset[0][1] + preset[0][0]) / 2;
	}
	else if (firstChar == 'a') {		// Drive & look left
		moveVal = 0;
		turnVal = -pwmspeed;
		setpos[0] = preset[0][0];
	}
	else if (firstChar == 'd') {   		// Drive & look right
		moveVal = 0;
		turnVal = pwmspeed;
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

	// Manual Eyebrow Movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'r') {		// Left eyebrow up
		setpos[7] = preset[7][1];
		setpos[8] = preset[8][0];
	}
	else if (firstChar == 't') {		// Both eyebrows up
		setpos[7] = preset[7][1];
		setpos[8] = preset[8][1];
	}
	else if (firstChar == 'y') {		// Both eyebrows down
		setpos[7] = preset[7][0];
		setpos[8] = preset[8][0];
	}
	else if (firstChar == 'u') {		// Right eyerbrow up
		setpos[7] = preset[7][0];
		setpos[8] = preset[8][1];
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
// 		SEQUENCE AND GENERATE ANIMATIONS
// -------------------------------------------------------------------
void manageAnimations() {
	// If we are running an animation
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if ((queue.size() >= SERVOS+1) && (animeTimer <= millis())) {
		// Set the next waypoint time
		animeTimer = millis() + queue.pop();

		// Set all the joint positions
		for (int i = 0; i < SERVOS; i++) {
			int value = queue.pop();

			// Scale the positions using the servo calibration values
			setpos[i] = int(value * 0.01 * (preset[i][1] - preset[i][0]) + preset[i][0]);
		}

	// If we are in autonomous mode, but there are no movements queued, generate new movements
	} else if (autoMode && (queue.size() < SERVOS+1) && (animeTimer <= millis())) {

		// For each of the servos
		for (int i = 0; i < SERVOS; i++) {

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
// 		MANAGE THE MOVEMENT OF THE SERVO MOTORS
// -------------------------------------------------------------------
void manageServos(float dt) {
	// SERVO MOTORS
	// -  -  -  -  -  -  -  -  -  -  -  -  -
	bool moving = false;
	for (int i = 0; i < SERVOS; i++) {

		float posError = setpos[i] - curpos[i];

		// If position error is above the threshold
		if (abs(posError) > THRESHOLD && (setpos[i] != -1)) {

			digitalWrite(SR_OE, LOW);
			moving = true;

			// Determine motion direction
			bool dir = true;
			if (posError < 0) dir = false;

			// Determine whether to accelerate or decelerate
			float acceleration = accell[i];
			if ((0.5 * curvel[i] * curvel[i] / accell[i]) > abs(posError)) acceleration = -accell[i];

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
	// This prevents the motors from overheating
	if (moving) motorTimer = millis() + MOTOR_OFF;
	else if (millis() > motorTimer) digitalWrite(SR_OE, HIGH);
}


// -------------------------------------------------------------------
// 		MANAGE THE MOVEMENT OF THE MAIN MOTORS
// -------------------------------------------------------------------
void manageMotors(float dt) {
	// Update Main Motor Values
	setpos[SERVOS] = moveVal - turnVal - turnOff;
	setpos[SERVOS+1] = moveVal + turnVal + turnOff;

	// MAIN DRIVING MOTORS
	// -  -  -  -  -  -  -  -  -  -  -  -  -
	for (int i = SERVOS; i < SERVOS + 2; i++) {

		float velError = setpos[i] - curvel[i];

		// If velocity error is above the threshold
		if (abs(velError) > THRESHOLD && (setpos[i] != -1)) {

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
		
		// Limit Velocity
		if (curvel[i] > maxvel[i]) curvel[i] = maxvel[i];
		if (curvel[i] < -maxvel[i]) curvel[i] = -maxvel[i];
	}

	// Update motor speeds
	motorL.setSpeed(curvel[SERVOS]);
	motorR.setSpeed(curvel[SERVOS+1]);
}


// -------------------------------------------------------------------
// 		BATTERY LEVEL DETECTION
// -------------------------------------------------------------------
#ifdef BAT_L
void checkBatteryLevel() {

	// Read the analogue pin and calculate battery voltage
	float voltage = analogRead(BAT_L) * 5 / 1024.0;
	voltage = voltage / POT_DIV;
	int percentage = int(100 * (voltage - BAT_MIN) / float(BAT_MAX - BAT_MIN));

	// Send the percentage via serial
	Serial.print("Battery_"); Serial.println(percentage);
}
#endif


// -------------------------------------------------------------------
// 		MAIN PROGRAM LOOP
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
	if (updateTimer < millis()) {
		updateTimer = millis() + FREQUENCY;

		unsigned long newTime = micros();
		float dt = (newTime - lastTime) / 1000.0;
		lastTime = newTime;

		manageServos(dt);
		manageMotors(dt);
	}


	// Update robot status
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	if (statusTimer < millis()) {
		statusTimer = millis() + STATUS_TIME;

		#ifdef BAT_L
			checkBatteryLevel();
		#endif
	}
}
