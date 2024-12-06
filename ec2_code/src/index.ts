import fastify from 'fastify';
import logger from './utils/logger';
import { setDNSRecord } from './utils/dns';
import { getInstanceMetadata } from './utils/instance-metadata';
import { startGameserver } from './gameservers';
import { ping } from './api/ping';
import { status } from './api/status';
logger.info('Node.js Application started');

const server = fastify();
server.get('/ping', ping);
server.get('/status', status);
server.listen({ port: 8080, host: '0.0.0.0' }, handleHTTPServerStart);


async function handleHTTPServerStart(error: Error | null, address: string) {
    if (error) {
        logger.error('Error starting HTTP server', { error });
        process.exit(1);
    }

    logger.info(`HTTP server started on: ${address}`);
    try {
        const instanceMetadata = await getInstanceMetadata();
        startGameserver(instanceMetadata);
        setDNSRecord('UPSERT', instanceMetadata);
        
    } catch (error) {
        logger.error('Failed to start the gameserver!', { error })
    }
    
    process.on('SIGINT', handleNodeServerShudown);
    process.on('SIGTERM', handleNodeServerShudown);
}


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
