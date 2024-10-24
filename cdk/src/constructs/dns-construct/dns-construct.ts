import { ARecord, IPublicHostedZone, PublicHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { AllowedMethods, CachePolicy, Distribution, OriginProtocolPolicy, PriceClass, SecurityPolicyProtocol, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { Duration } from "aws-cdk-lib";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { DOMAIN_NAME, LAMBDA_SUBDOMAIN_NAME, LAMBDA_URL_ORIGIN } from "../../stack-config";
import { CLOUDFRONT_SSL_CERTIFICATE_ARN, ROUTE53_ZONE_ID } from "../../personal_config";


export class DNSConstruct extends Construct {
    publicHostedZone: IPublicHostedZone
    lambdaARecord: ARecord
    instanceARecords: ARecord[]

    constructor(parent: Construct) {
        super(parent, 'DNSConstruct')

        this.publicHostedZone = PublicHostedZone.fromHostedZoneAttributes(this, 'DomainZoneLookup', { hostedZoneId: ROUTE53_ZONE_ID, zoneName: DOMAIN_NAME})
    
        // Cloudfront needs to front the lambda URL as AWS doesn't support
        // attaching alias records onto function urls directly.
        // A Cloudfront distrubution is the cheapest way
        // API Gateway HTTP is $1.11 per month past the first year.
        const distribution = new Distribution(this, 'LambdaCloudfront', {
            certificate: Certificate.fromCertificateArn(this, 'DomainCertLookup', CLOUDFRONT_SSL_CERTIFICATE_ARN),
            domainNames: [`${LAMBDA_SUBDOMAIN_NAME}.${DOMAIN_NAME}`],
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
                origin: new HttpOrigin(LAMBDA_URL_ORIGIN, {
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
    
        this.lambdaARecord = new ARecord(this, 'LambdaAliasRecord', {
            zone: this.publicHostedZone,
            recordName: `${LAMBDA_SUBDOMAIN_NAME}.${DOMAIN_NAME}`,
            target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
        });
    }
}
