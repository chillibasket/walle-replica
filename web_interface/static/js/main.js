/* 
 * Robot Webinterface - Main Script
 * Simon B., https://wired.chillibasket.com
 * V1.2, 25th January 2020
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
			if(data.status == "Error"){
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Error! </strong>' + data.msg + ' \
										</div>');
				$('#alert-space').fadeIn(150);
				return 0;
			} else {
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-success set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Success!</strong> Settings have been updated.\
										</div>');
				$('#alert-space').fadeIn(150);
												
				if(typeof data.arduino !== "undefined"){
						if(data.arduino == "Connected"){
							$('#conn-arduino').html('Disconnect');
							$('#conn-arduino').removeClass('btn-outline-info');
							$('#conn-arduino').addClass('btn-outline-danger');
						} else if(data.arduino == "Disconnected"){
							$('#conn-arduino').html('Connect');
							$('#conn-arduino').addClass('btn-outline-info');
							$('#conn-arduino').removeClass('btn-outline-danger');
						}
				} else if(typeof data.streamer !== "undefined"){
						if(data.streamer == "Active"){
							$('#conn-streamer').html('End Stream');
							$('#conn-streamer').removeClass('btn-outline-info');
							$('#conn-streamer').addClass('btn-outline-danger');
							$("#stream").attr("src","http:/" + "/" + window.location.hostname + ":8081/?action=stream");
						} else if(data.streamer == "Offline"){
							$('#conn-streamer').html('Activate');
							$('#conn-streamer').addClass('btn-outline-info');
							$('#conn-streamer').removeClass('btn-outline-danger');
							$("#stream").attr("src","/static/streamimage.jpg");
						}
				}
				return 1;
			}
		},
		error: function(error) {
			$('#alert-space').fadeOut(100);
			$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
										<button type="button" class="close" data-dismiss="alert">&times;</button>\
										<strong>Unknown Error! </strong> Unable to update settings. \
									</div>');
			$('#alert-space').fadeIn(150);
			return 0;
		}
	});
}

function anime(clip, time) {
	$.ajax({
		url: "/animate",
		type: "POST",
		data: {"clip": clip},
		dataType: "json",
		beforeSend: function(){
			$('#anime-progress').stop();
			$('#anime-progress').css('width', '0%').attr('aria-valuenow', 0);
		},
		success: function(data){
			if(data.status == "Error"){
				$('#anime-progress').addClass('bg-danger');
				$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, 500);
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Error! </strong>' + data.msg + ' \
										</div>');
				$('#alert-space').fadeIn(150);
				return false;
			} else {
				$('#anime-progress').removeClass('bg-danger');
				$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, time*1000);
				return true;
			}
		},
		error: function(error) {
			$('#anime-progress').addClass('bg-danger');
			$('#anime-progress').css("width", "0%").animate({width: 100+"%"}, 500);
			$('#alert-space').fadeOut(100);
			$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
										<button type="button" class="close" data-dismiss="alert">&times;</button>\
										<strong>Unknown Error! </strong> Unable to run the animation. \
									</div>');
			$('#alert-space').fadeIn(150);
			return false;
		}
	});
}

function playAudio(clip, time) {
	$.ajax({
		url: "/audio",
		type: "POST",
		data: {"clip": clip},
		dataType: "json",
		beforeSend: function(){
			$('#audio-progress').stop();
			$('#audio-progress').css('width', '0%').attr('aria-valuenow', 0);
		},
		success: function(data){
			if(data.status == "Error"){
				$('#audio-progress').addClass('bg-danger');
				$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, 500);
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Error! </strong>' + data.msg + ' \
										</div>');
				$('#alert-space').fadeIn(150);
				return false;
			} else {
				$('#audio-progress').removeClass('bg-danger');
				$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, time*1000);
				return true;
			}
		},
		error: function(error) {
			$('#audio-progress').addClass('bg-danger');
			$('#audio-progress').css("width", "0%").animate({width: 100+"%"}, 500);
			$('#alert-space').fadeOut(100);
			$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
										<button type="button" class="close" data-dismiss="alert">&times;</button>\
										<strong>Unknown Error! </strong> Unable to play audio file. \
									</div>');
			$('#alert-space').fadeIn(150);
			return false;
		}
	});
}


function servoControl(item, servo, value) {
	$.ajax({
		url: "/servoControl",
		type: "POST",
		data: {"servo": servo, "value": value},
		dataType: "json",
		success: function(data){
			if(data.status == "Error"){
				item.value = item.oldvalue;
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Error! </strong>' + data.msg + ' \
										</div>');
				$('#alert-space').fadeIn(150);
				return false;
			} else {
				return true;
			}
		},
		error: function(error) {
			$('#alert-space').fadeOut(100);
			$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
										<button type="button" class="close" data-dismiss="alert">&times;</button>\
										<strong>Unknown Error! </strong> Unable to update servo position. \
									</div>');
			$('#alert-space').fadeIn(150);
			return false;
		}
	});
}


function servoPresets(item, preset, servo) {
	if (!item.classList.contains('disabled')) {
		$.ajax({
			url: "/servoControl",
			type: "POST",
			data: {"servo": servo, "value": 0},
			dataType: "json",
			success: function(data){
				if(data.status == "Error"){
					item.value = item.oldvalue;
					$('#alert-space').fadeOut(100);
					$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
												<button type="button" class="close" data-dismiss="alert">&times;</button>\
												<strong>Error! </strong>' + data.msg + ' \
											</div>');
					$('#alert-space').fadeIn(150);
					return false;
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
				$('#alert-space').fadeOut(100);
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
											<button type="button" class="close" data-dismiss="alert">&times;</button>\
											<strong>Unknown Error! </strong> Unable to update servo position. \
										</div>');
				$('#alert-space').fadeIn(150);
				return false;
			}
		});
	}
}


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


window.onload = function () { 
	var h = window.innerHeight - 80;
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
	
	var joystick = new VirtualJoystick({
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

$(document).ready(function () {
	$('#motor-offset').bind('keyup input', function(){
		var regex=/^[0-9]+$/;
    	var val1 = $('#motor-offset').val();
    	var val2 = $('#steer-offset').val();
    	$('#motor-offset').removeClass('is-valid');
    	$('#motor-offset').removeClass('is-invalid');
    	if(!val1.match(regex) || !val2.match(regex) || val1 > 250 || val1 < 0 || val2 > 100 || val2 < -100) $('#num-update').addClass('disabled');
    	else $('#num-update').removeClass('disabled');
	});

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
