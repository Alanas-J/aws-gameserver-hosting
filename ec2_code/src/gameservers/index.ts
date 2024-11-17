import { InstanceMetadata } from "../utils/instanceMetadata"
import logger from "../utils/logger"
import { FactorioServer } from "./factorio"

export interface GameserverStatus {
    state: 'installing' | 'starting' | 'running' | 'shutting-down' | 'stopped' | 'status-check-fail' 
    launchTime: string
    playerCount?: number,
    maxPlayerCount?: number
}


export interface Gameserver {
    getStatus: () => Promise<GameserverStatus>
    shutDown: () => Promise<any>
}


export function startGameserver(instanceMeta: InstanceMetadata): Gameserver | undefined {
    logger.info(`Starting a ${instanceMeta.tags.gameHosted} server`);
    
    switch (instanceMeta.tags.gameHosted) {
        case 'factorio':
            return new FactorioServer(instanceMeta)
    }
}
