/* 
 * Robot Webinterface - Main Script
 * Simon B., https://wired.chillibasket.com
 * V1.4, 16th February 2020
 */


// Control speed at which gamepad
// can move the arms and head
var armsMultiplier = 6;
var headMultiplier = 5;

// Runtime variables to manage the gamepad
var moveXY = [0,0,0,0];
var moveYP = [0,0,0,0];
var moveArms = [0,50,0,50];
var moveHead = [50,50];
var gamepadTimer;
var gamePadActive = 0;
var jsJoystick;

// Timer to periodically check if Arduino has sent a message
var arduinoTimer;


/*
 * Update Web-Interface Settings
 */
function sendSettings(type, value) {
	
	// If shutdown is requested, show a confirmation prompt
	if (type=="shutdown") {
		if (!confirm("Are you sure you want to shutdown?")) {
			return 0;
		}
	}
	
	//alert(type + ", " + value);
	// Send data to python app, so that it can be passed on
	$.ajax({
		url: "/settings",
		type: "POST",
		data: {"type" : type, "value": value},
		dataType: "json",
		success: function(data){
			// If a response is received from the python backend, but it contains an error
			if(data.status == "Error"){
				showAlert(1, 'Error!', data.msg, 1);
				return 0;
			
			// Else if response is all good
			} else {
				showAlert(0, 'Success!', 'Settings have been updated.', 1);
				
				// If setting related to the camera stream, show/hide the video stream
				if(typeof data.streamer !== "undefined"){
						if(data.streamer == "Active"){
							$('#conn-streamer').html('End Stream');
							$('#conn-streamer').removeClass('btn-outline-info');
							$('#conn-streamer').addClass('btn-outline-danger');
							$("#stream").attr("src","http:/" + "/" + window.location.hostname + ":8081/?action=stream");
						} else if(data.streamer == "Offline"){
							$('#conn-streamer').html('Reactivate');
							$('#conn-streamer').addClass('btn-outline-info');
							$('#conn-streamer').removeClass('btn-outline-danger');
							$("#stream").attr("src","/static/streamimage.jpg");
						}
				}
				return 1;
			}
		},
		error: function(error) {
			// If no response was recevied from the python backend, show an "unknown" error
			if (type == "shutdown") {
				showAlert(0, 'Raspberry Pi is now shutting down!', 'The WALL-E web-interface is no longer active.', 1);
			} else {
				showAlert(1, 'Unknown Error!', 'Unable to update settings.', 1);
			}
			return 0;
		}
	});
}


/*
 * Update Arduino Connection
 */
function arduinoConnect(item) {
	
	// Only run this if the button is not disabled
	if (!item.classList.contains('disabled')) {
		$.ajax({
			url: "/arduinoConnect",
			type: "POST",
			data: {"action" : "reconnect", "port": $('#port-select option:selected').val()},
			dataType: "json",
			success: function(data){
				// If a response is received from the python backend, but it contains an error
				if(data.status == "Error"){
					updateSerialList(false);
					showAlert(1, 'Error!', data.msg, 1);
					$('#conn-arduino').html('Reconnect');
					$('#conn-arduino').addClass('btn-outline-info');
					$('#conn-arduino').removeClass('btn-outline-danger');
					$('#ardu-area').attr('data-original-title','Disconnected');
					$('#ardu-area').addClass('bg-danger');
					$('#ardu-area').removeClass('bg-success');
					clearInterval(arduinoTimer);
					return 0;
				
				// Else if response is all good
				} else {
					
					console.log("Arduino connection update: " + data.arduino);
					
					// If the setting related to Arduino connection, update the button						
					if(data.arduino == "Connected"){
						$('#conn-arduino').html('Disconnect');
						$('#conn-arduino').removeClass('btn-outline-info');
						$('#conn-arduino').addClass('btn-outline-danger');
						$('#ardu-area').attr('data-original-title','Connected');
						$('#ardu-area').removeClass('bg-danger');
						$('#ardu-area').addClass('bg-success');
						showAlert(0, 'Success!', 'Arduino now connected.', 1);
						arduinoTimer = setInterval(checkArduinoStatus, 10000);
						checkArduinoStatus();
					} else if(data.arduino == "Disconnected"){
						$('#conn-arduino').html('Reconnect');
						$('#conn-arduino').addClass('btn-outline-info');
						$('#conn-arduino').removeClass('btn-outline-danger');
						$('#ardu-area').attr('data-original-title','Disconnected');
						$('#ardu-area').addClass('bg-danger');
						$('#ardu-area').removeClass('bg-success');
						$('#batt-area').addClass('d-none');
						showAlert(0, 'Success!', 'Arduino now disconnected.', 1);
						clearInterval(arduinoTimer);
					}
					return 1;
				}
			},
			error: function(error) {
				// If no response was recevied from the python backend, show an "unknown" error
				updateSerialList(false);
				showAlert(1, 'Unknown Error!', 'Unable to update connection settings.', 1);
				return 0;
			}
		});
	}
}


