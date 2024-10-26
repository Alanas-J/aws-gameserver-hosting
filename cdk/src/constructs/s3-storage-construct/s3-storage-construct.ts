import { Construct } from "constructs";
import { BlockPublicAccess, Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { config } from "../../stack-config";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy } from "aws-cdk-lib";


export class S3StorageConstruct extends Construct {
    s3Bucket: Bucket

    constructor(parent: Construct) {
        super(parent, 'S3Storage')

        this.s3Bucket = new Bucket(this, 'Bucket', {
            publicReadAccess: false,
            removalPolicy: config.S3_BUCKET_REMOVAL_POLICY,
            autoDeleteObjects: config.S3_BUCKET_REMOVAL_POLICY === RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL
        });
        
        new BucketDeployment(this, 'BucketDeploy', {
            sources: [Source.asset('../ec2_code')], // @TODO: Configure path to build output.
            destinationBucket: this.s3Bucket,
            destinationKeyPrefix: 'ec2_code'
        });
    }
}
