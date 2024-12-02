/* Module for ensuring server shuts down if not used */
import { Gameserver } from "../gameservers";
import { EC2 } from "aws-sdk";
import { getInstanceMetadata } from "./instanceMetadata";


const IDLE_CHECK_INTERVAL = 1000; // 1 sec.
const ALLOWED_IDLE_TIME = 900000; // 15 mins.
let stopIdleCheck = false;
let idleTimeoutTime: number | undefined = undefined;


export function startServerIdleCheck (gameserver: Gameserver) {
    async function syncCheck() {
        try {
            const status = await gameserver.getStatus();
            if ((status && status.playerCount && status.playerCount < 1) || status.state === 'stopped/crashed') {

                if (!idleTimeoutTime) {
                    idleTimeoutTime = Date.now() + ALLOWED_IDLE_TIME;
                } else if (Date.now() > idleTimeoutTime) {
                    await shutdownServer()
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
}


export function getIdleTimeoutTime(): number | undefined {
    return idleTimeoutTime;
}


async function shutdownServer() {
    // Lock to ensure this only runs once:
    if (stopIdleCheck) return;
    else stopIdleCheck = true;

    const instanceMetadata = await getInstanceMetadata()
    const ec2Client = new EC2();


    // Server save + shutdown logic.


    // Sending instance shutdown command.
    await ec2Client.stopInstances({
        InstanceIds: [
            instanceMetadata.instanceId
        ]
    })
    // Instance command sent...
}
