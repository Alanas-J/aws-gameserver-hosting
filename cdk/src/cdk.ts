#!/usr/bin/env node
import { CfnOutput } from "aws-cdk-lib"
import { Stack } from "aws-cdk-lib"
import { App } from "aws-cdk-lib"
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2"

const app = new App()
export const gameServerStack = new Stack(app, 'GameServerStack', {
    description: 'Gameserver hosting on AWS.'
})

const vpc = new Vpc(gameServerStack, 'VPC', {
    vpcName: 'GameServerVPC',
    cidr: '10.0.255.0/24', // Arbitrary choice, can be expanded for space for a fleet of instances.
    subnetConfiguration: [
        {
            name: 'GameServerPublicSubnet',
            cidrMask: 28, // 16 hosts
            subnetType: SubnetType.PUBLIC,
        }
    ]
})

new CfnOutput(gameServerStack, 'HelloWorld', { value: 'Hello world, a pointless cloudformation output!'})