/*
 * Update list of serial ports
 */
function updateSerialList(alertActive) {
	
	$.ajax({
		url: "/arduinoConnect",
		type: "POST",
		data: {"action" : "updateList"},
		dataType: "json",
		success: function(data){
			// If a response is received from the python backend, but it contains an error
			if(data.status == "Error"){
				if (alertActive) showAlert(1, 'Error!', data.msg, 1);
				return 0;
			
			// Else if response is all good
			} else {
				if (alertActive) showAlert(0, 'Success!', 'Updated serial port list.', 1);
				
				var portList = data.ports;
				var listLength = portList.length;
				$('#port-select').empty();
				
				if (listLength > 0) {
					for (var i = 0; i < listLength; i++) {
						if (data.portSelect == i) {
							$('#port-select').append('<option value="' + i + '" selected>' + portList[i] + '</option>');
						} else {
							$('#port-select').append('<option value="' + i + '">' + portList[i] + '</option>');
						}
					}
					
					if ($('#conn-arduino').hasClass('disabled')) {
						$('#conn-arduino').removeClass('disabled');
						$('#conn-arduino').removeClass('btn-outline-secondary');
						$('#conn-arduino').addClass('btn-outline-info');
					}
				} else {
					if(data.arduino == "Disconnected"){
						$('#conn-arduino').addClass('disabled');
						$('#conn-arduino').addClass('btn-outline-secondary');
						$('#conn-arduino').removeClass('btn-outline-info');
					}
					$('#port-select').append('<option disabled selected>No devices found!</option>');
				}
				
				return 1;
			}
		},
		error: function(error) {
			// If no response was recevied from the python backend, show an "unknown" error
			if (alertActive) showAlert(1, 'Unknown Error!', 'Unable to update connection settings.', 1);
			return 0;
		}
	});
}


/*
 * Play a servo motor animation
 */
function anime(clip, time) {
	$.ajax({
		url: "/animate",
		type: "POST",
		data: {"clip": clip},
		dataType: "json",
		beforeSend: function(){
			// Reset the animation progress bar
			$('#anime-progress').stop();
			$('#anime-progress').css('width', '0%').attr('aria-valuenow', 0);
		},
		success: function(data){
			// If a response is received from the python backend, but it contains an error
			if(data.status == "Error"){
				$('#anime-progress').addClass('bg-danger');
				$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, 500);
				showAlert(1, 'Error!', data.msg, 1);
				return false;
				
			// Otherwise set the progress bar to show the animation progress
			} else {
				$('#anime-progress').removeClass('bg-danger');
				$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, time*1000);
				return true;
			}
		},
		error: function(error) {
			// If no response was recevied from the python backend, show an "unknown" error
			$('#anime-progress').addClass('bg-danger');
			$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, 500);
			showAlert(1, 'Unknown Error!', 'Unable to run the animation.', 1);
			return false;
		}
	});
}


/*
 * Play an audio clip
 */
