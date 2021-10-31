#############################################
# Wall-e Robot Web-interface
#
# @file       app.py
# @brief      Flask web-interface to control Wall-e robot
# @author     Simon Bluett
# @website    https://wired.chillibasket.com
# @copyright  Copyright (C) 2021 - Distributed under MIT license
# @version    1.5
# @date       31st October 2021
#############################################

from flask import Flask, request, session, redirect, url_for, jsonify, render_template
import queue 		# for serial command queue
import threading 	# for multiple threads
import os
import pygame		# for sound
import serial 		# for Arduino serial access
import serial.tools.list_ports
import subprocess 	# for shell commands
import time
app = Flask(__name__)


##### VARIABLES WHICH YOU CAN MODIFY #####
loginPassword = "put_password_here"                                  # Password for web-interface
arduinoPort = "ARDUINO"                                              # Default port which will be selected
streamScript = "/home/pi/mjpg-streamer.sh"                           # Location of script used to start/stop video stream
soundFolder = "/home/pi/walle-replica/web_interface/static/sounds/"  # Location of the folder containing all audio files
app.secret_key = os.environ.get("SECRET_KEY") or os.urandom(24)      # Secret key used for login session cookies
autoStartArduino = False                                             # False = no auto connect, True = automatically try to connect to default port
autoStartCamera = False                                              # False = no auto start, True = automatically start up the camera
##########################################


# Start sound mixer
pygame.mixer.init()

# Set up runtime variables and queues
exitFlag = 0
arduinoActive = 0
streaming = 0
volume = 5
batteryLevel = -999
queueLock = threading.Lock()
workQueue = queue.Queue()
threads = []
initialStartup = False


#############################################
# Set up the multithreading stuff here
#############################################

##
# Thread class used for managing communication with the Arduino
#
class arduino (threading.Thread):

	##
	# Constructor
	#
	# @param  threadID  The thread identification number
	# @param  name      Name of the thread
	# @param  q         Queue containing the message to be sent
	# @param  port      The serial port where the Arduino is connected
	#
	def __init__(self, threadID, name, q, port):
		threading.Thread.__init__(self)
		self.threadID = threadID
		self.name = name
		self.q = q
		self.port = port


	##
	# Run the thread
	#
	def run(self):
		print("Starting Arduino Thread", self.name)
		process_data(self.name, self.q, self.port)
		print("Exiting Arduino Thread", self.name)

""" End of class: Arduino """


##
# Send data to the Arduino from a buffer queue
#
# @param  threadName Name of the thread
# @param  q          Queue containing the messages to be sent
# @param  port       The serial port where the Arduino is connected
#
def process_data(threadName, q, port):
	global exitFlag
	
	ser = serial.Serial(port,115200)
	ser.flushInput()
	dataString = ""

	# Keep this thread running until the exitFlag changes
	while not exitFlag:
		try:
			# If there are any messages in the queue, send them
			queueLock.acquire()
			if not workQueue.empty():
				data = q.get() + '\n'
				queueLock.release()
				ser.write(data.encode())
				print(data)
			else:
				queueLock.release()

			# Read any incomming messages
			while (ser.inWaiting() > 0):
				data = ser.read()
				if (data.decode() == '\n' or data.decode() == '\r'):
					print(dataString)
					parseArduinoMessage(dataString)
					dataString = ""
				else:
					dataString += data.decode()

			time.sleep(0.01)

		# If an error occured in the Arduino Communication
		except Exception as e: 
			print(e)
			exitFlag = 1
	ser.close()


##
# Parse messages received from the Arduino
#
# @param  dataString  String containing the serial message to be parsed
#
def parseArduinoMessage(dataString):
	global batteryLevel
	
	# Battery level message
	if "Battery" in dataString:
		dataList = dataString.split('_')
		if len(dataList) > 1 and dataList[1].isdigit():
			batteryLevel = dataList[1]


