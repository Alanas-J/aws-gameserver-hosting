#!/bin/bash

echo 'starting s3 sync...'
aws s3 sync s3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/ec2_code/ /opt/gameserver/
chmod +x /opt/gameserver/*.sh
echo 'sync complete!'
