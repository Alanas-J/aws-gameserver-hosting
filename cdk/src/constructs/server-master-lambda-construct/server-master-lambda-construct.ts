import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { AllowedMethods, CachePolicy, Distribution, OriginProtocolPolicy, PriceClass, SecurityPolicyProtocol, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { FunctionUrl, FunctionUrlAuthType, InvokeMode, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import path = require("path");
import { stackConfig } from "../../stack-config";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { ARecord, PublicHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";


export class ServerMasterLambdaConstruct extends Construct {
    lambdaFunction: NodejsFunction
    functionUrl: FunctionUrl
    lambdaRole: Role
    lambdaARecord?: ARecord 

    constructor(parent: Construct) {
        super(parent, 'ServerMasterLambdaConstruct')

        this.lambdaRole = new Role(this, 'LambdaRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ],
        });
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
                'ec2:RebootInstances',
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
            role: this.lambdaRole,
            environment: {
                AUTH_PASSWORD: stackConfig.LAMBDA_PASSWORD
            }
            // reservedConcurrentExecutions: 1 // @TODO: disabled since my account is at 10 concurrency so I can't reserve/limit this lambda

        })

        this.functionUrl = this.lambdaFunction.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            invokeMode: InvokeMode.BUFFERED,
            cors: {
                allowedOrigins: ['*'],
                allowedHeaders: ['*']
            }
        })
        new CfnOutput(this, 'FunctionUrl', { value: this.functionUrl.url })


        if (stackConfig.ENABLE_ROUTE_53_MAPPING && stackConfig.LAMBDA_VANITY_URL.ENABLED) {
            this.#provisionLambdaCloudFrontVanity()
        }
    }


    #provisionLambdaCloudFrontVanity() {
        // Cloudfront needs to front the lambda URL as AWS doesn't support
        // attaching alias records onto function urls directly.
        // A Cloudfront distrubution is the cheapest way
        // API Gateway HTTP is $1.11 per month past the first year.
        const distribution = new Distribution(this, 'LambdaCloudfront', {
            certificate: Certificate.fromCertificateArn(this, 'DomainCertLookup', stackConfig.LAMBDA_VANITY_URL.CLOUDFRONT_SSL_CERTIFICATE_ARN),
            domainNames: [`${stackConfig.LAMBDA_VANITY_URL.SUBDOMAIN}.${stackConfig.DOMAIN_NAME}`],
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_1_2016,
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 404,
                    responsePagePath: '/cloudfront_error',
                    ttl: Duration.minutes(30)
                }
            ],
            defaultBehavior: {
                origin: new HttpOrigin(stackConfig.LAMBDA_VANITY_URL.LAMBDA_URL_ORIGIN, {
                    protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
                }),
                allowedMethods: AllowedMethods.ALLOW_ALL,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: new CachePolicy(this, 'CachePolicy', {
                    maxTtl: Duration.seconds(10),
                    defaultTtl: Duration.seconds(10)
                })
            },
            priceClass: PriceClass.PRICE_CLASS_100,
            comment: '(Optional) Gameserver Lambda Distro to allow subdomain mapping.'
        });
    
        const publicHostedZone = PublicHostedZone.fromHostedZoneAttributes(this, 'DomainZoneLookup', { hostedZoneId: stackConfig.ROUTE53_ZONE_ID, zoneName: stackConfig.DOMAIN_NAME})
        this.lambdaARecord = new ARecord(this, 'LambdaAliasRecord', {
            zone: publicHostedZone,
            recordName: `${stackConfig.LAMBDA_VANITY_URL.SUBDOMAIN}.${stackConfig.DOMAIN_NAME}`,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
        });
    }
}
