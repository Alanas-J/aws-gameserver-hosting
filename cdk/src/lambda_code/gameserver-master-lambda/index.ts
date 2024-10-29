import { EC2Client, DescribeInstancesCommand, StopInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { httpResponse, LambdaFunctionUrlEvent } from './utils'

const ec2Client = new EC2Client();


export async function handler (event: LambdaFunctionUrlEvent) {
    const path = event.requestContext.http.path.split('/')
    try {
        switch (path[1]) {
            case 'instances':
                const instanceDetails = await fetchStackInstanceDetails()
                return httpResponse({ instanceDetails });
            
            case 'instance': 
                if (['start', 'stop'].includes(path[3])) {
                    // return instanceAction(path[2], path[3] as any) //@TODO: disabled for now, will need to configure auth to prevent abuse.
                }
                break;
        }
        return httpResponse({ message: 'Invalid path.' }, 400);
    } catch (error) {
        console.error(error)
        return httpResponse({ message: 'Unexpected internal error.' }, 500);
    }
};

async function fetchStackInstanceDetails() {
    const stackInstances = []

    const fetchAllInstancesCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            }
        ]
    });
    const data = await ec2Client.send(fetchAllInstancesCommand)
    if (data.Reservations) {
        for (const reservation of data.Reservations) {
            if (reservation.Instances) {
                stackInstances.push(...reservation.Instances)
            }
        }
    }

    const instanceDetails = stackInstances.map(instanceData => {
        return {
            id: instanceData.InstanceId,
            state: instanceData.State,
            gameHosted: instanceData.Tags?.find(tag => tag.Key === 'Game Hosted')?.Value,
            serverName: instanceData.Tags?.find(tag => tag.Key === 'Server Name')?.Value,
            url: instanceData.Tags?.find(tag => tag.Key === 'Server Url')?.Value,
            publicIp: instanceData.PublicIpAddress,
            instanceType: instanceData.InstanceType,
            launchTime: instanceData.LaunchTime
        }
    })
    return instanceDetails
}


async function instanceAction(serverName: string, action: 'start' | 'stop') {
    const fetchInstanceCommand = new DescribeInstancesCommand({
        Filters: [
            {
                Name: 'tag:aws:cloudformation:stack-name',
                Values: ['GameServerStack']
            },
            {
                Name: 'tag:Server Name',
                Values: [serverName]
            }
        ]
    });

    const data = await ec2Client.send(fetchInstanceCommand)
    const instance = data?.Reservations && data.Reservations[0].Instances
    if (!instance || !instance[0].InstanceId) {
        return httpResponse({ message: 'Targeted instance not found' }, 404)
    }

    const commandArgs = {
        "InstanceIds": [
            instance[0].InstanceId
        ]
    };

    let response;
    if (action === 'start') {
        const command = new StartInstancesCommand(commandArgs);
        response = (await ec2Client.send(command)).StartingInstances
    } else if (action === 'stop') {
        const command = new StopInstancesCommand(commandArgs);
        response = (await ec2Client.send(command)).StoppingInstances
    } else {
        return httpResponse({ message: 'Invalid action.' }, 400)
    }
    return httpResponse({ message: 'Success', response })
}