function playAudio(clip, time) {
	$.ajax({
		url: "/audio",
		type: "POST",
		data: {"clip": clip},
		dataType: "json",
		beforeSend: function(){
			// Reset the audio progress bar
			$('#audio-progress').stop();
			$('#audio-progress').css('width', '0%').attr('aria-valuenow', 0);
		},
		success: function(data){
			// If a response is received from the python backend, but it contains an error
			if(data.status == "Error"){
				$('#audio-progress').addClass('bg-danger');
				$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, 500);
				showAlert(1, 'Error!', data.msg, 1);
				return false;
				
			// Otherwise set the progress bar to show the audio clip progress
			} else {
				$('#audio-progress').removeClass('bg-danger');
				$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, time*1000);
				return true;
			}
		},
		error: function(error) {
			// If no response was recevied from the python backend, show an "unknown" error
			$('#audio-progress').addClass('bg-danger');
			$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, 500);
			showAlert(1, 'Unknown Error!', 'Unable to play audio file.', 1);
			return false;
		}
	});
}


/*
 * Send a manual servo control command
 */
function servoControl(item, servo, value) {
	$.ajax({
		url: "/servoControl",
		type: "POST",
		data: {"servo": servo, "value": value},
		dataType: "json",
		success: function(data){
			// If a response is received from the python backend, but it contains an error
			if(data.status == "Error"){
				item.value = item.oldvalue;
				showAlert(1, 'Error!', data.msg, 0);
				return false;
				
			// Otherwise ensure that current value is correctly updated
			} else {
				item.value = value;
				item.oldvalue = value;
				return true;
			}
		},
		error: function(error) {
			// If no response was recevied from the python backend, show an "unknown" error
			showAlert(1, 'Unknown Error!', 'Unable to update servo position.', 1);
			return false;
		}
	});
}


/*
 * Send a preset servo control command
 */
function servoPresets(item, preset, servo) {
	
	// Only run this if the button is not disabled
	if (!item.classList.contains('disabled')) {
		$.ajax({
			url: "/servoControl",
			type: "POST",
			data: {"servo": servo, "value": 0},
			dataType: "json",
			success: function(data){
				// If a response is received from the python backend, but it contains an error
				if(data.status == "Error"){
					showAlert(1, 'Error!', data.msg, 1);
					return false;
				
				// Otherwise, update the manual servo control sliders to reflect the current position
				} else {
					if (preset == "head-up") {
						$('#neck-top').oldvalue = $('#neck-top').value;
						$('#neck-bottom').oldvalue = $('#neck-bottom').value;
						$('#neck-top').val(0);
						$('#neck-bottom').val(50);
					} else if (preset == "head-neutral") {
						$('#neck-top').oldvalue = $('#neck-top').value;
						$('#neck-bottom').oldvalue = $('#neck-bottom').value;
						$('#neck-top').val(100);
						$('#neck-bottom').val(0);
					} else if (preset == "head-down") {
						$('#neck-top').oldvalue = $('#neck-top').value;
						$('#neck-bottom').oldvalue = $('#neck-bottom').value;
						$('#neck-top').val(0);
						$('#neck-bottom').val(0);
					} else if (preset == "arms-left") {
						$('#arm-left').oldvalue = $('#arm-left').value;
						$('#arm-right').oldvalue = $('#arm-right').value;
						$('#arm-left').val(100);
						$('#arm-right').val(0);
					} else if (preset == "arms-neutral") {
						$('#arm-left').oldvalue = $('#arm-left').value;
						$('#arm-right').oldvalue = $('#arm-right').value;
						$('#arm-left').val(50);
						$('#arm-right').val(50);
					} else if (preset == "arms-right") {
						$('#arm-left').oldvalue = $('#arm-left').value;
						$('#arm-right').oldvalue = $('#arm-right').value;
						$('#arm-left').val(0);
						$('#arm-right').val(100);
					} else if (preset == "eyes-left") {
						$('#eye-left').oldvalue = $('#eye-left').value;
						$('#eye-right').oldvalue = $('#eye-right').value;
						$('#eye-left').val(0);
						$('#eye-right').val(100);
					} else if (preset == "eyes-neutral") {
						$('#eye-left').oldvalue = $('#eye-left').value;
						$('#eye-right').oldvalue = $('#eye-right').value;
						$('#eye-left').val(40);
						$('#eye-right').val(40);
					} else if (preset == "eyes-sad") {
						$('#eye-left').oldvalue = $('#eye-left').value;
						$('#eye-right').oldvalue = $('#eye-right').value;

						$('#eye-left').val(0);
						$('#eye-right').val(0);
					} else if (preset == "eyes-right") {
						$('#eye-left').oldvalue = $('#eye-left').value;
						$('#eye-right').oldvalue = $('#eye-right').value;
						$('#eye-left').val(100);
						$('#eye-right').val(0);
					}
					return true;
				}
			},
			error: function(error) {
				// If no response was recevied from the python backend, show an "unknown" error
				showAlert(1, 'Unknown Error!', 'Unable to update servo position.', 1);
				return false;
			}
		});
	}
}


