/* * * * * * * * * * * * * * * * * * * * * * *
 * SETUP TIMERS FOR ATMEGA 328
 * (Arduino Uno)
 *
 * Note: 	Use with caution - it may affect other systems:
 * 			Timer0 is used by delay(), millis(), micros()
 * 			Timer1 is used by the servo library
 * 			Timer2 is used by tone(), notone()
 *
 * Timer0 and Timer2 are 8bit clocks
 * Timer1 is 16bit
 * * * * * * * * * * * * * * * * * * * * * * */

#ifndef SETUP_TIMERS_H
#define SETUP_TIMERS_H

#include <Arduino.h>

/*********************************************
 * These are the functions called by the timer interrupts
 * Uncomment and copy them as required
 *********************************************/
/*
// Timer 0 Interrupt Service Routine
ISR(TIMER0_COMPA_vect) {
	// Your code goes here
}
*/

/*
// Timer 1 Interrupt Service Routine
ISR(TIMER1_COMPA_vect) {
	// Your code goes here
}
*/

/*
// Timer 2 Interrupt Service Routine
ISR(TIMER2_COMPA_vect) {
	// Your code goes here
}
*/


/*********************************************
 * Determine Prescale and Clockmatch Values
 *********************************************/
void determinePrescaler(uint16_t frequency, bool max16bit, uint16_t &prescale, uint16_t &clockmatch) {

	// Figure out what prescaler and match reference to use
	int prescaleValues[] = {1, 8, 64, 256, 1024};

	prescale = 0;
	clockmatch = 0;

	// Iterate through each prescaler to see if it would be suitable
	for(int i = 0; i < 5; i++) {
		prescale = prescaleValues[i];
		uint32_t value = (uint32_t) ((16000000 / float(prescale * frequency)) - 1);
		
		if (value > 0 && ((max16bit && value < 65536) || (!max16bit && value < 256))) {
			clockmatch = value;
			break;
		}
	}

	// If no suitable scale value was found, output an error and halt the program
	if (clockmatch == 0) {
		Serial.println("ERROR: Unable to set up timer at the provided frequency!");
		sei();
		while(1) {}
	} else {
		Serial.print("Prescale: "); Serial.print(prescale);
		Serial.print(", Clock Match: "); Serial.println(clockmatch);
	}
}


/*********************************************
 * SETUP TIMER 0 (8 bit)
 *********************************************/
void setupTimer0(uint16_t frequency) {

	// Disable interrupts
	cli();

	// Reset timer0 to blank condition
	TCCR0A = 0;
	TCCR0B = 0;

	// Initialize the counter from 0
	TCNT0 = 0;

	// Determine the prescale and clockmatch values for the required frequency
	uint16_t prescale;
	uint16_t clockmatch;
	determinePrescaler(frequency, false, prescale, clockmatch);

	// Sets the counter compare value
	OCR0A = clockmatch;

	// Enable the CTC mode
	TCCR0B |= (1 << WGM01);

	// Sets the control scale bits for the timer
	if (prescale == 1) TCCR0B |= (1 << CS00);
	else if (prescale == 8) TCCR0B |= (1 << CS01);
	else if (prescale == 64) TCCR0B |= (1 << CS00) | (1 << CS01);
	else if (prescale == 256) TCCR0B |= (1 << CS02);
	else if (prescale == 1024) TCCR0B |= (1 << CS02) | (1 << CS00);

	// Enable the timer compare interrupt
	TIMSK0 |= (1 << OCIE0A);

	// Allows interrupts		
	sei();
}


/*********************************************
 * SETUP TIMER 1 (16 bit)
 *********************************************/
void setupTimer1(uint16_t frequency) {

	// Disable interrupts
	cli();

	// Reset timer0 to blank condition
	TCCR1A = 0;
	TCCR1B = 0;

	// Initialize the counter from 0
	TCNT1 = 0;

	// Determine the prescale and clockmatch values for the required frequency
	uint16_t prescale;
	uint16_t clockmatch;
	determinePrescaler(frequency, true, prescale, clockmatch);

	// Sets the counter compare value
	OCR1A = clockmatch;

	// Enable the CTC mode
	TCCR1B |= (1 << WGM12);

	// Sets the control scale bits for the timer
	if (prescale == 1) TCCR1B |= (1 << CS10);
	else if (prescale == 8) TCCR1B |= (1 << CS11);
	else if (prescale == 64) TCCR1B |= (1 << CS10) | (1 << CS11);
	else if (prescale == 256) TCCR1B |= (1 << CS12);
	else if (prescale == 1024) TCCR1B |= (1 << CS12) | (1 << CS10);

	// Enable the timer compare interrupt
	TIFR1  |= _BV(OCF1A);   // clear timer compare flag
	TIMSK1 |= (1 << OCIE1A);

	// Allows interrupts		
	sei();
}


/*********************************************
 * SETUP TIMER 2 (8 bit)
 *********************************************/
void setupTimer2(uint16_t frequency) {

	// Disable interrupts
	cli();

	// Reset timer0 to blank condition
	TCCR2A = 0;
	TCCR2B = 0;

	// Initialize the counter from 0
	TCNT2 = 0;

	// Determine the prescale and clockmatch values for the required frequency
	uint16_t prescale;
	uint16_t clockmatch;
	determinePrescaler(frequency, false, prescale, clockmatch);

	// Sets the counter compare value
	OCR2A = clockmatch;

	// Enable the CTC mode
	TCCR2B |= (1 << WGM21);

	// Sets the control scale bits for the timer
	if (prescale == 1) TCCR2B |= (1 << CS20);
	else if (prescale == 8) TCCR2B |= (1 << CS21);
	else if (prescale == 64) TCCR2B |= (1 << CS20) | (1 << CS21);
	else if (prescale == 256) TCCR2B |= (1 << CS22);
	else if (prescale == 1024) TCCR2B |= (1 << CS22) | (1 << CS20);

	// Enable the timer compare interrupt
	TIMSK2 |= (1 << OCIE2A);

	// Allows interrupts		
	sei();
}


#endif //SETUP_TIMERS_H