import { DescribeInstancesCommand, RebootInstancesCommand, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { ec2Client, httpResponse } from "../utils";


export async function sendInstanceAction(serverName: string, action: 'start' | 'stop' | 'restart') {
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
    switch (action) {
        case 'start':
            response = (await ec2Client.send(new StartInstancesCommand(commandArgs))).StartingInstances;
            break;
        case 'stop':
            response = (await ec2Client.send(new StopInstancesCommand(commandArgs))).StoppingInstances;
            break;     
        case 'restart':
            response = await ec2Client.send(new RebootInstancesCommand(commandArgs));
            break;   
        default:
            return httpResponse({ message: 'Invalid action.' }, 400);
    }

    return httpResponse({ message: 'Success', response });
}
