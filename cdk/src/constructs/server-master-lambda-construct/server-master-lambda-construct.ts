import { Duration } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { FunctionUrlAuthType, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path = require("path");


export class ServerMasterLambdaConstruct extends Construct {
    lambdaFunction: NodejsFunction

    constructor(parent: Construct, vpc: Vpc) {
        super(parent, 'ServerMasterLambdaConstruct')

        this.lambdaFunction = new NodejsFunction(this, 'Lambda', {
            entry: path.resolve(__dirname, '../../lambda_code/gameserver-master-lambda/index.ts'),
            functionName: 'gameserver-master-lambda',
            handler: 'handler',
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            vpc,
            allowPublicSubnet: true,
            allowAllOutbound: false,
            // reservedConcurrentExecutions: 1 // disabled since my account is at 10 so I can't reserve/limit this lambda
            
        })
        this.lambdaFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            invokeMode: InvokeMode.RESPONSE_STREAM
        })
    }
}
