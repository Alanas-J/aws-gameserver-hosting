import { InstanceMetadata } from "../utils/instanceMetadata"
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
    idleTimeoutTime?: number
}


export interface Gameserver {
    getStatus: () => Promise<GameserverStatus>
    shutDown: () => Promise<any>
}


export function startGameserver(instanceMeta: InstanceMetadata): Gameserver | undefined {
    logger.info(`Starting a ${instanceMeta.tags.gameHosted} server`);
    
    switch (instanceMeta.tags.gameHosted) {
        case 'factorio':
            return new FactorioServer(instanceMeta);
    }
}
