/* WALL-E CONTROLLER CODE
 ********************************************
 * Code by: Simon Bluett
 * Email:   hello@chillibasket.com
 * Version: 2.3
 * Date:    3rd September 2019
 ********************************************/

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


// Define other constants
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define FREQUENCY 10       // Time in milliseconds of how often to update servo and motor positions
#define SERVOS 7           // Number of servo motors
#define THRESHOLD 1        // The minimum error which the dynamics controller tries to achieve
#define MOTOR_OFF 6000 	   // Turn servo motors off after 6 seconds
#define MAX_SERIAL 5       // Maximum number of characters that can be received


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
bool autoMode = false;
unsigned long updateTimer = 0;


// Serial Parsing
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
char firstChar;
char serialBuffer[MAX_SERIAL];
uint8_t serialLength = 0;


// Servo Positions:  Low, Mid, High
int preset[][3] =  {{398, 262, 112}, 	// head rotation
                    {565, 340, 188},	// neck top
                    {470, 250, 100},	// neck bottom
                    {475, 390, 230},	// eye right
                    {270, 370, 440},	// eye left
                    {350, 250, 185},	// arm left
                    {188, 290, 360}};	// arm right


// Servo Control - Position, Velocity, Acceleration
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo Pins:	     0,   1,   2,   3,   4,   5,   6,   -,   -
// Joint Name:	  head,necT,necB,eyeR,eyeL,armL,armR,motL,motR
float curpos[] = { 248, 560,  -1, 475, 270, 250, 290, 180, 180};  // Current position (deg)
float setpos[] = { 248, 560,  -1, 475, 270, 250, 290,   0,   0};  // Required position (deg)
float curvel[] = {   0,   0,   0,   0,   0,   0,   0,   0,   0};  // Current velocity (deg/sec)
float maxvel[] = { 500, 750, 255,2400,2400, 500, 500, 255, 255};  // Max Servo velocity (deg/sec)
float accell[] = { 350, 480, 150,1800,1800, 300, 300, 800, 800};  // Servo acceleration (deg/sec^2)


// Animation Presets
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define SOFT_LEN 7
// Starting Sequence:        time,head,necT,necB,eyeR,eyeL,armL,armR
int softSeq[][SERVOS+1] =  {{ 200, 262, 560,  -1, 470, 275, 250, 290},
                            { 200, 262, 565,  -1, 470, 275, 250, 290},
                            { 200, 262, 565,  -1, 475, 275, 250, 290},
                            { 200, 262, 565,  -1, 475, 270, 250, 290},
                            { 200, 262, 565,  -1, 475, 270, 245, 290},
                            { 200, 262, 565,  -1, 475, 270, 245, 295},
                            { 200, 262, 565,  -1, 475, 270, 250, 290}};

#define BOOT_LEN 9
// Bootup Eye Sequence:      time,head,necT,necB,eyeR,eyeL,armL,armR
int bootSeq[][SERVOS+1] =  {{2000, 262, 340,  -1, 390, 370, 250, 290},
                            { 700, 262, 340,  -1, 390, 270, 250, 290},
                            { 700, 262, 340,  -1, 475, 270, 250, 290},
                            { 700, 262, 340,  -1, 475, 370, 250, 290},
                            { 700, 262, 340,  -1, 390, 370, 250, 290},
                            { 400, 262, 340,  -1, 475, 270, 250, 290},
                            { 400, 262, 340,  -1, 390, 370, 250, 290},
                            {2000, 262, 565,  -1, 390, 370, 250, 290},
                            {1000, 262, 565,  -1, 475, 270, 250, 290}};

#define INQU_LEN 9
// Inquisitive Movements:    time,head,necT,necB,eyeR,eyeL,armL,armR
int inquSeq[][SERVOS+1] =  {{3000, 262, 340,  -1, 390, 370, 250, 290},
                            {1500, 262, 340,  -1, 230, 270, 185, 360},
                            {3000, 398, 188,  -1, 230, 270, 185, 360},
                            {1500, 262, 188,  -1, 390, 370, 185, 360},
                            {1500, 262, 340,  -1, 390, 370, 350, 188},
                            {1500, 300, 400,  -1, 440, 440, 350, 188},
                            {1500, 262, 340,  -1, 380, 370, 250, 290},
                            {3000, 112, 340,  -1, 380, 370, 250, 360},
                            {1500, 262, 565,  -1, 475, 270, 350, 188}};