/*
 * Enable/disable manual servo inputs depending on whether
 * the manual or automatic servo mode is selected
 */
function servoInputs(enabled) {
	if (enabled == 1) {
		$('#head-rotation').prop('disabled', false);
		$('#neck-top').prop('disabled', false);
		$('#neck-bottom').prop('disabled', false);
		$('#eye-left').prop('disabled', false);
		$('#eye-right').prop('disabled', false);
		$('#arm-left').prop('disabled', false);
		$('#arm-right').prop('disabled', false);
		$('#head-up').removeClass('disabled');
		$('#head-neutral').removeClass('disabled');
		$('#head-down').removeClass('disabled');
		$('#arms-left').removeClass('disabled');
		$('#arms-neutral').removeClass('disabled');
		$('#arms-right').removeClass('disabled');
		$('#eyes-sad').removeClass('disabled');
		$('#eyes-left').removeClass('disabled');
		$('#eyes-neutral').removeClass('disabled');
		$('#eyes-right').removeClass('disabled');
	} else {
		$('#head-rotation').prop('disabled',true);
		$('#neck-top').prop('disabled',true);
		$('#neck-bottom').prop('disabled',true);
		$('#eye-left').prop('disabled',true);
		$('#eye-right').prop('disabled',true);
		$('#arm-left').prop('disabled',true);
		$('#arm-right').prop('disabled',true);
		$('#head-up').addClass('disabled');
		$('#head-neutral').addClass('disabled');
		$('#head-down').addClass('disabled');
		$('#arms-left').addClass('disabled');
		$('#arms-neutral').addClass('disabled');
		$('#arms-right').addClass('disabled');
		$('#eyes-sad').addClass('disabled');
		$('#eyes-left').addClass('disabled');
		$('#eyes-neutral').addClass('disabled');
		$('#eyes-right').addClass('disabled');
	}
}


/*
 * This function checks if the Arduino has sent any messages to the 
 * Raspberry Pi; for example, the current battery level
 */
function checkArduinoStatus() {
	$.ajax({
		url: "/arduinoStatus",
		type: "POST",
		data: {"type": "battery"},
		dataType: "json",
		success: function(data){
			if(data.status != "Error"){
				var batteryLevel = parseInt(data.battery);
				if (batteryLevel != -999) {
					if (batteryLevel < 0) batteryLevel = 0;
					$('#batt-area').removeClass('d-none');
					$('#batt-text').html(batteryLevel + '%');
					if (batteryLevel > 65 && !$('#batt-icon').hasClass('fa-battery-full')) {
						$('#batt-icon').removeClass('fa-battery-quarter');
						$('#batt-icon').removeClass('fa-battery-half');
						$('#batt-icon').addClass('fa-battery-full');
						$('#batt-area').removeClass('bg-danger');
						$('#batt-area').removeClass('bg-warning');
						$('#batt-area').addClass('bg-success');
					} else if (batteryLevel > 35 && batteryLevel <= 65  && !$('#batt-icon').hasClass('fa-battery-half')) {
						$('#batt-icon').removeClass('fa-battery-quarter');
						$('#batt-icon').addClass('fa-battery-half');
						$('#batt-icon').removeClass('fa-battery-full');
						$('#batt-area').removeClass('bg-danger');
						$('#batt-area').addClass('bg-warning');
						$('#batt-area').removeClass('bg-success');
					} if (batteryLevel <= 35 && !$('#batt-icon').hasClass('fa-battery-quarter')) {
						$('#batt-icon').addClass('fa-battery-quarter');
						$('#batt-icon').removeClass('fa-battery-half');
						$('#batt-icon').removeClass('fa-battery-full');
						$('#batt-area').addClass('bg-danger');
						$('#batt-area').removeClass('bg-warning');
						$('#batt-area').removeClass('bg-success');
					}
				} else {
					$('#batt-area').addClass('d-none');
				}
				return true;
			} else {
				showAlert(1, 'Error!', data.msg, 1);
			}
		}
	});
}


