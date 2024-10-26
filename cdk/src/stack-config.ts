import { RemovalPolicy } from "aws-cdk-lib";

export const config = {
    // =========================  DNS Config  ==========================
    // If you want this stack to utilise a domain you've configured in Route 53 for vanity URLs.
    ROUTE53_ZONE_ID: '',
    DOMAIN_NAME: 'alanas-j.site',


    // ========================= S3 Bucket Config ======================
     // If the stack is destroyed what to do with the S3 Bucket.
     // Retain saves any existing potential save files.
    S3_BUCKET_REMOVAL_POLICY: RemovalPolicy.RETAIN,


    // ===================== EC2 Instance Config =======================
    // Static IPs cost $0.005 per hour.
    // The only reason to not own an OP
    REMOVE_STATIC_IP_ON_IDLE: true,


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
        ssdStorageCapacityGB: 5 // $0.40 per month
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
    ssdStorageCapacityGB: number
}
