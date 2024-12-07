import { startServerIdleCheckLoop } from "../utils/idle-server-shutdown"
import { InstanceMetadata } from "../utils/instance-metadata"
import logger from "../utils/logger"
import { FactorioServer } from "./factorio"

export interface GameserverStatus {
    state: 'installing' | 'starting' | 'running' | 'shutting-down' | 'stopped/crashed' | 'status-check-error' 
    launchTime: string
    playerCount?: number
    serverVersion?: string
    additionalServerStats?: {
        [key: string]: any
    }
}

export interface Gameserver {
    getStatus: () => Promise<GameserverStatus>
    shutDown: () => Promise<void>
}


let gameserver: Gameserver | undefined;
export function startGameserver(instanceMeta: InstanceMetadata): Gameserver | undefined {
    logger.info(`Starting a ${instanceMeta.tags.gameHosted} server`);

    switch (instanceMeta.tags.gameHosted) {
        case 'factorio':
            gameserver =  new FactorioServer(instanceMeta);
            break;
    }

    if (gameserver) {
        setTimeout(() => {
            startServerIdleCheckLoop(gameserver as Gameserver);
        }, 5000);
    }
    return gameserver;
}

export function getGameserver(): Gameserver | undefined  {
    return gameserver
}
