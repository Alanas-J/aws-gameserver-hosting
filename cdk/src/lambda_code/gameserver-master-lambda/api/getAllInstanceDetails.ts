import { DescribeInstancesCommand, Instance, InstanceState } from "@aws-sdk/client-ec2";
import { ec2Client } from "../utils";


export interface InstanceDetails {
    id?: string
    state?: InstanceState
    gameHosted?: string
    serverName?: string
    domain?: string
    publicIp?: string
    instanceType?: string
    launchTime?: Date
}


// simple cache to prevent spamming. (will need to rework into generic decorator or similar)
let cachedInstanceDetails: InstanceDetails[] | undefined;
let cacheTime: Date | undefined;

export async function getAllInstanceDetails(): Promise<InstanceDetails[]> {
    if (cacheTime && (cacheTime.getTime() + 2000) < Date.now()) {
        if (cachedInstanceDetails) return cachedInstanceDetails;
    }

    const stackInstances = [];

    const fetchAllInstancesCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            }
        ]
    });
    const data = await ec2Client.send(fetchAllInstancesCommand);

    if (data.Reservations) {
        for (const reservation of data.Reservations) {
            if (reservation.Instances) {
                stackInstances.push(...reservation.Instances)
            }
        }
    }

    const instanceDetails = stackInstances.map(getInstanceDetailsFromInstance);
    cachedInstanceDetails = instanceDetails;
    cacheTime = new Date();
    return instanceDetails; 
}

export function getInstanceDetailsFromInstance(instance: Instance) {
    return {
        id: instance.InstanceId,
        state: instance.State,
        gameHosted: instance.Tags?.find(tag => tag.Key === 'GameHosted')?.Value,
        serverName: instance.Tags?.find(tag => tag.Key === 'ServerName')?.Value,
        domain: instance.Tags?.find(tag => tag.Key === 'DomainName')?.Value,
        publicIp: instance.PublicIpAddress,
        instanceType: instance.InstanceType,
        launchTime: instance.LaunchTime
    }
}
