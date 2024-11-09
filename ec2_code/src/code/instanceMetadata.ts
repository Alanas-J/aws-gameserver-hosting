import axios from 'axios';
import logger from './logger';

const METADATA_TAGS_BASE_URL = 'http://169.254.169.254/latest/meta-data/tags/instance';

export async function fetchTagsFromMetadata() {
    try {
        logger.info('Getting EC2 tags from metadata service.');
        const response = await axios.get(METADATA_TAGS_BASE_URL);
        logger.info('Instance tag keys fetched.', { response: response.data });

        const instanceTags: {[key: string]: string} = {};

        for (const tag in response.data.split('\n')) {
            if (['ServerName', 'DomainName', 'HostedZone','GameHosted'].includes(tag)) {
                logger.info(`Fetching Tag: ${tag}`);
                const { data: tagValue } = await axios.get(`${METADATA_TAGS_BASE_URL}/${tag}`);

                instanceTags[tag] = tagValue;
            }
        }

        logger.info('Tags fetched!', { instanceTags })
    } catch (error: any) {
        logger.error('Error fetching EC2 tags:', { errorMessage: error?.message });
    }
}