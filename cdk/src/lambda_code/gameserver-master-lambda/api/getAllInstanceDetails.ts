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
let cacheExpiryTime: Date | undefined;
const CACHE_TTL = 2000;

export async function getAllInstanceDetails(): Promise<InstanceDetails[]> {
    if (cachedInstanceDetails && cacheExpiryTime && cacheExpiryTime.getTime() > Date.now()) {
        console.log('Returning cached response', 
            { cachedInstanceDetails, currentTime: Date.now(), cacheTime: cacheExpiryTime.getTime() }
        )
        if (cachedInstanceDetails) return cachedInstanceDetails;
    }

    const stackInstances = [];

    const fetchAllInstancesCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            },
            {
                Name: 'instance-state-name',
                Values: ['pending', 'running', 'stopping', 'stopped']
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
    cacheExpiryTime = new Date(Date.now() + CACHE_TTL);
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
