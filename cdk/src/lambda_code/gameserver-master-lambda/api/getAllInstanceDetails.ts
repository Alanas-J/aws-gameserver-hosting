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


export async function getAllInstanceDetails(): Promise<InstanceDetails[]> {
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

    return stackInstances.map(getInstanceDetailsFromInstance)
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
