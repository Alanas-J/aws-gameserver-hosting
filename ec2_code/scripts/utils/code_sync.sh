#!/usr/bin/env bash

GAMESERVER_CODE_DIR="/opt/gameserver"

echo '== Starting s3 sync... =='
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ $GAMESERVER_CODE_DIR/
shopt -s globstar; # <---- allows for /**/ to be used in paths
chmod +x $GAMESERVER_CODE_DIR/**/*.sh; # Adding execution permissions for every shell file
echo '== Sync complete! =='

echo '== Building node app... =='
npm --prefix $GAMESERVER_CODE_DIR install
npm --prefix $GAMESERVER_CODE_DIR run build
echo '== Complete! =='
