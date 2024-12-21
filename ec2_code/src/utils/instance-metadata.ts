import axios from 'axios';
import logger from './logger';

const METADATA_SERVICE_BASE_URL = 'http://169.254.169.254/latest';
const METADATA_TAGS_URL = `${METADATA_SERVICE_BASE_URL}/meta-data/tags/instance`;
const METADATA_PUBLIC_IP_URL = `${METADATA_SERVICE_BASE_URL}/meta-data/public-ipv4`;
const METADATA_INSTANCE_ID_URL = `${METADATA_SERVICE_BASE_URL}/meta-data/instance-id`;
const METADATA_INSTANCE_REGION_URL = `${METADATA_SERVICE_BASE_URL}/meta-data/placement/region`;

export interface InstanceMetadata {
    tags: {
        serverName: string
        gameHosted: 'minecraft-java' | 'factorio'
        gameserverConfig: {
            minecraftServerJarUrl?: string
            factorioVersion?: string
            [key:string]: string | undefined
        }
        domainName?: string
        hostedZone?: string
    }
    publicIp: string
    instanceId: string
    instanceRegion: string
}

let instanceMetadata: undefined | InstanceMetadata;
export async function getInstanceMetadata(): Promise<InstanceMetadata> {
    if (!instanceMetadata) {
        const metadataServiceToken = await fetchMetadataServiceToken();
        const metadataTags = await fetchTagsFromMetadata(metadataServiceToken);
        const metadataPublicIp = await fetchPublicIPFromMetadata(metadataServiceToken);
        const metadataInstanceId = await fetchInstanceIdFromMetadata(metadataServiceToken);
        const metadataInstanceRegion = await fetchInstanceRegionFromMetadata(metadataServiceToken);

        instanceMetadata = {
            tags: metadataTags,
            publicIp: metadataPublicIp,
            instanceId: metadataInstanceId,
            instanceRegion: metadataInstanceRegion
        }
    }
    return instanceMetadata;
}


export async function fetchTagsFromMetadata(metadataServiceToken: string): Promise<InstanceMetadata['tags']> {
    try {
        logger.info('Getting EC2 tags from metadata service.');
        const metadataServiceHeaders = {
            'X-aws-ec2-metadata-token': metadataServiceToken
        }
        
        const response = await axios.get(METADATA_TAGS_URL, { headers: metadataServiceHeaders });
        logger.info('Instance tag keys fetched.', { response: response.data });

        const instanceTags: {[key: string]: string} = {};

        for (const tag of response.data.split('\n')) {
            if (['ServerName', 'DomainName', 'HostedZone','GameHosted', 'GameserverConfig'].includes(tag)) {
                logger.info(`Fetching Tag: ${tag}`);
                const { data: tagValue } = await axios.get(`${METADATA_TAGS_URL}/${tag}`, { headers: metadataServiceHeaders });

                instanceTags[tag] = tagValue;
            }
        }

        logger.info('Tags fetched!', { instanceTags });
        return {
            serverName: instanceTags.ServerName,
            gameHosted: instanceTags.GameHosted as any,
            gameserverConfig: instanceTags?.GameserverConfig as any ?? {} as any,
            domainName: instanceTags?.DomainName,
            hostedZone: instanceTags?.HostedZone
        };

    } catch (error: any) {
        logger.error('Error fetching EC2 tags.', { errorMessage: error?.message });
        throw error;
    }
}


export async function fetchPublicIPFromMetadata(metadataServiceToken: string): Promise<string> {
    try {
        logger.info('Fetching EC2 public IP.');
        const metadataServiceHeaders = {
            'X-aws-ec2-metadata-token': metadataServiceToken
        }
        
        const response = await axios.get(METADATA_PUBLIC_IP_URL, { headers: metadataServiceHeaders });
        logger.info('Instance public IP fetched.', { response: response.data });
        return response.data;

    } catch (error: any) {
        logger.error('Error fetching EC2 IP.', { errorMessage: error?.message });
        throw error;
    }
}


export async function fetchInstanceIdFromMetadata(metadataServiceToken: string): Promise<string> {
    try {
        logger.info('Fetching EC2 id.');
        const metadataServiceHeaders = {
            'X-aws-ec2-metadata-token': metadataServiceToken
        }
        
        const response = await axios.get(METADATA_INSTANCE_ID_URL, { headers: metadataServiceHeaders });
        logger.info('Instance id fetched.', { response: response.data });
        return response.data;

    } catch (error: any) {
        logger.error('Error fetching EC2 id.', { errorMessage: error?.message });
        throw error;
    }
}


export async function fetchInstanceRegionFromMetadata(metadataServiceToken: string): Promise<string> {
    try {
        logger.info('Fetching EC2 id.');
        const metadataServiceHeaders = {
            'X-aws-ec2-metadata-token': metadataServiceToken
        }
        
        const response = await axios.get(METADATA_INSTANCE_REGION_URL, { headers: metadataServiceHeaders });
        logger.info('Instance region fetched.', { response: response.data });
        return response.data;

    } catch (error: any) {
        logger.error('Error fetching EC2 region.', { errorMessage: error?.message });
        throw error;
    }
}


async function fetchMetadataServiceToken(): Promise<string> {
    logger.info('Getting metadata service auth token.');
    try {
        const response = await axios.put(`${METADATA_SERVICE_BASE_URL}/api/token`, null, {
            headers: {
                // Shouldn't need a token for more than 1 min.
                'X-aws-ec2-metadata-token-ttl-seconds': '60'
            }
        });
        return response.data;
    
    } catch (error: any) {
        logger.error('Error fetching metadata token.', { errorMessage: error?.message });
        throw error;
    }
}
