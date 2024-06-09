"""
Simple class to start a camera stream using PI Camera 2

Note: only cameras connected to the Raspberry Pi via the 
CSI ribbon cable work; USB webcameras are unfortunately
not supported by this code.
"""

import io
import logging
import socketserver
from http import server
from threading import Thread, Condition, Event
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput


PAGE = """\
<html>
<head>
<title>picamera2 MJPEG stream</title>
</head>
<body>
<h1>Picamera2 MJPEG Streaming</h1>
<img src="stream.mjpg" width="640" height="480" />
</body>
</html>
"""


# ================================================================
class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()


output: StreamingOutput = StreamingOutput()


# ================================================================
class StreamingHandler(server.BaseHTTPRequestHandler):
    """Handle the web server requests"""
    
    def do_GET(self):
        if self.path == '/':
            self.send_response(301)
            self.send_header('Location', '/index.html')
            self.end_headers()
        elif self.path == '/index.html':
            content = PAGE.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        elif self.path == '/stream.mjpg':
            self.send_response(200)
            self.send_header('Age', 0)
            self.send_header('Cache-Control', 'no-cache, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Content-Type', 'multipart/x-mixed-replace; boundary=FRAME')
            self.end_headers()
            try:
                while True:
                    with output.condition:
                        output.condition.wait()
                        frame = output.frame
                    self.wfile.write(b'--FRAME\r\n')
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Length', len(frame))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
            except Exception as e:
                logging.warning(
                    'Removed streaming client %s: %s',
                    self.client_address, str(e))
        else:
            self.send_error(404)
            self.end_headers()


# ================================================================
class StreamingServer(socketserver.ThreadingMixIn, server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


# ================================================================
class PiCameraStreamer:
    """Class to manage starting and stopping the Pi Camera stream"""

    stream_active: bool = False
    stream_thread: Thread | None = None
    picam2: Picamera2 | None = None
    #output: StreamingOutput | None = None
    streaming_server: StreamingServer | None = None

    def __init__(self):
        """Constructor"""
        pass

    # ------------------------------------------------------------
    def is_stream_active(self) -> bool:
        """
        Check if the stream is active
        :return: True is camera stream is active, False otherwise
        """
        global output
        return (self.stream_active and self.picam2 is not None and output is not None 
            and self.streaming_server is not None and self.stream_thread is not None)

    # ------------------------------------------------------------
    def start_stream(self) -> (bool, str):
        """
        Start the camera stream
        :return: True if camera is now active, False otherwise
        """
        error = ""
        global output

        try:
            if self.stop_stream():
                self.picam2 = Picamera2()
                output = StreamingOutput()

                self.picam2.configure(self.picam2.create_video_configuration(main={"size": (640, 480)}))
                self.picam2.set_controls({"FrameDurationLimits":(33333,100000),"ExposureValue":6.0, "Brightness":0.1})
                self.picam2.start_recording(MJPEGEncoder(), FileOutput(output))

                address = ('', 8080)
                self.streaming_server = StreamingServer(address, StreamingHandler)
                self.stream_thread = Thread(target = self.__stream_thread)
                self.stream_thread.start()
                self.stream_active = True

        except Exception as ex:
            error = repr(ex)
            logging.error(f'Failed to start PiCamera2 stream: {repr(ex)}')
            self.stop_stream()

        return (self.is_stream_active(), error)

    # ------------------------------------------------------------
    def stop_stream(self) -> bool:
        """
        Stop the camera stream
        :return: True if camera stream has stopped, False otherwise
        """
        try:
            global output
            
            if self.picam2 is not None:
                self.picam2.stop_recording()
                self.picam2.close()
                self.picam2 = None
                
            if self.streaming_server is not None:
                self.streaming_server.shutdown()
                self.streaming_server.server_close()
                self.streaming_server = None

            if self.stream_thread is not None:
                self.stream_thread.join(1)
                self.stream_thread = None
                self.stream_active = False

            output = None
            
        except Exception as ex:
            print(repr(ex))
            logging.error(f'Failed to stop PiCamera2 stream: {repr(ex)}')

        return not self.is_stream_active()

    # ------------------------------------------------------------
    def __stream_thread(self):
        """Run the streaming server in a thread"""
        try:
            self.streaming_server.serve_forever()
        except KeyboardInterrupt:
            pass


"""
if not streaming and :

        thread = Thread(target = streamer_thread)
        thread.start()
        streaming = 1
        return 0
        # Check, if service is already running
        #result = subprocess.run(['systemctl', 'is-active', "--quiet", "camera-streamer"])
        #if (result.returncode == 0):
        #    streaming = 1
        #    return 0

        # Turn on stream
        #subprocess.run(['sudo', 'systemctl', 'start', "--quiet", "camera-streamer"])
        # ... and check again
        #result = subprocess.run(['systemctl', 'is-active', "--quiet", "camera-streamer"])

        #if (result.returncode == 0):
        #    streaming = 1
        #    return 0
        #else:
        #    return 1

    else:
        return 0
        # Turn off stream
        #result = subprocess.run(['sudo', 'systemctl', 'stop', "--quiet", "camera-streamer"])
        #if (result.returncode == 0):
        #    streaming = 0
        #    return 0
        #else:
        #    return 1
        """
