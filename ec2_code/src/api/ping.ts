import logger from "../utils/logger";

export async function ping () {
    logger.info(`Ping endpoint was hit!`);
    return 'pong\n';
}
