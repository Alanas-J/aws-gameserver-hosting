import { Construct } from "constructs";
import { BlockPublicAccess, Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { config } from "../../stack-config";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy } from "aws-cdk-lib";
import { GatewayVpcEndpoint, GatewayVpcEndpointAwsService, InterfaceVpcEndpoint, Vpc } from "aws-cdk-lib/aws-ec2";


export class S3StorageConstruct extends Construct {
    s3Bucket: Bucket
    vpcS3Endpoint: GatewayVpcEndpoint

    constructor(parent: Construct, vpc: Vpc) {
        super(parent, 'S3Storage')

        this.s3Bucket = new Bucket(this, 'Bucket', {
            bucketName: `gameserver-s3-storage-bucket`,
            publicReadAccess: false,
            removalPolicy: config.S3_BUCKET_REMOVAL_POLICY,
            autoDeleteObjects: config.S3_BUCKET_REMOVAL_POLICY === RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL
        })
        new BucketDeployment(this, 'BucketDeploy', {
            sources: [Source.asset('../ec2_code')], // @TODO: Configure path to build output.
            destinationBucket: this.s3Bucket,
            destinationKeyPrefix: 'ec2_code'
        });

        this.vpcS3Endpoint = new GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
            vpc,
            service: GatewayVpcEndpointAwsService.S3
        })
    }
}
