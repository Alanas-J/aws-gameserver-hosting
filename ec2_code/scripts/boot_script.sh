#!/bin/bash

/opt/gameserver/scripts/utils/code_sync.sh

echo 'Starting node server...'
pm2 start /opt/gameserver/node_server --name gameserver-node-app
