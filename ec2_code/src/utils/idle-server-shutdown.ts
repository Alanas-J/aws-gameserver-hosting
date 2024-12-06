/* Module for ensuring server shuts down if not used */
import { Gameserver } from "../gameservers";
import { getInstanceMetadata } from "./instance-metadata";
import logger from "./logger";
import { EC2Client, StopInstancesCommand } from "@aws-sdk/client-ec2";


const IDLE_CHECK_INTERVAL = 10000; // 10 sec.
const ALLOWED_IDLE_TIME = 600000; // 10 mins.
let idleTimeoutTime: number | undefined = undefined;


export async function startServerIdleCheckLoop (gameserver: Gameserver) {
    while (true) {
        try {
            const status = await gameserver.getStatus();

            if ((status && status.playerCount !== undefined && status.playerCount < 1) || status.state === 'stopped/crashed') { 
                if (!idleTimeoutTime) {
                    idleTimeoutTime = Date.now() + ALLOWED_IDLE_TIME;
                } else if (Date.now() > idleTimeoutTime) {
                    await shutdownServer(gameserver);
                    return;
                }

            } else {
                idleTimeoutTime = undefined;
            }

        } catch (error: any) {
            logger.error('Error caught in the idle sync check loop', { error, errorMessage: error.message });
        }

        await new Promise(resolve => setTimeout(resolve, IDLE_CHECK_INTERVAL));
    }
}


export function getIdleTimeoutTime(): number | undefined {
    return idleTimeoutTime;
}


export async function shutdownServer(gameserver: Gameserver) {
    const instanceMetadata = await getInstanceMetadata();
    const ec2Client = new EC2Client({ region: instanceMetadata.instanceRegion });

    // Server save + shutdown logic.
    try {
        logger.info('Idle gameserver process shutdown');
        await gameserver.shutDown();
    } catch {
        logger.error('Idle gameserver process shutdown failed...');
    }

    // Sending instance shutdown command.
    try {
        const response = await ec2Client.send(new StopInstancesCommand({
            "InstanceIds": [instanceMetadata.instanceId]
        }));
        logger.info('Instance shutdown command response', { response })
    } catch (error: any) {
        logger.error('Instance shutdown failed...', { error, errorMessage: error.message, instanceId: instanceMetadata.instanceId });
    }
}