##
# Turn on/off the Arduino background communications thread
#
# @param  q    Queue object containing the messages to be sent
# @param  port The serial port where the Arduino is connected
#
def onoff_arduino(q, portNum):
	global arduinoActive
	global exitFlag
	global threads
	global batteryLevel
	
	# Set up thread and connect to Arduino
	if not arduinoActive:
		exitFlag = 0

		usb_ports = [
			p.device
			for p in serial.tools.list_ports.comports()
		]
		
		thread = arduino(1, "Arduino", q, usb_ports[portNum])
		thread.start()
		threads.append(thread)

		arduinoActive = 1

	# Disconnect Arduino and exit thread
	else:
		exitFlag = 1
		batteryLevel = -999

		# Clear the queue
		queueLock.acquire()
		while not workQueue.empty():
			q.get()
		queueLock.release()

		# Join any active threads up
		for t in threads:
			t.join()

		threads = []
		arduinoActive = 0

	return 0


##
# Test whether the Arduino connection is still active
#
def test_arduino():
	global arduinoActive
	global exitFlag
	global workQueue
	
	if arduinoActive and not exitFlag:
		return 1
	elif exitFlag and arduinoActive:
		onoff_arduino(workQueue, 0)
	else:
		return 0


##
# Turn on/off the webcam MJPG Streamer
#
def onoff_streamer():
	global streaming
	
	if not streaming:
		# Turn on stream
		subprocess.call([streamScript, 'start'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
		result = ""

		# Check whether the stream is on or not
		try:
			result = subprocess.run([streamScript, 'status'], stdout=subprocess.PIPE).stdout.decode('utf-8')
		except subprocess.CalledProcessError as e:
			result = e.output.decode('utf-8')
		print(result)
		
		if 'stopped' in result:
			streaming = 0
			return 1
		else:
			streaming = 1
			return 0

	else:
		# Turn off stream
		subprocess.call([streamScript, 'stop'], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
		
		streaming = 0
		return 0


#############################################
# Flask Pages and Functions
#############################################

##
# Show the main web-interface page
#
@app.route('/')
def index():

	if session.get('active') != True:
		return redirect(url_for('login'))

	# Get list of audio files
	files = []
	for item in sorted(os.listdir(soundFolder)):
		if item.endswith(".ogg"):
			audiofiles = os.path.splitext(os.path.basename(item))[0]
			
			# Set up default details
			audiogroup = "Other"
			audionames = audiofiles
			audiotimes = 0
			
			# Get item details from name, and make sure they are valid
			if len(audiofiles.split('_')) == 2:
				if audiofiles.split('_')[1].isdigit():
					audionames = audiofiles.split('_')[0]
					audiotimes = float(audiofiles.split('_')[1])/1000.0
				else:
					audiogroup = audiofiles.split('_')[0]
					audionames = audiofiles.split('_')[1]
			elif len(audiofiles.split('_')) == 3:
				audiogroup = audiofiles.split('_')[0]
				audionames = audiofiles.split('_')[1]
				if audiofiles.split('_')[2].isdigit():
					audiotimes = float(audiofiles.split('_')[2])/1000.0
			
			# Add the details to the list
			files.append((audiogroup,audiofiles,audionames,audiotimes))
	
	# Get list of connected USB devices
	ports = serial.tools.list_ports.comports()
	usb_ports = [
		p.description
		for p in serial.tools.list_ports.comports()
		#if 'ttyACM0' in p.description
	]
	
	# Ensure that the preferred Arduino port is selected by default
	selectedPort = 0
	for index, item in enumerate(usb_ports):
		if arduinoPort in item:
			selectedPort = index
	
	# Only automatically connect systems on startup
	global initialStartup
	if not initialStartup:
		initialStartup = True

		# If user has selected for the Arduino to connect by default, do so now
		if autoStartArduino and not test_arduino():
			onoff_arduino(workQueue, selectedPort)
			print("Started Arduino comms")

		# If user has selected for the camera stream to be active by default, turn it on now
		if autoStartCamera and not streaming:
			onoff_streamer()
			print("Started camera stream")

	return render_template('index.html',sounds=files,ports=usb_ports,portSelect=selectedPort,connected=arduinoActive,cameraActive=streaming)


##
# Show the Login page
#
@app.route('/login')
def login():
	if session.get('active') == True:
		return redirect(url_for('index'))
	else:
		return render_template('login.html')

##
# Check if the login password is correct
#
@app.route('/login_request', methods = ['POST'])
def login_request():
	password = request.form.get('password')
	if password == loginPassword:
		session['active'] = True
		return redirect(url_for('index'))
	return redirect(url_for('login'))


##
# Control the main movement motors
#
@app.route('/motor', methods=['POST'])
def motor():
	if session.get('active') != True:
		return redirect(url_for('login'))

	stickX =  request.form.get('stickX')
	stickY =  request.form.get('stickY')

	if stickX is not None and stickY is not None:
		xVal = int(float(stickX)*100)
		yVal = int(float(stickY)*100)
		print("Motors:", xVal, ",", yVal)

		if test_arduino() == 1:
			queueLock.acquire()
			workQueue.put("X" + str(xVal))
			workQueue.put("Y" + str(yVal))
			queueLock.release()
			return jsonify({'status': 'OK' })
		else:
			return jsonify({'status': 'Error','msg':'Arduino not connected'})
	else:
		print("Error: unable to read POST data from motor command")
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})


##
# Update Settings
#
@app.route('/settings', methods=['POST'])
def settings():
	if session.get('active') != True:
		return redirect(url_for('login'))

	thing = request.form.get('type')
	value = request.form.get('value')

	if thing is not None and value is not None:
		# Motor deadzone threshold
		if thing == "motorOff":
			print("Motor Offset:", value)
			if test_arduino() == 1:
				queueLock.acquire()
				workQueue.put("O" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})

		# Motor steering offset/trim
		elif thing == "steerOff":
			print("Steering Offset:", value)
			if test_arduino() == 1:
				queueLock.acquire()
				workQueue.put("S" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})

		# Automatic/manual animation mode
		elif thing == "animeMode":
			print("Animation Mode:", value)
			if test_arduino() == 1:
				queueLock.acquire()
				workQueue.put("M" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})

		# Sound mode currently doesn't do anything
		elif thing == "soundMode":
			print("Sound Mode:", value)

		# Change the sound effects volume
		elif thing == "volume":
			global volume
			volume = int(value)
			print("Change Volume:", value)

		# Turn on/off the webcam
		elif thing == "streamer":
			print("Turning on/off MJPG Streamer:", value)
			if onoff_streamer() == 1:
				return jsonify({'status': 'Error', 'msg': 'Unable to start the stream'})

			if streaming == 1:
				return jsonify({'status': 'OK','streamer': 'Active'})
			else:
				return jsonify({'status': 'OK','streamer': 'Offline'})

		# Shut down the Raspberry Pi
		elif thing == "shutdown":
			print("Shutting down Raspberry Pi!", value)
			result = subprocess.run(['sudo','nohup','shutdown','-h','now'], stdout=subprocess.PIPE).stdout.decode('utf-8')
			return jsonify({'status': 'OK','msg': 'Raspberry Pi is shutting down'})

		# Unknown command
		else:
			return jsonify({'status': 'Error','msg': 'Unable to read POST data'})

		return jsonify({'status': 'OK' })
	else:
		return jsonify({'status': 'Error','msg': 'Unable to read POST data'})


