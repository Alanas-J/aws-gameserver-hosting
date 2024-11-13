import { InstanceMetadata } from "../utils/instanceMetadata"
import { FactorioServer } from "./factorio"

export interface GameserverStatus {
    state: 'installing' | 'updating' | 'starting' | 'running' | 'shutting-down' | 'status-check-fail'
    launchTime: string
    playerCount?: number,
    maxPlayerCount?: number
}


export interface Gameserver {
    getStatus: () => Promise<GameserverStatus>
    shutDown: () => Promise<any>
}


export function startGameserver(instanceMeta: InstanceMetadata): Gameserver | undefined {
    switch (instanceMeta.tags.gameHosted) {
        case 'factorio':
            return new FactorioServer(instanceMeta)
    }
}
