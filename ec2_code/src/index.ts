import fastify from 'fastify';
import logger from './utils/logger';
import { setDNSRecord } from './utils/dns';
import { getInstanceMetadata } from './utils/instanceMetadata';

logger.info('Node.js Application started');

const server = fastify()
server.get('/ping', async (request, reply) => {
    logger.info(`Ping endpoint was hit!`);
    return 'pong\n';
})

server.get('/status', async (request, reply) => {
    logger.info(`Status endpoint was hit!`);
    return 'status will be here....\n';
})


server.listen({ port: 8080, host: '0.0.0.0' }, async (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    logger.info(`HTTP server started on: ${address}`);

    const instanceMetadata = await getInstanceMetadata();

    setDNSRecord('UPSERT', instanceMetadata);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
})


async function gracefulShutdown() {
    logger.info(`Node.js Application graceful shutdown initiated.`);

    try {
        await setDNSRecord('DELETE', await getInstanceMetadata())
        await server.close()

    } catch (error) {
        logger.error('Error gracefully shutting down.', { error });
        process.exit(1);
    }

    process.exit(0);
}
