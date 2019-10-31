/* WALL-E CALLIBRATION CODE
 ********************************************
 * Code by: Simon Bluett
 * Email:   hello@chillibasket.com
 * Version: 1.0
 * Date:    30th October 2019
 ********************************************/

/* HOW TO USE:
 * 1. Install the Adafruit_PWMServoDriver library
 *    a. In the Arduino IDE, go to Sketch->Include Library->Manage Libraries
 *    b. Search for Adafruit PWM Library, and install the latest version
 * 2. Upload the sketch to the micro-controller, and open serial monitor at 
 *    a baud rate of 115200.
 * 3. The sketch will then let you control each servo motor individually. The
 *    aim is to find the maximum and minimum PWM pulse widths, corresponding 
 *    to the LOW and HIGH positions to which each servo motors can move. 
 *    Diagrams showing these positions can be found at 
 *    https://wired.chillibasket.com/3d-printed-wall-e/
 *    a. The sketch starts with the head rotation servo (which is on pin 0). 
 *       First you need to move to the LOW position (head turned to the left),
 *       by sending the 'a' or 'd' characters to move the servo in increments
 *       of 10 pulse width. For finer control, send the 'z' and 'c' characters 
 *       to move in increments of 1.
 *    b. Once the head is in the LOW position, send the 'n' character to confirm
 *       the position and move on to the HIGH position. Repeat the process.
 *    d. The process will then repeat itself for each of the 7 servos, getting
 *       you to specify the LOW and HIGH positions.
 * 4. Once the process is complete, the calibrated positions will be output to
 *    the serial monitor; for example:
 *
 *    // Servo Positions:  Low,High
 *    int preset[][2] =  {{398, 112},  // head rotation
 *                        {565, 188},  // neck top
 *                        {470, 100},  // neck bottom
 *                        {475, 230},  // eye right
 *                        {270, 440},  // eye left
 *                        {350, 185},  // arm left
 *                        {188, 360}}; // arm right
 *
 *    Copy the array and paste it into lines 85 to 92 in [wall-e.ino]
 */

#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>


// Define the pin-mapping
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define SR_OE 10           // Servo shield output enable pin


// Define other constants
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
#define SERVOS 7           // Number of servo motors


// Instantiate objects
// -- -- -- -- -- -- -- -- -- -- -- -- -- --
// Servo shield controller class
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();


// Servo Positions:  Low,High
int preset[][2] =  {{398, 112},  // head rotation
                    {565, 188},	 // neck top
                    {200, 400},	 // neck bottom
                    {475, 230},	 // eye right
                    {270, 440},	 // eye left
                    {350, 185},	 // arm left
                    {188, 360}}; // arm right

// Rest position
float restpos[7] = {50, 50, 40, 0, 0, 100, 100};

// Messages
String messages1[7] = {"Head Rotation - ","Neck Top Joint - ","Neck Bottom Joint - ","Eye Left - ","Eye Right - ","Arm Left - ","Arm Right - "};
String messages2[][2] = {{"LOW (head facing left)", "HIGH (head facing right)"},
                        {"LOW (head looking down)", "HIGH (head looking up)"},
                        {"LOW (head looking down)", "HIGH (head looking up)"},
                        {"LOW (eye rotated down)", "HIGH (eye rotated up)"},
                        {"LOW (eye rotated down)", "HIGH (eye rotated up)"},
                        {"LOW (arm rotated down)", "HIGH (arm rotated up)"},
                        {"LOW (arm rotated down)", "HIGH (arm rotated up)"}};

// Runtime Variables
int currentServo = 0;
int currentPosition = -1;
int position = preset[0][1];


// ------------------------------------------------------------------
// 		INITIAL SETUP
// ------------------------------------------------------------------
void setup() {

	// Initialize serial communication for debugging
	Serial.begin(115200);
	delay(1000);

	//while(!Serial);
	Serial.println("Starting Wall-E Calibration Program");
	Serial.println("------------------------------------------------------------------");
	Serial.println("Move the servos to the correct positions using the serial commands\n");

	// Output Enable (EO) pin for the servo motors
	pinMode(SR_OE, OUTPUT);
	digitalWrite(SR_OE, HIGH);

	// Communicate with servo shield (Analog servos run at ~60Hz)
	pwm.begin();
	pwm.setPWMFreq(60);

	moveToNextPosition();
}


