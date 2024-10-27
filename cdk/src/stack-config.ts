import { RemovalPolicy } from "aws-cdk-lib";

// The CDK does not allow Prefex List referencing by name, so an ID needs to manually be added.
enum IPPrefexLists {
    eu_west1_ec2_instance_conntect_ipv4 = 'pl-0839cc4c195a4e751'
}

export const config = {
    // =========================  DNS Config  ==========================
    // If you want this stack to utilise a domain you've configured in Route 53 for vanity URLs the following is needed:
    ROUTE53_ZONE_ID: '',
    DOMAIN_NAME: 'alanas-j.site',
    // Disable to use the stack without Route 53.
    DISABLE_DNS_MAPPING: false,


    // ========================= S3 Bucket Config ======================
     // If the stack is destroyed what to do with the S3 Bucket.
     // Retain saves any existing potential save files.
    S3_BUCKET_REMOVAL_POLICY: RemovalPolicy.RETAIN,


    // ===================== EC2 Instance Config =======================
    // Static IPs cost $0.005 per hour.
    // The only reason to keep static IPs is if not using a DNS mapping.
    REMOVE_STATIC_IP_ON_IDLE: true,
    // Needs to be configured to your specific region to allow SSH connection.
    REGIONAL_EC2_INSTANCE_CONNECT_PREFIX_LIST: IPPrefexLists.eu_west1_ec2_instance_conntect_ipv4,

    // ======================= Optional Extras =========================
    extras: {
        LAMBDA_VANITY_URL: {
            // This creates a CloudFront distribution with the vanity URL that uses our lambda as a source.
            // As there is no direct way to configure a Route 53 alias onto a lambda url.
            // Another way is to use API Gateway, which has a monthly upfront cost of at least 1.11$.
            // Must be enabled on second deploy (as function url needs to be manually added to the config.)
            ENABLED: false, 
            SUBDOMAIN: 'gamemaster', // will become 'https://<LAMBDA_SUBDOMAIN_NAME>.<DOMAIN_NAME>/
            CLOUDFRONT_SSL_CERTIFICATE_ARN: '', // Created via Certificate Manager in us-east-1.
            LAMBDA_URL_ORIGIN: 'fnazecmthgh3kg6jvj4diegnri0mxxle.lambda-url.eu-west-1.on.aws' // must be manually copy/pasted.
        }
    }
}


export const serverInstances: GameserverConfig[] = [
    {
        name: 'minecraft',
        startOnNextBoot: 'minecraft',
        instanceType: 't4g.micro', // $0.0084 per hour / $0.20 per day, safe to test with.
        ssdStorageCapacityGiB: 5 // $0.44 per month
    }
]


interface GameserverConfig {
    // Used to identify the specific instance + becomes the subdomain name.
    // WARNING: name changes will recreate the instance deleting files.
    name: string 
    // Game hosted on the instance, deploying a new game string + restarting the instance will swap servers.
    startOnNextBoot: 'minecraft' | 'factorio'
    // On first load of a specific server will pull server files from S3, instead of a fresh install.
    initFromS3?: string
    // What type of instance to use.
    instanceType: string
    // Storage
    ssdStorageCapacityGiB: number
}
