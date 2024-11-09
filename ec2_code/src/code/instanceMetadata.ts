import axios from 'axios';
import logger from './logger';

const METADATA_SERVICE_BASE_URL = 'http://169.254.169.254/latest';
const METADATA_TAGS_URL = `${METADATA_SERVICE_BASE_URL}/meta-data/tags/instance`;

export async function fetchTagsFromMetadata() {
    try {
        logger.info('Getting EC2 tags from metadata service.');
        const metadataServiceHeaders = {
            'X-aws-ec2-metadata-token': await fetchMetadataServiceToken()
        }
        
        const response = await axios.get(METADATA_TAGS_URL, { headers: metadataServiceHeaders });
        logger.info('Instance tag keys fetched.', { response: response.data });

        const instanceTags: {[key: string]: string} = {};

        for (const tag in response.data.split('\n')) {
            if (['ServerName', 'DomainName', 'HostedZone','GameHosted'].includes(tag)) {
                logger.info(`Fetching Tag: ${tag}`);
                const { data: tagValue } = await axios.get(`${METADATA_TAGS_URL}/${tag}`, { headers: metadataServiceHeaders });

                instanceTags[tag] = tagValue;
            }
        }

        logger.info('Tags fetched!', { instanceTags });
    } catch (error: any) {
        logger.error('Error fetching EC2 tags.', { errorMessage: error?.message });
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
