/* * * * * * * * * * * * * * * * * * * * * * *
 * MOTOR CONTROLLER CLASS
 * For the Arduino Motor Shield Rev.2
 *
 * Code by:  Simon Bluett
 * Email:    hello@chillibasket.com
 * Version:  1.1
 * Date:     20th June 2020
 * Copyright (C) 2020, MIT License
 * * * * * * * * * * * * * * * * * * * * * * */

#ifndef MOTOR_CONTROLLER_HPP
#define MOTOR_CONTROLLER_HPP

// MOTOR CONTROLLER CLASS
class MotorController {
public:
	// Constructor
	MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin, bool _brkEnabled = true);
	
	// Functions
	void setSpeed(int pwmValue);

	// Default destructor
	~MotorController();

private:
	uint8_t dirPin, pwmPin, brkPin;
	bool reverse, brake, brakeEnabled;
};


/**
 * Default Constructor
 * 
 * @param  (_dirPin) Digital pin used for motor direction
 * @param  (_pwmPin) Digiral pin for PWM motor speed control
 * @param  (_brkPin) Digital pin to enable/disable the breaks
 * @param  (_brkEnabled) Should the break be used?
 */
MotorController::MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin, bool _brkEnabled) {
	dirPin = _dirPin;
	pwmPin = _pwmPin;
	brkPin = _brkPin;
	brakeEnabled = _brkEnabled;

	pinMode(dirPin, OUTPUT);     // Motor Direction
	pinMode(brkPin, OUTPUT);     // Motor Brake
	digitalWrite(dirPin, HIGH);

	reverse = false;
	if (brakeEnabled) {
		digitalWrite(brkPin, HIGH);
		brake = true;
	} else {
		digitalWrite(brkPin, LOW);
		brake = false;
	}
}


/**
 * Default Destructor
 */
MotorController::~MotorController() {
	// Empty
}


/**
 * Set a new motor speed
 * 
 * @param  (pwmValue) The PWM value of the new speed
 * @note   Negative PWM values will cause the motor to move in reverse
 * @note   A PWM value of 0 will enable the breaks
 */
void MotorController::setSpeed(int pwmValue) {

	// Bound the PWM value to +-255
	if (pwmValue > 255) pwmValue = 255;
	else if (pwmValue < -255) pwmValue = -255;
	
	// Forward direction
	if (pwmValue > 0 && reverse) {
		digitalWrite(dirPin, HIGH);
		reverse = false;

		// Release the brake
		if (brake) {
			digitalWrite(brkPin, LOW);
			brake = false;
		}

	// Reverse direction
	} else if (pwmValue < 0 && !reverse) {
		digitalWrite(dirPin, LOW);
		reverse = true;

		// Release the brake
		if (brake) {
			digitalWrite(brkPin, LOW);
			brake = false;
		}

	// If there is no movement, engage the brake
	} else if (brakeEnabled && !brake) {
		digitalWrite(brkPin, HIGH);
		brake = true;
	}
	
	// Send PWM value
	analogWrite(pwmPin, abs(pwmValue));
}


#endif /* MOTOR_CONTROLLER_HPP */