// -------------------------------------------------------------------
// 		MOVE TO NEXT POSITION OR SERVO
// -------------------------------------------------------------------
void moveToNextPosition() {

	if (currentPosition != -1) {
		// Save the current position
		preset[currentServo][currentPosition] = position;
		Serial.print("[Confirmed Position: "); Serial.print(position); Serial.println("]\n");
	}

	// Move on to the next position
	if (currentPosition < 1) {
		currentPosition++;

	// Else move servo to middle position and go to the next servo
	} else {
		pwm.setPWM(currentServo, 0, int(restpos[currentServo] / 100.0 * (preset[currentServo][1] - preset[currentServo][0]) + preset[currentServo][0]));
		currentServo++;
		currentPosition = 0;

		// If all servos are calibrated, output the results
		if (currentServo == SERVOS) outputResults();
	}

	// Output message to serial monitor
	Serial.print(messages1[currentServo]);
	Serial.println(messages2[currentServo][currentPosition]);
	Serial.println("-----------------------------------");
	Serial.println("Commands: 'a'=-10deg, 'd'=+10deg, 'z'=-1deg, 'c'=+1deg, 'n'=confirm position");

	// Disable and re-enable the servos
	digitalWrite(SR_OE, HIGH);
	delay(500);
	digitalWrite(SR_OE, LOW);

	// Move the current servo to the proper position
	position = preset[currentServo][currentPosition];
	pwm.setPWM(currentServo, 0, position);
}


// -------------------------------------------------------------------
// 		CHANGE SERVO POSITION
// -------------------------------------------------------------------
void changeServoPosition(int difference) {
	position += difference;
	pwm.setPWM(currentServo, 0, position);
}


// -------------------------------------------------------------------
// 		OUTPUT THE RESULTS
// -------------------------------------------------------------------
void outputResults() {
	Serial.println("Calibrated values - please copy and paste these into the 'wall-e.ino' sketch:\n");
	Serial.print("int preset[][2] =  {{"); Serial.print(preset[0][0]); Serial.print(","); Serial.print(preset[0][1]); Serial.println("},  // head rotation");
	Serial.print("                    {"); Serial.print(preset[1][0]); Serial.print(","); Serial.print(preset[1][1]); Serial.println("},  // neck top");
	Serial.print("                    {"); Serial.print(preset[2][0]); Serial.print(","); Serial.print(preset[2][1]); Serial.println("},  // neck bottom");
	Serial.print("                    {"); Serial.print(preset[3][0]); Serial.print(","); Serial.print(preset[3][1]); Serial.println("},  // eye right");
	Serial.print("                    {"); Serial.print(preset[4][0]); Serial.print(","); Serial.print(preset[4][1]); Serial.println("},  // eye left");
	Serial.print("                    {"); Serial.print(preset[5][0]); Serial.print(","); Serial.print(preset[5][1]); Serial.println("},  // arm left");
	Serial.print("                    {"); Serial.print(preset[6][0]); Serial.print(","); Serial.print(preset[6][1]); Serial.println("}}; // arm right");

	// Stop the program
	while(1){}
}


// -------------------------------------------------------------------
// 		READ INPUT FROM SERIAL
// -------------------------------------------------------------------
void readSerial() {
	// Read incoming byte
	char inchar = Serial.read();

	// Move on to next position or servo
	if (inchar == 'n') {
		moveToNextPosition();

	// Decrease servo position by 10 degrees
	} else if (inchar == 'a') {
		changeServoPosition(-10);

	// Increase servo position by 10 degrees
	} else if (inchar == 'd') {
		changeServoPosition(10);

	// Decrease servo position by 1 degree
	} else if (inchar == 'z') {
		changeServoPosition(-1);

	// Increase servo position by 1 degree
	} else if (inchar == 'c') {
		changeServoPosition(1);
	}
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
}
