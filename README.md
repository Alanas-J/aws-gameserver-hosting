# AWS Game Server Hosting Project
Readme will be filled later...


## Useful instance shell commands:


```bash
# All as ec2-user:

# For debugging gameserver / temporarily stopping it for manual intervention.
sudo systemctl stop gameserver
sudo systemctl start gameserver
sudo systemctl status gameserver

# Running the Node.js server / attached to your current terminal as the gameserver user.
sudo -su gameserver-user GAMESERVER_SERVER_FILES_DIR="/opt/server_files" GAMESERVER_VAR_DIR="/var/gameserver" node /opt/gameserver/dist/bundle.js

# Performing a manual code sync
sudo -su gameserver-user /opt/gameserver/scripts/utils/code_sync.sh

```
