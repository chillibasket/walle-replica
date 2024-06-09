#!/bin/bash

# Update
echo "--------------------------------------------"
echo "Installing Command Line Tools"
echo "--------------------------------------------"
sudo apt-get update

# Install text to speech tools
sudo apt-get install -y espeak-ng
sudo apt-get install -y rubberband-cli

# Install python libraries
echo " "
echo "--------------------------------------------"
echo "Installing Python Libraries"
echo "--------------------------------------------"
sudo apt-get install -y python3-pygame
sudo apt-get install -y python3-serial
sudo apt-get install -y python3-flask
sudo apt-get install -y python3-picamera2
sudo apt-get install -y python3-waitress

# Modify the service file directory path
echo " "
echo "--------------------------------------------"
echo "Setting Automatic Start of Web Interface"
echo "--------------------------------------------"
sudo cp ./web_interface/walle.service /etc/systemd/system/walle.service
BASEDIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
USERNAME="$( logname )"
sudo sed -i -e 's\username\'"$USERNAME"'\g' /etc/systemd/system/walle.service
sudo sed -i -e 's\/path-to-directory\'"$BASEDIR"'\g' /etc/systemd/system/walle.service
echo "Created systemd service file"

# Set up the service to start on boot
sudo chmod 644 /etc/systemd/system/walle.service
sudo systemctl daemon-reload
sudo systemctl enable walle.service
sudo systemctl start walle.service
echo "Started the service"

echo " "
echo "Installation complete - please check the logs above to see if there were any errors"
echo "To view the webserver on the Raspberry Pi: http://localhost:5000"
echo "From other computers on the same WiFi, the webserver can be accessed at: $( hostname -I | awk '{print $1;}' ):5000"