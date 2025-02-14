import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client, httpResponse, RequestTimeoutSignal } from "../utils";
import { getInstanceDetailsFromInstance, InstanceDetails } from "./getAllInstanceDetails";

export interface InstanceStatus {
    instanceDetails: InstanceDetails
    gameserverStatus?: any /* This is defined in the gameserver code and is just relayed. */
}
// simple cache to prevent spamming. (will need to rework into generic decorator or similar)
interface InstanceStatusCache {
    [key: string]: { instanceStatus: InstanceStatus, expiryTime: Date }
}
const CACHE_TTL = 2000;
const statusCache: InstanceStatusCache = {};


export async function getInstanceStatus(serverName: string) {
    if (statusCache[serverName] && statusCache[serverName].expiryTime.getTime() > Date.now()) {
        console.log('Returning cached response}', 
            { 
                serverName,
                cachedInstanceDetails: statusCache[serverName], 
                currentTime: Date.now(), 
                cacheTime: statusCache[serverName].expiryTime.getTime() 
            }
        )
        return  statusCache[serverName].instanceStatus;
    } 

    const fetchInstanceCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            },
            {
                Name: 'tag:ServerName',
                Values: [serverName]
            },
            {
                Name: 'instance-state-name',
                Values: ['pending', 'running', 'stopping', 'stopped']
            }
        ]
    });

    const data = await ec2Client.send(fetchInstanceCommand)
    const instances = data?.Reservations && data.Reservations[0].Instances;
    if (!instances || !instances[0].InstanceId) {
        return httpResponse({ message: 'Targeted instance not found' }, 404);
    }
    const instance = instances[0];
    const instanceDetails = getInstanceDetailsFromInstance(instance)
    const instanceStatus: InstanceStatus = {
        instanceDetails
    }

    // Only hit /status of gameserver if instance is running.
    if (instanceDetails.state?.Name === 'running') {
        try {
            console.log('Fetching gameserver status')
            const response = await fetch(`http://${instanceDetails.publicIp}:8080/status`, {
                signal: RequestTimeoutSignal(5000)
            });
            instanceStatus.gameserverStatus = await response.json();
        } catch (error) {
            console.error('Gameserver status fetch failed', { error: error });
        }
    }

    statusCache[serverName] = { instanceStatus, expiryTime: new Date(Date.now() + CACHE_TTL) };
    return httpResponse(instanceStatus)
}
