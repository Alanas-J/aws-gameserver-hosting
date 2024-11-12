import { InstanceMetadata } from "../utils/instanceMetadata"

interface GameserverStatus {
    state: 'installing' | 'updating' | 'starting' | 'running' | 'shutting-down' | 'status-check-fail'
    startedTime: number
    playerCount?: number,
    maxPlayerCount?: number
}

interface Gameserver {
    getStatus: () => any
    shutDown: () => any
}


class FactorioServer implements Gameserver {
    constructor(instanceMeta: InstanceMetadata) {
        // Will need to check /var/gameserver if factorio-manifest exists.

        // if not or if version doesn't match, download new server
        // + install.

        // Make config changes eg. change rcon password

        // start server
    }

    getStatus() {

    }

    shutDown() {

    }
}


function startGameserver(instanceMeta: InstanceMetadata): Gameserver | undefined {
    
    switch (instanceMeta.tags.gameHosted) {
        case 'factorio':
            return new FactorioServer(instanceMeta)
    }
}
