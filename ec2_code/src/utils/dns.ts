
/* Temporary module; this will be performed in a dedicated lambda in the future */
import { Route53 } from "aws-sdk";
import { InstanceMetadata } from "./instance-metadata";
import logger from "./logger";


const route53Client = new Route53();

export async function setDNSRecord(action: 'UPSERT' | 'DELETE', instanceMetadata: InstanceMetadata) {
    if (!instanceMetadata.tags.domainName && !instanceMetadata.tags.hostedZone) {
        throw new Error('Instance metadata needs a hosted zone and domain name to set a DNS record for.');
    }
    const fullServerName = `${instanceMetadata.tags.serverName}.${instanceMetadata.tags.domainName}`;

    const params = {
        HostedZoneId: instanceMetadata.tags.hostedZone as string,
        ChangeBatch: {
            Changes: [
                {
                    Action: action,
                    ResourceRecordSet: {
                        Name: fullServerName,
                        Type: 'A',
                        TTL: 300, // 5 minutes TTL
                        ResourceRecords: [{ Value: instanceMetadata.publicIp }]
                    }
                }
            ]
        }
    };

    try {
        logger.info(`Sending ${action} action for ${fullServerName} to Route 53.`);
        const response = await route53Client.changeResourceRecordSets(params).promise();
        logger.info(`${action} success for ${fullServerName} to Route 53.`, { response });
        return response;

    } catch (error: any) {
        logger.error('DNS action failed...', { error });
        throw error;
    }
    
}