/*
 * This function displays an alert message at the bottom of the screen
 */
function showAlert(error, bold, content, fade) {
	if (fade == 1) $('#alert-space').fadeOut(100);
	var alertType = 'alert-success';
	if (error == 1) alertType = 'alert-danger';
	$('#alert-space').html('<div class="alert alert-dismissible ' + alertType + ' set-alert">\
								<button type="button" class="close" data-dismiss="alert">&times;</button>\
								<strong>' + bold + '</strong> ' + content + ' \
							</div>');			
	if (fade == 1) $('#alert-space').fadeIn(150);
	if (content == "Arduino not connected" && $('#conn-arduino').hasClass('btn-outline-danger')) {
		updateSerialList(false);
		$('#conn-arduino').html('Reconnect');
		$('#conn-arduino').addClass('btn-outline-info');
		$('#conn-arduino').removeClass('btn-outline-danger');
		$('#ardu-area').attr('data-original-title','Disconnected');
		$('#ardu-area').addClass('bg-danger');
		$('#ardu-area').removeClass('bg-success');
		$('#batt-area').addClass('d-none');
		clearInterval(arduinoTimer);
		console.log("Cleared arduino timer");
	}
}


/*
 * Gamepad Functions go here!
 */
// Turn on controller support
function controllerOn() {
	if (gamePadActive == 0) {
		$('#cont-area').removeClass('d-none');
		resetInfo();
		joypad.set({ axisMovementThreshold: 0.2 });
		joypad.on('connect', e => updateInfo(e));
		joypad.on('disconnect', e => resetInfo(e));
		joypad.on('axis_move', e => {
			console.log(e.detail);
			return moveAxis(e);
		});
		joypad.on('button_press', e => {
			console.log(e.detail);
			return pressButton(e);
		});	
		moveXY[0] = 0;
		moveXY[2] = 0;
		gamePadActive = 1;
	}
}


// When controller is disconnected
function resetInfo(e) {
	if (gamePadActive == 1) {
		$('#cont-area').attr('data-original-title','Disconnected');
		$('#cont-area').addClass('bg-danger');
		$('#cont-area').removeClass('bg-success');
		//$('#joystick').removeClass('d-none');
		clearInterval(gamepadTimer);
		moveXY[0] = 0;
		moveXY[2] = 0;
		sendMovementValues();
		gamePadActive = 0;
	}
}

// When a new controller is connected
function updateInfo(e) {
	const { gamepad } = e;
	$('#cont-area').attr('data-original-title','Connected');
	$('#cont-area').removeClass('bg-danger');
	$('#cont-area').addClass('bg-success');
	//$('#joystick').addClass('d-none');
	gamepadTimer = setInterval(sendMovementValues, 100); 
}

