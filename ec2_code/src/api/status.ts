import { FastifyReply, FastifyRequest } from "fastify";
import { GameserverStatus, getGameserver } from "../gameservers";
import logger from "../utils/logger";
import { getIdleTimeoutTime } from "../utils/idle-server-shutdown";

export interface GameserverStatusResponse extends GameserverStatus {
    idleTimeoutTime?: number
}

// Basic caching to prevent endpoint abuse.
const CACHE_TTL = 1000;
let cachedStatusResponse: GameserverStatus | undefined;
let cacheExpiryTime: Date | undefined;

export async function status (_request: FastifyRequest, reply: FastifyReply) {
    logger.info(`Status endpoint was hit`);
    if (cachedStatusResponse && cacheExpiryTime && cacheExpiryTime.getTime() > Date.now()) {
        logger.info(`Returned cached status`, { cachedStatus: cachedStatusResponse });
        return cachedStatusResponse;
    }

    const gameserver = getGameserver();
    if (gameserver) {

        try {
            const status = await gameserver.getStatus() as GameserverStatusResponse;
            status.idleTimeoutTime = getIdleTimeoutTime();
            logger.info('Server status:', { status });

            cachedStatusResponse = status;
            cacheExpiryTime = new Date(Date.now() + CACHE_TTL);
            return status;
        } catch (error) {
            logger.info('Error getting server status.', { error });
            reply.status(500);
            return { error: 'error', message: 'Failure to get server status.' }
        }

    } else {
        logger.warn('Gameserver not running.');
        reply.status(500);
        reply.send({ error: 'not_running', message: "Gameserver hasn't started yet." })
    }
}
