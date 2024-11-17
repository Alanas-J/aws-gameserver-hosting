import fastify from 'fastify';
import logger from './utils/logger';
import { setDNSRecord } from './utils/dns';
import { getInstanceMetadata } from './utils/instanceMetadata';
import { Gameserver, startGameserver } from './gameservers';

logger.info('Node.js Application started');

let currentGameServer: Gameserver | undefined = undefined;

const server = fastify();
server.get('/ping', async (request, reply) => {
    logger.info(`Ping endpoint was hit!`);
    return 'pong\n';
});

server.get('/status', async (request, reply) => {
    logger.info(`Status endpoint was hit!`);
    if (currentGameServer) {
        // @TODO: implement caching logic.
        try {
            const status = await currentGameServer.getStatus();
            logger.info('Server status:', { status });

            return status;
        } catch (error) {
            logger.info('Error getting server status:', { error });
            reply.status(500);
            return { message: 'Failure to get server status.' }
        }
    } 
    
    logger.warn('Gameserver not running.')
    reply.status(500);
    return { message: 'Server not running.' }
});


server.listen({ port: 8080, host: '0.0.0.0' }, async (error, address) => {
    if (error) {
        logger.error('Error starting HTTP server', { error });
        process.exit(1);
    }
    logger.info(`HTTP server started on: ${address}`);

    try {
        const instanceMetadata = await getInstanceMetadata();
        currentGameServer = startGameserver(instanceMetadata);
        setDNSRecord('UPSERT', instanceMetadata);
    } catch (error) {
        logger.error('Failed to start the game server!', { error })
    }
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
});


async function gracefulShutdown() {
    logger.info(`Node.js Application graceful shutdown initiated.`);

    try {
        await setDNSRecord('DELETE', await getInstanceMetadata())
        // if (currentGameServer) await currentGameServer.shutDown(); @TODO: Will be handled outside of SIGTERM/SIGINT handling.
        await server.close()

    } catch (error) {
        logger.error('Error gracefully shutting down.', { error });
        process.exit(1);
    }

    process.exit(0);
}