// When a controller button is pressed
function pressButton(e) {
	const { buttonName } = e.detail;
	
	// A or Cross button - Sad eye expression
	if (buttonName === 'button_0') {
		servoPresets(document.getElementById('eyes-sad'),'eyes-sad','i');
	
	// B or Circle button - Right head tilt
	} else if (buttonName === 'button_1') {
		servoPresets(document.getElementById('eyes-right'),'eyes-right','l');
	
	// X or Square button - Left head tilt
	} else if (buttonName === 'button_2') {
		servoPresets(document.getElementById('eyes-left'),'eyes-left','j');
	
	// Y or Triangle button - Neutral eye expression
	} else if (buttonName === 'button_3') {
		servoPresets(document.getElementById('eyes-neutral'),'eyes-neutral','k');
	
	// Left Trigger button - Lower left arm
	} else if (buttonName === 'button_6') {
		moveArms[0] = -1;
	
	// Left Bumper button - Raise left arm
	} else if (buttonName === 'button_4') {
		moveArms[0] = 1;
		
	// Right Trigger button - Lower right arm
	} else if (buttonName === 'button_7') {
		moveArms[2] = -1;
		
	// Right Bumper button - Raise right arm
	} else if (buttonName === 'button_5') {
		moveArms[2] = 1;
	
	// Press down on left stick - Move arms back to neutral position
	} else if (buttonName === 'button_10') {
		moveArms[0] = 0;
		moveArms[1] = 50;
		moveArms[2] = 0;
		moveArms[3] = 50;
		servoPresets(document.getElementById('arms-neutral'),'arms-neutral','n');
	
	// Press down on right stick - Move head back to neutral position
	} else if (buttonName === 'button_11') {
		moveHead[0] = 50;
		servoControl(document.getElementById('head-rotation'),'G',50);
		moveHead[1] = 125;
		servoPresets(document.getElementById('head-neutral'),'head-neutral','g');
		
	// Back or Share button - Turn on/off automatic servo mode
	} else if (buttonName === 'button_8') {
		if ($('#auto-anime').parent().hasClass('active')) {
			$('#auto-anime').parent().removeClass('active');
			$('#manu-anime').parent().addClass('active');
			sendSettings('animeMode',0);
			servoInputs(1);
		} else if ($('#manu-anime').parent().hasClass('active')) {
			$('#auto-anime').parent().addClass('active');
			$('#manu-anime').parent().removeClass('active');
			sendSettings('animeMode',1);
			servoInputs(0);
		}
	
	// Left d-pad button - Play random sound
	} else if (buttonName === 'button_14') {
		var fileNames = [];
		var fileLengths = [];
		$("#audio-accordion div div a").each(function() { 
			fileNames.push($(this).attr('file-name'));
			fileLengths.push($(this).attr('file-length'));
		});
		var randomNumber = Math.floor((Math.random() * fileNames.length));
		playAudio(fileNames[randomNumber],fileLengths[randomNumber]);
		
	// Right d-pad button - Play random servo animation
	} else if (buttonName === 'button_15') {
		var fileNames = [];
		var fileLengths = [];
		$("#anime-accordion div div a").each(function() { 
			fileNames.push($(this).attr('file-name'));
			fileLengths.push($(this).attr('file-length'));
		});
		var randomNumber = Math.floor((Math.random() * fileNames.length));
		anime(fileNames[randomNumber],fileLengths[randomNumber]);
		console.log(randomNumber);
	}
}

// When a controller axis movement is detected
function moveAxis(e) {
	const { axis, axisMovementValue } = e.detail;
	
	if (axis === 0) {
		moveXY[0] = axisMovementValue;
	} else if (axis === 1) {
		moveXY[2] = axisMovementValue;
	} else if (axis === 2) {
		moveYP[0] = axisMovementValue;
	} else if (axis === 3) {
		moveYP[2] = axisMovementValue;
	} 
}

