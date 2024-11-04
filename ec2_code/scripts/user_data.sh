#!/bin/bash

echo 'Installing Node...'
sudo dnf install -y nodejs # May want to replace later with a specified Node.js version if bugs occur.


echo 'Installing PM2...'
sudo npm install -g pm2


echo 'Starting s3 sync...'
# @TODO: May want to detect the S3 bucket instead of hardcoding
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/
chmod +x /opt/gameserver/*.sh
echo 'Sync complete!'


# Not configured yet
echo 'Adding startup script to crontab...'
echo "@reboot /path/to/your/script.sh >> /path/to/logfile.log 2>&1" | crontab -


# pm2 start will go here...