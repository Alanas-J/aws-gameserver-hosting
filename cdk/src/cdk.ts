#!/usr/bin/env node
import { Stack } from "aws-cdk-lib"
import { App } from "aws-cdk-lib"
import { IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2"
import { ServerMasterLambdaConstruct } from "./constructs/server-master-lambda-construct/server-master-lambda-construct"

const app = new App()
export const gameServerStack = new Stack(app, 'GameServerStack', {
    description: 'Gameserver hosting on AWS.'
})

const vpc = new Vpc(gameServerStack, 'VPC', {
    vpcName: 'GameServerVPC',
    ipAddresses: IpAddresses.cidr('10.0.255.0/24'), // Arbitrary choice, can be expanded for space for a fleet of instances.
    subnetConfiguration: [
        {
            name: 'GameServerPublicSubnet',
            cidrMask: 28, // 16 hosts
            subnetType: SubnetType.PUBLIC,
        }
    ],
    maxAzs: 1,
    natGateways: 0
})

const serverMasterLambdaConstruct = new ServerMasterLambdaConstruct(gameServerStack, vpc)

