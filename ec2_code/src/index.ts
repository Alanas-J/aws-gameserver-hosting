import fastify from 'fastify';
import logger from './utils/logger';
import { setDNSRecord } from './utils/dns';
import { getInstanceMetadata } from './utils/instanceMetadata';
import { Gameserver, GameserverStatus, startGameserver } from './gameservers';
import { getIdleTimeoutTime, startServerIdleCheck } from './utils/idle-server-shutdown';
import { execSync } from 'child_process';

logger.info('Node.js Application started');

let currentGameServer: Gameserver | undefined = undefined;

const server = fastify();
server.get('/ping', async (request, reply) => {
    logger.info(`Ping endpoint was hit!`);
    return 'pong\n';
});

server.get('/test', async (request, reply) => {
    try {
        execSync('screen -S factorio -r');
    } catch (error: any) {
        logger.error('Error shutting factorio server down gracefully.', { 
            errorMessage: error.message, 
            stdError: error?.stderr?.toString(),
            stdOut: error?.stdout?.toString(),
        });
    }
    return 'test\n';
});

// Basic caching to prevent endpoint abuse.
const CACHE_TTL = 1000;
let cachedStatusResponse: GameserverStatus | undefined;
let cacheExpiryTime: Date | undefined;

server.get('/status', async (request, reply) => {
    logger.info(`Status endpoint was hit!`);
    if (cachedStatusResponse && cacheExpiryTime && cacheExpiryTime.getTime() > Date.now()) {
        logger.info(`Returned cached status`, { cachedStatus: cachedStatusResponse });
        return cachedStatusResponse;
    }

    if (currentGameServer) {
        try {
            const status = await currentGameServer.getStatus();
            status.idleTimeoutTime = getIdleTimeoutTime()
            logger.info('Server status:', { status });

            cachedStatusResponse = status;
            cacheExpiryTime = new Date(Date.now() + CACHE_TTL);
            return status;
        } catch (error) {
            logger.info('Error getting server status:', { error });
            reply.status(500);
            return { error: 'error', message: 'Failure to get server status.' }
        }
    } else {
        logger.warn('Gameserver not running.')
        reply.status(500);
        reply.send({ error: 'not_running',message: 'Gameserver not running yet.' })
    }
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

        if (currentGameServer) {
            setTimeout(() => {
                startServerIdleCheck(currentGameServer as Gameserver);
            }, 5000);
        }
        
    } catch (error) {
        logger.error('Failed to start the game server!', { error })
    }
    process.on('SIGINT', handleNodeServerShudown);
    process.on('SIGTERM', handleNodeServerShudown);
});


async function handleNodeServerShudown() {
    logger.info(`Node.js Application graceful shutdown initiated.`);

    try {
        await setDNSRecord('DELETE', await getInstanceMetadata());
        await server.close();

    } catch (error) {
        logger.error('Error gracefully shutting down.', { error });
        process.exit(1);
    }

    process.exit(0);
}
