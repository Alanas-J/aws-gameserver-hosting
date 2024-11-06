#!/bin/bash

echo '0: Updating DNF... ===================================================================================';
dnf update;

echo '1: Installing Node... ================================================================================';
dnf install -y nodejs; # May want to replace later with a specified Node.js version if bugs occur.


echo '2: Installing PM2... =================================================================================';
npm install -g pm2@latest;


echo '3: Starting s3 sync... ===============================================================================';
# @TODO: May want to detect the S3 bucket instead of hardcoding
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/;
# Adding execution permissions for every shell file
shopt -s globstar; # <---- allows for /**/ to be used in paths
chmod +x /opt/gameserver/**/*.sh;
echo 'Sync complete!';


echo '4: Installing crontab and adding startup script to crontab... ========================================';
dnf install -y cronie
systemctl start crond;
systemctl enable crond;
(sudo -u ec2-user crontab -l 2>/dev/null; echo "@reboot /opt/gameserver/scripts/boot_script.sh >> /var/log/boot_script.log 2>&1") | sudo -u ec2-user crontab -;

echo '5: Installing and configuring Cloudwatch Agent (not implemented)...';
# @TODO: Install CloudWatch Agent.

# pm2 start will go here...
echo '6: Installing, Building and Starting Node server... ==================================================';
npm --prefix /opt/gameserver install;
npm --prefix /opt/gameserver run build;
sudo -u ec2-user pm2 start /opt/gameserver/dist --name gameserver-node-app;
