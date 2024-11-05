#!/bin/bash

echo '1: Installing Node...'
sudo dnf install -y nodejs # May want to replace later with a specified Node.js version if bugs occur.


echo '2: Installing PM2...'
sudo npm install -g pm2


echo '3: Starting s3 sync...'
# @TODO: May want to detect the S3 bucket instead of hardcoding
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/
chmod +x /opt/gameserver/*.sh
echo 'Sync complete!'


# Not configured yet
echo '4: Adding startup script to crontab...'
(crontab -l 2>/dev/null; echo "@reboot /opt/gameserver/scripts/boot_script.sh >> /var/log/boot_script.log 2>&1") | crontab -


# Install CloudWatch Agent.

# pm2 start will go here...