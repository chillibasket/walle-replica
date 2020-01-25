#############################################
# Robot Webinterface - Python Script
# Simon Bluett, https://wired.chillibasket.com
# V1.3, 25th January 2020
#############################################

from flask import Flask, request, session, redirect, url_for, jsonify, render_template
import queue 		# for serial command queue
import threading 	# for multiple threads
import os
import pygame		# for sound
import serial 		# for Arduino serial access
import serial.tools.list_ports
import subprocess 	# for shell commands

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY") or os.urandom(24)

# Start sound mixer
pygame.mixer.init()

# Set up runtime variables and queues
exitFlag = 0
arduinoActive = 0
streaming = 0
volume = 5
queueLock = threading.Lock()
workQueue = queue.Queue()
threads = []


#############################################
# Set up the multithreading stuff here
#############################################
# The second thread will be used to send data to the Arduino
class arduino (threading.Thread):
	def __init__(self, threadID, name, q, port):
		threading.Thread.__init__(self)
		self.threadID = threadID
		self.name = name
		self.q = q
		self.port = port
	def run(self):
		print("Starting Arduino Thread", self.name)
		process_data(self.name, self.q, self.port)
		print("Exiting Arduino Thread", self.name)

# Function to send data to the Arduino from a buffer queue
def process_data(threadName, q, port):

	ser = serial.Serial(port,115200)
	ser.flushInput()
	dataString = ""
	while not exitFlag:
		queueLock.acquire()
		if not workQueue.empty():
			data = q.get() + '\n'
			queueLock.release()
			ser.write(data.encode())
			print(data)
		else:
			queueLock.release()
		if (ser.inWaiting() > 0):
			data = ser.read()
			if (data.decode() == '\n' or data.decode() == '\r'):
				print(dataString)
				parseArduinoMessage(dataString)
				dataString = ""
			else:
				dataString += data.decode()

# Function to parse messages received from the Arduino
def parseArduinoMessage(dataString):
	# Nothing here yet!
	if (dataString == "Something we want to look out for..."):
		print("Do something in response")


# Turn on/off the Arduino Thread system
def onoff_arduino(q):
	global arduinoActive
	global exitFlag
	global threads
	if not arduinoActive:
		ports = serial.tools.list_ports.comports()
		for p in ports:
			print(p.description)

		arduino_ports = [
			p.device
			for p in serial.tools.list_ports.comports()
			if 'ARDUINO' in p.description
		]

		print(arduino_ports)
		
		if not arduino_ports:
			return 1

		# Set up thread and connect to Arduino
		exitFlag = 0

		thread = arduino(1, "Arduino", q, arduino_ports[0])
		thread.start()
		threads.append(thread)

		arduinoActive = 1

	else:
		# Disconnect Arduino and exit thread
		exitFlag = 1

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

# Turn on/off the MJPG Streamer
def onoff_streamer():
	global streaming
	if not streaming:
		# Turn on stream
		p = os.popen('/home/pi/mjpg-streamer.sh start')
		result = p.readline().rstrip('\n')
		print(result)
		if 'failed to start' in result:
			streaming = 0
			return 1
		else:
			streaming = 1
			return 0

	else:
		# Turn off stream
		result = subprocess.run(['/home/pi/mjpg-streamer.sh', 'stop'], stdout=subprocess.PIPE).stdout.decode('utf-8')
		print(result)
		streaming = 0
		return 0


#############################################
# Flask Pages and Functions
#############################################

# Main Page
@app.route('/')
def index():
	if session.get('active') != True:
		return redirect(url_for('login'))

	files = []
	for item in sorted(os.listdir('/home/pi/walle-replica/web_interface/static/sounds')):
		if item.lower().endswith('.ogg'):
			audiofiles = os.path.splitext(os.path.basename(item))[0]
			audionames = audiofiles.split('_')[0]
			audiotimes = float(audiofiles.split('_')[1])/1000.0
			files.append((audiofiles,audionames,audiotimes))

	return render_template('index.html',sounds=files)

# Login
@app.route('/login')
def login():
	if session.get('active') == True:
		return redirect(url_for('index'))
	else:
		return render_template('login.html')

