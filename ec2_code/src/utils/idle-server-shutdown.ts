/* Module for ensuring server shuts down if not used */
import { Gameserver } from "../gameservers";


const IDLE_CHECK_INTERVAL = 1000; // 1 sec.
const ALLOWED_IDLE_TIME = 900000; // 15 mins.
let stopIdleCheck = false;
let idleTimeoutTime: number | undefined = undefined;


export function startServerIdleCheck (gameserver: Gameserver) {
    async function syncCheck() {
        try {
            const status = await gameserver.getStatus();
            if (status && status.playerCount && status.playerCount < 1) {
                // @TODO: add more conditions to auto shutdown.

                if (!idleTimeoutTime) {
                    idleTimeoutTime = Date.now() + ALLOWED_IDLE_TIME;
                } else if (Date.now() > idleTimeoutTime) {
                    shutdownServer()
                }

            } else {
                idleTimeoutTime = undefined;
            }

        } finally {
            if (stopIdleCheck) {
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


function shutdownServer() {
    // @TODO: server shutdown logic.
    // Shutdown gameserver
    // EC2 client instance shutdown.
}