import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";

const ec2Client = new EC2Client();
const fetchAllInstancesCommand = new DescribeInstancesCommand();


export async function handler (event: LambdaFunctionUrlEvent) {
    console.log(event)

    switch (event.requestContext.http.path.split('/')[1]) {
        case 'status':
            console.log('fetching instance info')
            const data = await ec2Client.send(fetchAllInstancesCommand)
            console.log('success')

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/json" },
                body: JSON.stringify({ 
                    message: "Status path",
                    response: data
                }),
            };
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