void queueAnimation(int seq[][SERVOS+1], int len);

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
void queueAnimation(int seq[][SERVOS+1], int len) {
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
	if      (firstChar == 'X' && number >= -100 && number <= 100) turnVal = int(number * 2.55);
	else if (firstChar == 'Y' && number >= -100 && number <= 100) moveVal = int(number * 2.55);
	else if (firstChar == 'S' && number >=  100 && number <= 100) turnOff = number;
	else if (firstChar == 'O' && number >=    0 && number <= 250) curpos[7] = curpos[8] = int(number);

	// Animations
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'A' && number == 0) queueAnimation(softSeq, SOFT_LEN);
	else if (firstChar == 'A' && number == 1) queueAnimation(bootSeq, BOOT_LEN);
	else if (firstChar == 'A' && number == 2) queueAnimation(inquSeq, INQU_LEN);

	// Autonomous mode
	else if (firstChar == 'M' && number == 0) autoMode = false;
	else if (firstChar == 'M' && number == 1) autoMode = true;

	// Manual Movements with WASD
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'w') {		// Forward movement
		moveVal = pwmspeed;
		turnVal = 0;
		setpos[0] = preset[0][1];
	}
	else if (firstChar == 'q') {		// Stop movement
		moveVal = 0;
		turnVal = 0;
		setpos[0] = preset[0][1];
	}
	else if (firstChar == 's') {		// Backward movement
		moveVal = -pwmspeed;
		turnVal = 0;
		setpos[0] = preset[0][1];
	}
	else if (firstChar == 'a') {		// Drive & look left
		moveVal = 0;
		turnVal = -pwmspeed;
		setpos[0] = preset[0][0];
	}
	else if (firstChar == 'd') {   		// Drive & look right
		moveVal = 0;
		turnVal = pwmspeed;
		setpos[0] = preset[0][2];
	}

	// Manual Eye Movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'j') {		// Left head tilt
		setpos[4] = preset[4][0];
		setpos[3] = preset[3][2];
	}
	else if (firstChar == 'l') {		// Right head tilt
		setpos[4] = preset[4][2];
		setpos[3] = preset[3][0];
	}
	else if (firstChar == 'i') {		// Sad head
		setpos[4] = preset[4][0];
		setpos[3] = preset[3][0];
	}
	else if (firstChar == 'k') {		// Neutral head
		setpos[4] = preset[4][1];
		setpos[3] = preset[3][1];
	}

	// Head movement
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'f') {		// Head up
		setpos[1] = preset[1][0];  
	}
	else if (firstChar == 'g') {		// Head forward
		setpos[1] = preset[1][1];
	}
	else if (firstChar == 'h') {		// Head down
		setpos[1] = preset[1][2];
	}
	
	// Arm Movements
	// -- -- -- -- -- -- -- -- -- -- -- -- -- --
	else if (firstChar == 'b') {		// Left arm low, right arm high
		setpos[5] = preset[5][0];
		setpos[6] = preset[6][2];
	}
	else if (firstChar == 'n') {		// Both arms neutral
		setpos[5] = preset[5][1];
		setpos[6] = preset[6][1];
	}
	else if (firstChar == 'm') {		// Left arm high, right arm low
		setpos[5] = preset[5][2];
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
			setpos[i] = queue.pop();
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
					unsigned int max = preset[i][2];
					if (min > max) {
						min = max;
						max = preset[i][0];
					}
					
					setpos[i] = random(min, max+1);

				// Since the eyes should work together, only look at one of them
				} else if (i == 3) {

					// Determine which type of eye movement to do
					// Both eye move downwards
					if (random(2) == 1) {
						setpos[i] = random(preset[i][1], preset[i][0]);
						float multiplier = (setpos[i] - preset[i][1]) / float(preset[i][0] - preset[i][1]);
						setpos[i+1] = ((1 - multiplier) * (preset[i+1][1] - preset[i+1][0])) + preset[i+1][0];

					// Both eyes move in opposite directions
					} else {
						setpos[i] = random(preset[i][1], preset[i][0]);
						float multiplier = (setpos[i] - preset[i][2]) / float(preset[i][0] - preset[i][2]);
						setpos[i+1] = (multiplier * (preset[i+1][2] - preset[i+1][0])) + preset[i+1][0];
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
	setpos[7] = moveVal - turnVal - turnOff;
	setpos[8] = moveVal + turnVal + turnOff;

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
}