// Send the movement values at fixed intervals
function sendMovementValues() {
	
	// X or Y motor movement
	if (moveXY[0] != moveXY[1] || moveXY[2] != moveXY[3]) {
		
		// X-axis (left/right turning)
		if (moveXY[0] != moveXY[1]) moveXY[1] = moveXY[0];
		else moveXY[0] = 0;
		
		// Y-axis (forward/reverse movement)
		if (moveXY[2] != moveXY[3]) moveXY[3] = moveXY[2];
		else moveXY[2] = 0;
		
		$('#joytext').html('x: ' + Math.round(moveXY[1]*100) + ', y: ' + Math.round(moveXY[3]*-100));
		
		// Send data to python app, so that it can be passed on
		$.ajax({
			url: "/motor",
			type: "POST",
			data: {"stickX": moveXY[1], "stickY": -moveXY[3]},
			dataType: "json",
			success: function(data){
				if(data.status == "Error"){
					showAlert(1, 'Error!', data.msg, 0);
				} else {
					// Do nothing
				}
			},
			error: function(error) {
				showAlert(1, 'Unknown Error!', 'Could not send movement command.', 0);
			}
		});
	} else {
		moveXY[0] = 0;
		moveXY[2] = 0;
	}
	
	// Yaw Axis (head rotation left/right)
	if (moveYP[0] != moveYP[1]) {
		moveYP[1] = moveYP[0];
	} else moveYP[0] = 0;
	if (moveYP[1] != 0) {
		moveHead[0] += moveYP[1] * headMultiplier;
		if (moveHead[0] > 100) moveHead[0] = 100;
		else if (moveHead[0] < 0) moveHead[0] = 0;
		servoControl(document.getElementById('head-rotation'), 'G', Math.round(moveHead[0]));
	}
	
	
	// Pitch Axis (head tilt up/down)
	if (moveYP[2] != moveYP[3]) {
		moveYP[3] = moveYP[2];
	} else moveYP[2] = 0;
	if (moveYP[3] != 0) {
		moveHead[1] += moveYP[3] * headMultiplier;
		if (moveHead[1] > 200) moveHead[1] = 200;
		else if (moveHead[1] < 0) moveHead[1] = 0;
		if (moveHead[1] < 100) {
			servoControl(document.getElementById('neck-top'), 'T', Math.round(moveHead[1]));
			servoControl(document.getElementById('neck-bottom'), 'B', 0);
		} else if (moveHead[1] < 160) {
			servoControl(document.getElementById('neck-top'), 'T', Math.round(200 - moveHead[1]));
			servoControl(document.getElementById('neck-bottom'), 'B', Math.round(moveHead[1] - 100));
		} else {
			servoControl(document.getElementById('neck-top'), 'T', Math.round(moveHead[1]) - 110);
			servoControl(document.getElementById('neck-bottom'), 'B', 60);
		}
	}

	// Left Arm
	if (moveArms[0] != 0) {
		moveArms[1] += moveArms[0] * armsMultiplier;
		if (moveArms[1] > 100) moveArms[1] = 100;
		else if (moveArms[1] < 0) moveArms[1] = 0;
		servoControl(document.getElementById('arm-left'), 'L', Math.round(moveArms[1]));
		if ((moveArms[0] == -1) && (typeof joypad.buttonEvents.joypad[0].button_6 == 'undefined' || !joypad.buttonEvents.joypad[0].button_6.hold)) moveArms[0] = 0;
		else if ((moveArms[0] == 1) && (typeof joypad.buttonEvents.joypad[0].button_4 == 'undefined' || !joypad.buttonEvents.joypad[0].button_4.hold)) moveArms[0] = 0;
	}
	
	// Right Arm
	if (moveArms[2] != 0) {
		moveArms[3] += moveArms[2] * armsMultiplier;
		if (moveArms[3] > 100) moveArms[3] = 100;
		else if (moveArms[3] < 0) moveArms[3] = 0;
		servoControl(document.getElementById('arm-right'), 'R', Math.round(moveArms[3]));
		if ((moveArms[2] == -1) && (typeof joypad.buttonEvents.joypad[0].button_7 == 'undefined' || !joypad.buttonEvents.joypad[0].button_7.hold)) moveArms[2] = 0;
		else if ((moveArms[2] == 1) && (typeof joypad.buttonEvents.joypad[0].button_5 == 'undefined' || !joypad.buttonEvents.joypad[0].button_5.hold)) moveArms[2] = 0;
	}
}


/*
 * This function is run once when the page is loading
 */
window.onload = function () { 
	var h = window.innerHeight - 100;
	var cw = $('#limit').width();
	var pointer = 80;
	
	if (h > cw) {
		$('#limit').css({'height':cw+'px'});
	} else {
		$('#limit').css({'height':h+'px'});
		$('#limit').css({'width':h+'px'});
		pointer = 60;
		$('#base').css({'width':pointer+'px'});
		$('#base').css({'height':pointer+'px'});
		$('#stick').css({'width':pointer+'px'});
		$('#stick').css({'height':pointer+'px'});
		cw = h;
	}
	$('#stick').css({'top':Math.round(cw/2-pointer/2)+'px'});
	$('#stick').css({'left':Math.round(cw/2-pointer/2)+'px'});
	$('#base').css({'top':Math.round(cw/2-pointer/2)+'px'});
	$('#base').css({'left':Math.round(cw/2-pointer/2)+'px'});

	var offsets = document.getElementById('limit').getBoundingClientRect();
	var top = offsets.top;
	var left = offsets.left;
	
	jsJoystick = new VirtualJoystick({
		mouseSupport: true,
		stationaryBase: true,
		baseX: left+(cw/2),
		baseY: top+(cw/2),
		center: (cw/2),
		limitStickTravel: true,
		stickRadius: Math.round(cw/2) - pointer/2,
		container: document.getElementById('limit'),
		stickElement: document.getElementById('stick'),
		//baseElement: document.getElementById('base'),
		useCssTransform: true,
		updateText: document.getElementById('joytext')
	});
}


