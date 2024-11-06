#!/usr/bin/env bash

echo $(date)
/opt/gameserver/scripts/utils/code_sync.sh

echo 'Starting node server...'
pm2 start /opt/gameserver/dist --name gameserver-node-app;
