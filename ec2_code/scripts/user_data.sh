#!/bin/bash
# WARNING: Changing this script and deploying terminates/recreates all provisioned instances.

GAMESERVER_USER="gameserver-user"
GAMESERVER_CODE_DIR="/opt/gameserver"
GAMESERVER_SERVER_FILES_DIR="/opt/server_files"
GAMESERVER_VAR_DIR="/var/gameserver"


echo '0: Updating DNF... ==================================================================================='
dnf update


echo '1: Installing Node... ================================================================================'
dnf install -y nodejs # May want to replace later with a specified Node.js version if bugs occur.


echo '2: Server User + Directory Setup... =================================================================='
useradd -r -m -d "/home/$GAMESERVER_USER" -s /usr/sbin/nologin "$GAMESERVER_USER"
mkdir -p $GAMESERVER_CODE_DIR
chown -R $GAMESERVER_USER:$GAMESERVER_USER $GAMESERVER_CODE_DIR
mkdir -p $GAMESERVER_SERVER_FILES_DIR
chown -R $GAMESERVER_USER:$GAMESERVER_USER $GAMESERVER_SERVER_FILES_DIR
mkdir -p $GAMESERVER_VAR_DIR/logs
chown -R $GAMESERVER_USER:$GAMESERVER_USER $GAMESERVER_VAR_DIR


echo '3: Initial S3 pull... ================================================================================'
# @TODO: May want to detect the S3 bucket instead of hardcoding
sudo -u $GAMESERVER_USER aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ $GAMESERVER_CODE_DIR/
shopt -s globstar # <---- allows for /**/ to be used in paths
chmod +x $GAMESERVER_CODE_DIR/**/*.sh # Adding execution permissions for every shell file


echo '4: Installing and configuring Cloudwatch Agent... ===================================================='
yum install -y amazon-cloudwatch-agent
amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:$GAMESERVER_CODE_DIR/cloudwatch-config.json


echo '5: Server systemd configuration... ==================================================================='
SERVICE_NAME="gameserver-node-http-server"

echo "Creating systemd service file for $SERVICE_NAME..."
bash -c "cat <<EOL > /etc/systemd/system/$SERVICE_NAME.service
[Unit]
Description=Gameserver's HTTP node app / gameserver controller.
After=network.target

[Service]
ExecStartPre=/bin/bash -c \"$GAMESERVER_CODE_DIR/scripts/utils/code_sync.sh >> $GAMESERVER_VAR_DIR/logs/code_sync.log 2>&1\"
ExecStart=/usr/bin/node $GAMESERVER_CODE_DIR/dist/index.js
WorkingDirectory=$GAMESERVER_CODE_DIR
Restart=always
RestartSec=10 
User=$GAMESERVER_USER
Environment=PATH=/usr/bin:/usr/local/bin
Environment=GAMESERVER_CODE_DIR=$GAMESERVER_CODE_DIR
Environment=GAMESERVER_VAR_DIR=$GAMESERVER_VAR_DIR
TimeoutStopSec=60 

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



echo '====================================== EC2 INSTALL COMPLETE =========================================='
