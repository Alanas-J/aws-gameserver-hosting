import { RemovalPolicy } from "aws-cdk-lib";
import { GameserverConfig, IPPrefixLists, MinecraftJavaConfig } from "./stack-config-types";
import { CLOUDFRONT_SSL_CERTIFICATE_ARN, GAMEMASTER_LAMBDA_PASSWORD, IV_FULL_PASSWORD, IV_START_PASSWORD, MINECRAFT_FULL_PASSWORD, MINECRAFT_START_PASSWORD, ROUTE53_ZONE_ID } from "./personal_config";

// Server instances the stack will create
export const serverInstances: GameserverConfig[] = [
    {
        logicalId: 'VanillaMC',
        name: 'minecraft',
        startOnNextBoot: 'minecraft-java',
        instanceType: 'c6a.xlarge',
        config: { 
            minecraftServerJarUrl: 'https://api.papermc.io/v2/projects/paper/versions/1.21.3/builds/81/downloads/paper-1.21.3-81.jar'
        },
        passwords: {
            instanceStart: MINECRAFT_START_PASSWORD,
            full: MINECRAFT_FULL_PASSWORD
        },
        ssdStorageCapacityGiB: 8 // $0.64 per month; 8GB expected just for the EC2 Amazon Linux snapshot.
    } as MinecraftJavaConfig,
    {
        logicalId: 'IndustrialVillageMC',
        name: 'industrial-village-mc',
        startOnNextBoot: 'minecraft-java',
        instanceType: 'c6a.xlarge',
        config: { 
            installFromS3Url: 's3://gameserverstack-s3storagebucketcf59ebf7-hidmmd95ycsc/server_backups/minecraft/industrial_village_1.20.1',
            startScriptPath: '/run.sh'
        },
        passwords: {
            instanceStart: IV_START_PASSWORD,
            full: IV_FULL_PASSWORD
        },
        ssdStorageCapacityGiB: 8 // $0.64 per month; 8GB expected just for the EC2 Amazon Linux snapshot.
    } as MinecraftJavaConfig,
]

export const stackConfig = {
    // If the stack is destroyed what to do with the S3 Bucket (server files may be backed up to this S3).
    S3_BUCKET_REMOVAL_POLICY: RemovalPolicy.RETAIN, 

    // Needs to be configured to your specific region to allow EC2 Instance Connect SSH connection.
    REGIONAL_EC2_INSTANCE_CONNECT_PREFIX_LIST: IPPrefixLists.eu_west1_ec2_instance_conntect_ipv4,

    // If you want this stack to utilise a Route 53 managed domain configure the following.
    // This will provide subdomains for the EC2 instances.
    ENABLE_ROUTE_53_MAPPING: true,
    ROUTE53_ZONE_ID: ROUTE53_ZONE_ID,
    DOMAIN_NAME: 'alanas-j.site',

    // The password to allow the start/stopping of all instances.
    MASTER_PASSWORD: GAMEMASTER_LAMBDA_PASSWORD,

    // Only applies if ENABLE_ROUTE_53_MAPPING is true.
    LAMBDA_VANITY_URL: {
        // This creates a CloudFront distribution with the vanity URL that uses our lambda as a source.
        // As there is no direct way to configure a Route 53 alias onto a lambda url.
        // Another way is to use API Gateway, which has a monthly upfront cost of at least 1.11$.
        // Must be enabled on second deploy (as function url needs to be manually added to the config.)
        ENABLED: false, 
        SUBDOMAIN: 'gamemaster', // will become 'https://<LAMBDA_SUBDOMAIN_NAME>.<DOMAIN_NAME>/
        CLOUDFRONT_SSL_CERTIFICATE_ARN: CLOUDFRONT_SSL_CERTIFICATE_ARN, // Created via Certificate Manager in us-east-1.
        LAMBDA_URL_ORIGIN: 'fnazecmthgh3kg6jvj4diegnri0mxxle.lambda-url.eu-west-1.on.aws' // must be manually copy/pasted.
    }
}
