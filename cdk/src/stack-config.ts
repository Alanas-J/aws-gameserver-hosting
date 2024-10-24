
// =========================  DNS Config  ==========================
// If you want this stack to utilise a domain you've configured in Route 53 for vanity URLs.
export const ROUTE53_ZONE_ID = '';
export const DOMAIN_NAME = 'alanas-j.site';

// ===  vanity URL for server master lambda (optional) ===
// Lambda function urls don't integrate directly with Route 53, this stack optionally configures CloudFront to front the lambda, 
// *** this comes with risk of incurring cost from a DDOS attack *** -- I may add a cost failsafe countermeasure in the future.
export const ENABLE_LAMBDA_VANITY_URL = false;

// if enabled -- *mandatory fields*
export const LAMBDA_SUBDOMAIN_NAME = 'gamemaster'; // eg. 'https://<LAMBDA_SUBDOMAIN_NAME>.<DOMAIN_NAME>/
export const CLOUDFRONT_SSL_CERTIFICATE_ARN = '' // This must be created in Certificate Manager in us-east-1 to be used by CloudFront. Easier to configure in console than the CDK.
export const LAMBDA_URL_ORIGIN = 'fnazecmthgh3kg6jvj4diegnri0mxxle.lambda-url.eu-west-1.on.aws' // The URL must be added manually, so the stack needs to be deployed without vanity enabled initially.

// =================================================================

// ======================= Gameserver config ====================

// Keep gameserver IPs static?
// Array of gameservers to deploy []