# Login Request
@app.route('/login_request', methods = ['POST'])
def login_request():
	password = request.form.get('password')
	if password == 'put_password_here':
		session['active'] = True
		return redirect(url_for('index'))
	return redirect(url_for('login'))

# Motor Control
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
		if arduinoActive == 1:
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

# Update Settings
@app.route('/settings', methods=['POST'])
def settings():
	if session.get('active') != True:
		return redirect(url_for('login'))

	thing = request.form.get('type')
	value = request.form.get('value')

	if thing is not None and value is not None:
		if thing == "motorOff":
			print("Motor Offset:", value)
			if arduinoActive == 1:
				queueLock.acquire()
				workQueue.put("O" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})
		elif thing == "steerOff":
			print("Steering Offset:", value)
			if arduinoActive == 1:
				queueLock.acquire()
				workQueue.put("S" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})
		elif thing == "animeMode":
			print("Animation Mode:", value)
			if arduinoActive == 1:
				queueLock.acquire()
				workQueue.put("M" + value)
				queueLock.release()
			else:
				return jsonify({'status': 'Error','msg':'Arduino not connected'})
		elif thing == "soundMode":
			print("Sound Mode:", value)
		elif thing == "volume":
			global volume
			volume = int(value)
			print("Change Volume:", value)
		elif thing == "reconnect":
			print("Reconnect to Arduino:", value)
			if onoff_arduino(workQueue) == 1:
				return jsonify({'status': 'Error', 'msg': 'No Arduino Connected'})

			if arduinoActive == 1:
				return jsonify({'status': 'OK','arduino': 'Connected'})
			else:
				return jsonify({'status': 'OK','arduino': 'Disconnected'})
		elif thing == "streamer":
			print("Turning on/off MJPG Streamer:", value)
			if onoff_streamer() == 1:
				return jsonify({'status': 'Error', 'msg': 'Unable to start the stream'})

			if streaming == 1:
				return jsonify({'status': 'OK','streamer': 'Active'})
			else:
				return jsonify({'status': 'OK','streamer': 'Offline'})
		elif thing == "shutdown":
			print("Shutting down Raspberry Pi!", value)
			result = subprocess.run(['sudo','nohup','shutdown','-h','now'], stdout=subprocess.PIPE).stdout.decode('utf-8')
			return jsonify({'status': 'OK','msg': 'Raspberry Pi is shutting down'})
		else:
			return jsonify({'status': 'Error','msg': 'Unable to read POST data'})

		return jsonify({'status': 'OK' })
	else:
		return jsonify({'status': 'Error','msg': 'Unable to read POST data'})

# Play Audio
@app.route('/audio', methods=['POST'])
def audio():
	if session.get('active') != True:
		return redirect(url_for('login'))

	clip =  request.form.get('clip')
	if clip is not None:
		clip = "/home/pi/walle-replica/web_interface/static/sounds/" + clip + ".ogg"
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

# Animate
@app.route('/animate', methods=['POST'])
def animate():
	if session.get('active') != True:
		return redirect(url_for('login'))

	clip = request.form.get('clip')
	if clip is not None:
		print("Animate:", clip)

		if arduinoActive == 1:
			queueLock.acquire()
			workQueue.put("A" + clip)
			queueLock.release()
			return jsonify({'status': 'OK' })
		else:
			return jsonify({'status': 'Error','msg':'Arduino not connected'})
	else:
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})

# Servo Control
@app.route('/servoControl', methods=['POST'])
def servoControl():
	if session.get('active') != True:
		return redirect(url_for('login'))

	servo = request.form.get('servo');
	value = request.form.get('value');
	if servo is not None and value is not None:
		print("servo:", servo)
		print("value:", value)
		
		if arduinoActive == 1:
			queueLock.acquire()
			workQueue.put(servo + value)
			queueLock.release()
			return jsonify({'status': 'OK' })
		else:
			return jsonify({'status': 'Error','msg':'Arduino not connected'})
	else:
		return jsonify({'status': 'Error','msg':'Unable to read POST data'})

if __name__ == '__main__':
    #app.run()
    app.run(debug=False, host='0.0.0.0')
