import { Construct } from "constructs";
import { BlockPublicAccess, Bucket, BucketAccessControl } from "aws-cdk-lib/aws-s3";
import { stackConfig } from "../../stack-config";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { RemovalPolicy } from "aws-cdk-lib";


export class S3StorageConstruct extends Construct {
    s3Bucket: Bucket

    constructor(parent: Construct) {
        super(parent, 'S3Storage')

        this.s3Bucket = new Bucket(this, 'Bucket', {
            publicReadAccess: false,
            removalPolicy: stackConfig.S3_BUCKET_REMOVAL_POLICY,
            autoDeleteObjects: stackConfig.S3_BUCKET_REMOVAL_POLICY === RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL
        });
        
        new BucketDeployment(this, 'BucketServerCodeDeploy', {
            sources: [
                Source.asset('../ec2_code', {
                    exclude: ['dist/**', 'node_modules/**', '**/node_modules/**', 'node_modules']
                })
            ],
            destinationBucket: this.s3Bucket,
            destinationKeyPrefix: 'ec2_code'
        });
    }
}
