#!/usr/bin/env bash

GAMESERVER_CODE_DIR="/opt/gameserver"

echo '== Starting s3 sync... =='
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ $GAMESERVER_CODE_DIR/
shopt -s globstar; # <---- allows for /**/ to be used in paths
chmod +x $GAMESERVER_CODE_DIR/**/*.sh; # Adding execution permissions for every shell file
echo '== S3 sync complete =='

# =====================================
# Swapped to using a code bundle instead (NPM installs were throttled for some reason :/)
# Bundled code may cause more issues
# =====================================
# echo '== Installing node dependencies... =='
# npm --prefix $GAMESERVER_CODE_DIR install --omit=dev --verbose

echo '== Code sync script complete! =='
