
export const config = {
    // =========================  DNS Config  ==========================
    // If you want this stack to utilise a domain you've configured in Route 53 for vanity URLs.
    ROUTE53_ZONE_ID: '',
    DOMAIN_NAME: 'alanas-j.site',

    // ===================== EC2 Instance Config =======================


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
