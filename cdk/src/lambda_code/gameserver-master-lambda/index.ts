import { EC2Client, DescribeInstancesCommand, StopInstancesCommand, StartInstancesCommand, RebootInstancesCommand } from "@aws-sdk/client-ec2";
import { httpResponse, LambdaFunctionUrlEvent, RequestTimeoutSignal } from './utils';

const ec2Client = new EC2Client();


export async function handler (event: LambdaFunctionUrlEvent) {
    const path = event.requestContext.http.path.split('/')
    try {
        switch (path[1]) {
            case 'instances':
                const instanceDetails = await fetchAllGameserverInstances();
                return httpResponse({ instanceDetails });
            
            case 'instance': 
                if (['start', 'stop', 'restart'].includes(path[3])) {
                    if (event.requestContext.headers.Authorization === process.env.AUTH_PASSWORD) {
                        return instanceAction(path[2], path[3] as any);

                    } else {
                        return httpResponse({ message: 'Unauthorized.' }, 401);
                    }
                } else if (path[3] === 'status' ) {
                    return instanceStatus(path[2]);
                }
                break;
        }
        return httpResponse({ message: 'Invalid path.' }, 400);
    } catch (error) {
        console.error(error)
        return httpResponse({ message: 'Unexpected internal error.' }, 500);
    }
};


async function fetchAllGameserverInstances() {
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
            gameHosted: instanceData.Tags?.find(tag => tag.Key === 'GameHosted')?.Value,
            serverName: instanceData.Tags?.find(tag => tag.Key === 'ServerName')?.Value,
            domain: instanceData.Tags?.find(tag => tag.Key === 'DomainName')?.Value,
            publicIp: instanceData.PublicIpAddress,
            instanceType: instanceData.InstanceType,
            launchTime: instanceData.LaunchTime
        }
    })
    return instanceDetails
}


async function instanceAction(serverName: string, action: 'start' | 'stop' | 'restart') {
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
    const instance = data?.Reservations && data.Reservations[0].Instances;
    if (!instance || !instance[0].InstanceId) {
        return httpResponse({ message: 'Targeted instance not found' }, 404);
    }

    const commandArgs = {
        "InstanceIds": [
            instance[0].InstanceId
        ]
    };

    let response;
    if (action === 'start') {
        const command = new StartInstancesCommand(commandArgs);
        response = (await ec2Client.send(command)).StartingInstances;
    } else if (action === 'stop') {
        const command = new StopInstancesCommand(commandArgs);
        response = (await ec2Client.send(command)).StoppingInstances;
    } else if (action === 'restart') {
        const command = new RebootInstancesCommand(commandArgs);
        response = (await ec2Client.send(command));
    } else {
        return httpResponse({ message: 'Invalid action.' }, 400);
    }
    return httpResponse({ message: 'Success', response });
}


async function instanceStatus(serverName: string) {
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

    const instanceDetails = {
        id: instance.InstanceId,
        state: instance.State,
        gameHosted: instance.Tags?.find(tag => tag.Key === 'GameHosted')?.Value,
        serverName: instance.Tags?.find(tag => tag.Key === 'ServerName')?.Value,
        domain: instance.Tags?.find(tag => tag.Key === 'DomainName')?.Value,
        publicIp: instance.PublicIpAddress,
        instanceType: instance.InstanceType,
        launchTime: instance.LaunchTime
    }

    const response = await fetch(`http://${instanceDetails.publicIp}:8080/status`, {
        signal: RequestTimeoutSignal(5000)
    });
    const gameserverStatus = await response.json();

    return httpResponse({ message: 'Success', instanceDetails, gameserverStatus });
}
