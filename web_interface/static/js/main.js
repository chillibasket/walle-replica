/* 
 * Robot Webinterface - Main Script
 * Simon B., https://wired.chillibasket.com
 * V1.0, 7/6/19
 */

function sendSettings(type, value) {
	//alert(type + ", " + value);
	// Send data to python app, so that it can be passed on
	$.ajax({
		url: "/settings",
		type: "POST",
		data: {"type" : type, "value": value},
		dataType: "json",
		success: function(data){
			if(data.status == "Error"){
				$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
												<button type="button" class="close" data-dismiss="alert">&times;</button>\
												<strong>Error! </strong>' + data.msg + ' \
											</div>');
				return 0;
			} else {
				$('#alert-space').html('<div class="alert alert-dismissible alert-success set-alert">\
													<button type="button" class="close" data-dismiss="alert">&times;</button>\
													<strong>Success!</strong> Settings have been updated.\
												</div>');
												
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
			$('#alert-space').html('<div class="alert alert-dismissible alert-danger set-alert">\
												<button type="button" class="close" data-dismiss="alert">&times;</button>\
												<strong>Error! </strong> Unable to update settings. \
											</div>');
			return 0;
		}
	});
}

function anime(clip, time) {
	//alert(clip);
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
			return false;
		}
	});
}

function playAudio(clip, time) {

	
	//alert(clip);
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
			return false;
		}
	});
}


window.onload = function () { 
	var cw = $('#limit').width();
	$('#limit').css({'height':cw+'px'});
	$('#stick').css({'top':Math.round(cw/2-40)+'px'});
	$('#stick').css({'left':Math.round(cw/2-40)+'px'});
	$('#base').css({'top':Math.round(cw/2-40)+'px'});
	$('#base').css({'left':Math.round(cw/2-40)+'px'});

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
		stickRadius: Math.round(cw/2) - 40,
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
