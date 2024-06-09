/**
 * oLED Display
 *
 * @file      display.ino
 * @brief     Draw battery level on the oLED display
 * @author    Hans Vandamme
 * @copyright MIT license
 * @version   1.0
 *
 * Code to draw the battery level indicator onto an oLED
 * display. For instructions of how to wire up the display,
 * see the README file included in this repository.
 */

#ifdef OLED

/**
 * Draw battery level on the display
 * 
 * @param  batlevel The current battery percentage
 */
void displayLevel(int batlevel) {

	u8g2.firstPage();
	do {
		u8g2.setDrawColor(1);
		drawSun();

		// Scale to 50% as the battery should not drop bellow that anyway
		drawBatt10();
		if (batlevel > 55) drawBatt20();
		if (batlevel > 60) drawBatt30();
		if (batlevel > 65) drawBatt40();
		if (batlevel > 70) drawBatt50();
		if (batlevel > 75) drawBatt60();
		if (batlevel > 80) drawBatt70();
		if (batlevel > 85) drawBatt80();
		if (batlevel > 90) drawBatt90();
		if (batlevel > 95) drawBatt100();
	} while ( u8g2.nextPage() );
 
}


/**
 * Functions to draw each of the battery level bars
 */
void drawBatt10() {
	u8g2.drawBox(108,0,16,40);
}

void drawBatt20() {
	u8g2.drawBox(96,0,7,40);
}

void drawBatt30() {
	u8g2.drawBox(84,0,7,40);
}

void drawBatt40() {
	u8g2.drawBox(72,0,7,40);
}

void drawBatt50() {
	u8g2.drawBox(60,0,7,40);
}

void drawBatt60() {
	u8g2.drawBox(48,0,7,40);
}

void drawBatt70() {
	u8g2.drawBox(36,0,7,40);
}

void drawBatt80() {
	u8g2.drawBox(24,0,7,40);
}

void drawBatt90() {
	u8g2.drawBox(12,0,7,40);
}

void drawBatt100() {
	u8g2.drawBox(0,0,7,40);
}


/**
 * Draw the sun icon on the display
 */
void drawSun() {
	u8g2.drawDisc(20, 55, 3);
	u8g2.drawLine(20,50,20,46);
	u8g2.drawLine(20,60,20,64);
	u8g2.drawLine(15,55,11,55);
	u8g2.drawLine(25,55,29,55);
	u8g2.drawLine(22,54,25,47);
	u8g2.drawLine(25,53,29,50);   
	u8g2.drawLine(16,53,12,50);
	u8g2.drawLine(18,51,16,47);
	u8g2.drawLine(16,58,12,60);
	u8g2.drawLine(18,60,16,63);
	u8g2.drawLine(25,58,29,60);
	u8g2.drawLine(22,60,25,63);
}

#endif /* OLED */
