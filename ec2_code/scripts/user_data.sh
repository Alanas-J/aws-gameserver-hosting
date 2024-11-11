#!/bin/bash
# WARNING: changing this script and deploying terminates all provisioned instances.

echo '0: Updating DNF... ==================================================================================='
dnf update;


echo '1: Installing Node... ================================================================================'
dnf install -y nodejs # May want to replace later with a specified Node.js version if bugs occur.


echo '2: Directory Setup... ================================================================================'
# Making ec2_user own all of this here for now
mkdir -p /opt/gameserver
chown ec2-user:ec2-user /opt/gameserver
mkdir -p /opt/server_files
chown ec2-user:ec2-user /opt/server_files
mkdir -p /var/gameserver
chown ec2-user:ec2-user /var/gameserver
mkdir -p /var/gameserver/logs
chown ec2-user:ec2-user /var/gameserver/logs


echo '3: Server systemd configuration... ==================================================================='
SERVICE_NAME="gameserver-node-http-server"
NODE_APP_DIR="/opt/gameserver"

echo "Creating systemd service file for $SERVICE_NAME..."
bash -c "cat <<EOL > /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Gameserver's HTTP node app / gameserver controller.
After=network.target

[Service]
ExecStartPre=$NODE_APP_DIR/scripts/utils/code-sync.sh
ExecStart=/usr/bin/node $NODE_APP_DIR/dist/index.js
WorkingDirectory=$NODE_APP_DIR
Restart=always
User=ec2-user
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL"

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Enabling $SERVICE_NAME to start on boot..."
systemctl enable "$SERVICE_NAME"

echo "Starting $SERVICE_NAME..."
systemctl start "$SERVICE_NAME"

echo "Checking status of $SERVICE_NAME..."
systemctl status "$SERVICE_NAME" --no-pager


echo '4: Installing and configuring Cloudwatch Agent... ===================================================='
yum install -y amazon-cloudwatch-agent
amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/gameserver/cloudwatch-config.json


echo '====================================== EC2 INSTALL COMPLETE =========================================='
