import fastify from 'fastify';
import logger from './code/logger';
import { fetchTagsFromMetadata } from './code/instanceMetadata';

logger.info('Node.js Application started');

const server = fastify()
server.get('/ping', async (request, reply) => {
    logger.info(`Ping endpoint was hit!`);
    return 'pong\n';
})

server.get('/tags_test', async (request, reply) => {
    logger.info(`Tags test`);
    await fetchTagsFromMetadata();

    return 'fulfilled\n';
})

server.listen({ port: 8080, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    logger.info(`HTTP server started on: ${address}`);
})
