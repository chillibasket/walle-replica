/* * * * * * * * * * * * * * * * * * * * * * *
 * MOTOR CONTROLLER CLASS
 *
 * Code by: Simon B.
 * Email: 	hello@chillibasket.com
 * Version: 1
 * Date: 	20/4/19
 * * * * * * * * * * * * * * * * * * * * * * */

#ifndef MOTOR_CONTROLLER_HPP
#define MOTOR_CONTROLLER_HPP

// MOTOR CONTROLLER CLASS
class MotorController {
public:
	// Constructor
	MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin, bool _brkEnabled);
	MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin);
	
	// Functions
	void setSpeed(int pwmValue);

	// Default destructor
	~MotorController();

private:
	uint8_t dirPin, pwmPin, brkPin;
	bool reverse, brake, brakeEnabled;
};


/*
 * \Func 	MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin)
 * \Desc 	Default constructor
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

MotorController::MotorController(uint8_t _dirPin, uint8_t _pwmPin, uint8_t _brkPin) {
	MotorController(_dirPin, _pwmPin, _brkPin, true);
}


/*
 * \Func 	~MotorController()
 * \Desc 	Default destructor
 */
MotorController::~MotorController() {

}


/*
 * \Func 	void setSpeed(uint8_t pwmValue)
 * \Desc 	Update the speed of the motor
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


#endif // MOTOR_CONTROLLER_HPP