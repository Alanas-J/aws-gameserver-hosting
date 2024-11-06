#!/bin/bash
#
echo '0: Updating DNF... ===================================================================================';
dnf update;
#
#
echo '1: Installing Node... ================================================================================';
dnf install -y nodejs; # May want to replace later with a specified Node.js version if bugs occur.
#
#
echo '2: Installing PM2... =================================================================================';
npm install -g pm2@latest;
#
#
echo '3: Initial S3 directory setup... ====================================================================';
mkdir -p /opt/gameserver;
chown ec2-user:ec2-user /opt/gameserver; # Making ec2_user own all of this here for now
# @TODO: May want to detect the S3 bucket instead of hardcoding
sudo -u ec2-user aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/;
shopt -s globstar; # <---- allows for /**/ to be used in paths
chmod +x /opt/gameserver/**/*.sh; # Adding execution permissions for every shell file
#
#
echo '4: Installing crontab and adding startup script to crontab... ========================================';
dnf install -y cronie
systemctl start crond;
systemctl enable crond;
(sudo -u ec2-user crontab -l 2>/dev/null; echo "@reboot sudo sh -c "/opt/gameserver/scripts/boot_script.sh >> /var/log/boot_script.log 2>&1"") | sudo -u ec2-user crontab -;
#
#
echo '5: Installing and configuring Cloudwatch Agent (not implemented)...';
# @TODO: Install CloudWatch Agent.
#
#
echo '6: Installing, Building and Starting Node server... ==================================================';
sudo -u ec2-user npm --prefix /opt/gameserver install;
sudo -u ec2-user npm --prefix /opt/gameserver run build;
sudo -u ec2-user pm2 start /opt/gameserver/dist --name gameserver-node-app;
