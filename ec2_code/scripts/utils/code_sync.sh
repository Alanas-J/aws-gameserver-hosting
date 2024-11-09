#!/usr/bin/env bash

echo '== Starting s3 sync... =='
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/
shopt -s globstar; # <---- allows for /**/ to be used in paths
chmod +x /opt/gameserver/**/*.sh; # Adding execution permissions for every shell file
echo '== Sync complete! =='

echo '== Building node app... =='
npm --prefix /opt/gameserver install
npm --prefix /opt/gameserver run build
echo '== Complete! =='
