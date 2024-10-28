#!/usr/bin/env node
import { Stack } from "aws-cdk-lib"
import { App } from "aws-cdk-lib"
import { ServerMasterLambdaConstruct } from "./constructs/server-master-lambda-construct/server-master-lambda-construct"
import { DNSConstruct } from "./constructs/dns-construct/dns-construct"
import { S3StorageConstruct } from "./constructs/s3-storage-construct/s3-storage-construct"
import { EC2ProvisioningConstruct } from "./constructs/ec2-provisioning-construct/ec2-provisioning-construct"
import { config } from "./stack-config"
import { VpcConstruct } from "./constructs/vpc-construct/vpc-construct"

const app = new App();
export const stack = new Stack(app, 'GameServerStack', {
    description: 'Gameserver hosting on AWS.'
});

const vpcConstruct = new VpcConstruct(stack)
new S3StorageConstruct(stack);

new ServerMasterLambdaConstruct(stack, vpcConstruct.vpc);

new EC2ProvisioningConstruct(stack, vpcConstruct.vpc /* serverMasterLambdaConstruct.securityGroup */)

if (!config.DISABLE_DNS_MAPPING) {
    new DNSConstruct(stack);
}
