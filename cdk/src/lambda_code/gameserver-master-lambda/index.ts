import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const ec2Client = new EC2Client();


export async function handler (event: LambdaFunctionUrlEvent) {
    console.log(event)

    switch (event.requestContext.http.path.split('/')[1]) {
        case 'instance_status':
            console.log('fetching instance info')

            const instanceDetails = await fetchStackInstanceDetails()
            return httpResponse({ instanceDetails });
    }

    return {
        statusCode: 200,
        headers: { "Content-Type": "text/json" },
        body: JSON.stringify({ message: "Hello world!" }),
    };
};

interface LambdaFunctionUrlEvent { // A map of all used variables, a dedicated type doesn't exist.
    requestContext: {
        http: {
            method: string, // GET, POST etc.
            path: string
        }
        headers: { [key: string]: string }
        queryStringParameters?: { [key: string]: string | null } | null;
        body: string | null;
    }
}

async function httpResponse (body: any, statusCode=200, headers={ "Content-Type": "text/json" }) {
    return {
        statusCode,
        headers,
        body
    };
}


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
            dnsName: instanceData.Tags?.find(tag => tag.Key === 'Server/Subdomain Name')?.Value,
            publicIp: instanceData.PublicIpAddress,
            instanceType: instanceData.InstanceType,
            launchTime: instanceData.LaunchTime
        }
    })
    return instanceDetails
}
