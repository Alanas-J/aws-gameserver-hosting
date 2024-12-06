/* Module for ensuring server shuts down if not used */
import { Gameserver } from "../gameservers";
import { getInstanceMetadata } from "./instanceMetadata";
import logger from "./logger";
import { EC2Client, StopInstancesCommand } from "@aws-sdk/client-ec2";


const IDLE_CHECK_INTERVAL = 5000; // 1 sec.
const ALLOWED_IDLE_TIME = 300000; // 5 mins.
let stopIdleCheck = false;
let idleTimeoutTime: number | undefined = undefined;


export function startServerIdleCheck (gameserver: Gameserver) {
    async function syncCheck() {
        if (stopIdleCheck) return;

        try {
            const status = await gameserver.getStatus();
            if ((status && status.playerCount !== undefined && status.playerCount < 1) || status.state === 'stopped/crashed') {

                if (!idleTimeoutTime) {
                    idleTimeoutTime = Date.now() + ALLOWED_IDLE_TIME;
                } else if (Date.now() > idleTimeoutTime) {
                    stopIdleCheck = true;
                    await shutdownServer(gameserver)
                    return;
                }

            } else {
                idleTimeoutTime = undefined;
            }

        } finally {
            if (!stopIdleCheck) {
                setTimeout(syncCheck, IDLE_CHECK_INTERVAL);
            }
        }
    }
    syncCheck();
}


export function stopServerIdleCheck() {
    stopIdleCheck = true;
    idleTimeoutTime = undefined;
}


export function getIdleTimeoutTime(): number | undefined {
    return idleTimeoutTime;
}


async function shutdownServer(gameserver: Gameserver) {
    const instanceMetadata = await getInstanceMetadata();
    const ec2Client = new EC2Client();

    // Server save + shutdown logic.
    try {
        logger.info('Idle gameserver process shutdown');
        await gameserver.shutDown();
    } catch (error) {
        logger.error('Idle gameserver process shutdown failed...');
    }

    // Sending instance shutdown command.
    try {
        const response = await ec2Client.send(new StopInstancesCommand({
            "InstanceIds": [
                instanceMetadata.instanceId
            ]
        }));
        logger.info('Instance shutdown command response', { response })
    } catch (error) {
        logger.error('Instance shutdown failed...', { error });
    }
}