/*
 * This function is run when the window is resized
 */
$(window).resize(function () {
	var h = window.innerHeight - 100;
	var w = window.innerWidth;
	var cw = (w - 30) * 0.8;
	if (w > 767) cw = ((w / 2) - 30) * 0.8;
	if (cw > 500) cw = 500;
	var pointer = 80;
	
	if (h < cw) {
		cw = h;
		pointer = 60;
	}
	
	$('#limit').css({'height':cw+'px'});
	$('#limit').css({'width':cw+'px'});
	$('#base').css({'width':pointer+'px'});
	$('#base').css({'height':pointer+'px'});
	$('#stick').css({'width':pointer+'px'});
	$('#stick').css({'height':pointer+'px'});
	$('#stick').css({'top':Math.round(cw/2-pointer/2)+'px'});
	$('#stick').css({'left':Math.round(cw/2-pointer/2)+'px'});
	$('#base').css({'top':Math.round(cw/2-pointer/2)+'px'});
	$('#base').css({'left':Math.round(cw/2-pointer/2)+'px'});

	var middleX = w / 2;
	if (w > 767) middleX += w / 4;
	var middleY = 40 + 30 + cw / 2;
	
	jsJoystick.updateDimensions(middleX, middleY, (cw/2), Math.round(cw/2) - pointer/2);
});


/*
 * This function is run once when the page has finished loading
 */
$(document).ready(function () {

	$(function () {
	  $('[data-toggle="tooltip"]').tooltip()
	})

	controllerOn();
	if (joypad.instances[0] != null && joypad.instances[0].connected) updateInfo(joypad.instances[0]);
	
	// This function runs when a number is inserted into the motor-offset
	// input box, and ensures the number is valid.
	$('#motor-offset').bind('keyup input', function(){
		var regex=/^[0-9]+$/;
    	var val1 = $('#motor-offset').val();
    	var val2 = $('#steer-offset').val();
    	$('#motor-offset').removeClass('is-valid');
    	$('#motor-offset').removeClass('is-invalid');
    	if(!val1.match(regex) || !val2.match(regex) || val1 > 250 || val1 < 0 || val2 > 100 || val2 < -100) $('#num-update').addClass('disabled');
    	else $('#num-update').removeClass('disabled');
	});

	// This function runs when a number is inserted into the steering-offset
	// input box, and ensures the number is valid.
	$('#steer-offset').bind('keyup input', function(){
		var regex=/^[0-9]+$/;
    	var val1 = $('#motor-offset').val();
    	var val2 = $('#steer-offset').val();
    	$('#steer-offset').removeClass('is-valid');
    	$('#steer-offset').removeClass('is-invalid');
    	if(!val1.match(regex) || !val2.match(regex) || val1 > 250 || val1 < 0 || val2 > 100 || val2 < -100) $('#num-update').addClass('disabled');
    	else $('#num-update').removeClass('disabled');
	});

	$('#num-update').click(function(){
		if(!$('#num-update').hasClass('disabled')){
			var val1 = $('#motor-offset').val();
	    	var val2 = $('#steer-offset').val();
	    	sendSettings("motorOff", val1);
	    	if($('#alert-space > div').hasClass('alert-danger')) {
	    		$('#motor-offset').removeClass('is-valid');
	    		$('#motor-offset').addClass('is-invalid');
	    	} else {
	    		$('#motor-offset').removeClass('is-invalid');
	    		$('#motor-offset').addClass('is-valid');
	    	}
	    	sendSettings("steerOff", val2);
	    	if($('#alert-space > div').hasClass('alert-danger')) {
	    		$('#steer-offset').removeClass('is-valid');
	    		$('#steer-offset').addClass('is-invalid');
	    	} else {
	    		$('#steer-offset').removeClass('is-invalid');
	    		$('#steer-offset').addClass('is-valid');
	    	}
	    }
	});
});
