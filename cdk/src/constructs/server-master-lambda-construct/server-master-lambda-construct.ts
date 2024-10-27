import { CfnOutput, Duration } from "aws-cdk-lib";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { FunctionUrl, FunctionUrlAuthType, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import path = require("path");


export class ServerMasterLambdaConstruct extends Construct {
    lambdaFunction: NodejsFunction
    functionUrl: FunctionUrl
    securityGroup: SecurityGroup

    constructor(parent: Construct, vpc: Vpc) {
        super(parent, 'ServerMasterLambdaConstruct')

        this.securityGroup = new SecurityGroup(this, 'SecurityGroup', {
            vpc,
            allowAllOutbound: false, // Lambda in a public subnet can't reach the internet anyway.
            description: 'Server Master Lambda Security Group',
        });

        this.lambdaFunction = new NodejsFunction(this, 'Lambda', {
            entry: path.resolve(__dirname, '../../lambda_code/gameserver-master-lambda/index.ts'),
            functionName: 'gameserver-master-lambda',
            handler: 'handler',
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(30),
            logRetention: RetentionDays.ONE_WEEK,
            vpc,
            securityGroups: [this.securityGroup],
            allowPublicSubnet: true,
            // @TODO: Remove when not relevant; Temp bugfix for CDK issue 30717; esbuild has new defaults that break deploys.
            bundling: {
                esbuildArgs: {
                    "--packages": "bundle",
                },
            },
            // reservedConcurrentExecutions: 1 // @TODO: disabled since my account is at 10 concurrency so I can't reserve/limit this lambda 
        })

        this.functionUrl = this.lambdaFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            invokeMode: InvokeMode.BUFFERED,
            // CORS rules can be implemented here
        })

        new CfnOutput(this, 'FunctionUrl', { value: this.functionUrl.url })   
    }
}
