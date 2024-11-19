import { DescribeInstancesCommand, EC2Client } from "@aws-sdk/client-ec2";
import { ec2Client, httpResponse, RequestTimeoutSignal } from "../utils";
import { getInstanceDetailsFromInstance, InstanceDetails } from "./getAllInstanceDetails";


export interface InstanceStatus {
    instanceDetails: InstanceDetails
    gameserverStatus?: any /* This is defined in the gameserver code and is just relayed. */
}

export async function getInstanceStatus(serverName: string) {
    const fetchInstanceCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            },
            {
                Name: 'tag:ServerName',
                Values: [serverName]
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

    // Only hit /status of gameserver if instance is running.
    if (instanceDetails.state?.Name === 'running') {
        try {
            console.log('Fetching gameserver status')
            const response = await fetch(`http://${instanceDetails.publicIp}:8080/status`, {
                signal: RequestTimeoutSignal(5000)
            });
            const gameserverStatus = await response.json();
            return httpResponse({ instanceDetails, gameserverStatus });
        } catch (error) {
            console.error('Gameserver status fetch failed', { error: error });
        }
    }
    
    return httpResponse({
        instanceDetails
    })
}
