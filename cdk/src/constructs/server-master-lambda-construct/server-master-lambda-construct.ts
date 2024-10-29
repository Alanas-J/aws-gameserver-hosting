import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { FunctionUrl, FunctionUrlAuthType, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import path = require("path");


export class ServerMasterLambdaConstruct extends Construct {
    lambdaFunction: NodejsFunction
    functionUrl: FunctionUrl
    lambdaRole: Role

    constructor(parent: Construct, vpc: Vpc) {
        super(parent, 'ServerMasterLambdaConstruct')

        this.lambdaRole = new Role(this, 'LambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ],
        });
        // @TODO: Temporary powers while developing ec2 logic.
        this.lambdaRole.addToPolicy(new PolicyStatement({
            actions: [
                'ec2:DescribeInstances',
            ],
            resources: ['*']
        }));
        this.lambdaRole.addToPolicy(new PolicyStatement({
            actions: [
                'ec2:StartInstances',
                'ec2:StopInstances',
            ],
            resources: ['*'],
            conditions: {
                'StringEquals': {
                    'aws:ResourceTag/aws:cloudformation:stack-id': Stack.of(this).stackId,
                }
            }
        }));

        this.lambdaFunction = new NodejsFunction(this, 'Lambda', {
            entry: path.resolve(__dirname, '../../lambda_code/gameserver-master-lambda/index.ts'),
            functionName: 'gameserver-master-lambda',
            handler: 'handler',
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(60),
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
            // @TODO: Remove when not relevant; Temp bugfix for CDK issue 30717; esbuild has new defaults that break deploys.
            bundling: {
                esbuildArgs: {
                    "--packages": "bundle",
                },
            },
            role: this.lambdaRole
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
