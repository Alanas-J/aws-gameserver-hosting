import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");


export class ServerMasterLambdaConstruct extends Construct {
    lambdaFunction: NodejsFunction

    constructor(parent: Construct) {
        super(parent, 'ServerMasterLambdaConstruct')

        this.lambdaFunction = new NodejsFunction(this, 'Lambda', {
            entry: path.resolve(__dirname, '../../lambda_code/gamerserver-master-lambda/index.ts'),
            functionName: 'gameserver-master-lambda',
            handler: 'handler',
            runtime: Runtime.NODEJS_20_X,
        })
    }
}
