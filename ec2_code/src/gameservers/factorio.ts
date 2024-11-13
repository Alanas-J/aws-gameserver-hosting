import { Gameserver } from ".";
import { InstanceMetadata } from "../utils/instanceMetadata";

export class FactorioServer implements Gameserver {
    constructor(instanceMeta: InstanceMetadata) {
        // Will need to check /var/gameserver if factorio-manifest exists.

        // if not or if version doesn't match, download new server
        // + install.

        // Make config changes eg. change rcon password

        // start server
    }

    getStatus() {

        return {} as any
    }

    shutDown() {
        return {} as any
    }
}