##
# Play an Audio clip on the Raspberry Pi
#
@app.route('/audio', methods=['POST'])
def audio():
	if session.get('active') != True:
		return redirect(url_for('login'))

	clip =  request.form.get('clip')
	if clip is not None:
		clip = soundFolder + clip + ".ogg"
		print("Play music clip:", clip)
		pygame.mixer.music.load(clip)
		pygame.mixer.music.set_volume(volume/10.0)
		#start_time = time.time()
		pygame.mixer.music.play()
		#while pygame.mixer.music.get_busy() == True:
		#	continue
		#elapsed_time = time.time() - start_time
		#print(elapsed_time)
		return jsonify({'status': 'OK' })
	else:
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})


##
# Send an Animation command to the Arduino
#
@app.route('/animate', methods=['POST'])
def animate():
	if session.get('active') != True:
		return redirect(url_for('login'))

	clip = request.form.get('clip')
	if clip is not None:
		print("Animate:", clip)

		if test_arduino() == 1:
			queueLock.acquire()
			workQueue.put("A" + clip)
			queueLock.release()
			return jsonify({'status': 'OK' })
		else:
			return jsonify({'status': 'Error','msg':'Arduino not connected'})
	else:
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})

	
##
# Send a Servo Control command to the Arduino
#
@app.route('/servoControl', methods=['POST'])
def servoControl():
	if session.get('active') != True:
		return redirect(url_for('login'))

	servo = request.form.get('servo')
	value = request.form.get('value')
	if servo is not None and value is not None:
		print("servo:", servo)
		print("value:", value)
		
		if test_arduino() == 1:
			queueLock.acquire()
			workQueue.put(servo + value)
			queueLock.release()
			return jsonify({'status': 'OK' })
		else:
			return jsonify({'status': 'Error','msg':'Arduino not connected'})
	else:
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})


