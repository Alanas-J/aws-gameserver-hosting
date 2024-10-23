#!/usr/bin/env node
import { CfnOutput } from "aws-cdk-lib"
import { Stack } from "aws-cdk-lib"
import { App } from "aws-cdk-lib"

const app = new App()
export const gameServerStack = new Stack(app, 'GameServerStack', {
    description: 'Gameserver hosting on AWS.'
})

new CfnOutput(gameServerStack, 'HelloWorld', { value: 'Hello world, a pointless cloudformation output!'})