##
# Connect/Disconnect the Arduino Serial Port
#
@app.route('/arduinoConnect', methods=['POST'])
def arduinoConnect():
	if session.get('active') != True:
		return redirect(url_for('login'))
		
	action = request.form.get('action')
	
	if action is not None:
		# Update drop-down selection with list of connected USB devices
		if action == "updateList":
			print("Reload list of connected USB ports")
			
			# Get list of connected USB devices
			ports = serial.tools.list_ports.comports()
			usb_ports = [
				p.description
				for p in serial.tools.list_ports.comports()
				#if 'ttyACM0' in p.description
			]
			
			# Ensure that the preferred Arduino port is selected by default
			selectedPort = 0
			for index, item in enumerate(usb_ports):
				if arduinoPort in item:
					selectedPort = index
					
			return jsonify({'status': 'OK','ports':usb_ports,'portSelect':selectedPort})
		
		# If we want to connect/disconnect Arduino device
		elif action == "reconnect":
			
			print("Reconnect to Arduino")
			
			if test_arduino():
				onoff_arduino(workQueue, 0)
				return jsonify({'status': 'OK','arduino': 'Disconnected'})
				
			else:	
				port = request.form.get('port')
				if port is not None and port.isdigit():
					portNum = int(port)
					# Test whether connection to the selected port is possible
					usb_ports = [
						p.device
						for p in serial.tools.list_ports.comports()
					]
					if portNum >= 0 and portNum < len(usb_ports):
						# Try opening and closing port to see if connection is possible
						try:
							ser = serial.Serial(usb_ports[portNum],115200)
							if (ser.inWaiting() > 0):
								ser.flushInput()
							ser.close()
							onoff_arduino(workQueue, portNum)
							return jsonify({'status': 'OK','arduino': 'Connected'})
						except:
							return jsonify({'status': 'Error','msg':'Unable to connect to selected serial port'})
					else:
						return jsonify({'status': 'Error','msg':'Invalid serial port selected'})
				else:
					return jsonify({'status': 'Error','msg':'Unable to read [port] POST data'})
		else:
			return jsonify({'status': 'Error','msg':'Unable to read [action] POST data'})
	else:
		return jsonify({'status': 'Error','msg':'Unable to read [action] POST data'})


##
# Update the Arduino Status
#
# @return JSON containing the current battery level
#
@app.route('/arduinoStatus', methods=['POST'])
def arduinoStatus():
	if session.get('active') != True:
		return redirect(url_for('login'))
		
	action = request.form.get('type')
	
	if action is not None:
		if action == "battery":
			if test_arduino():
				return jsonify({'status': 'OK','battery':batteryLevel})
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})
	
	return jsonify({'status': 'Error','msg':'Unable to read POST data'})


##
# Program start code, which initialises the web-interface
#
if __name__ == '__main__':

	#app.run()
	app.run(debug=False, host='0.0.0.0')