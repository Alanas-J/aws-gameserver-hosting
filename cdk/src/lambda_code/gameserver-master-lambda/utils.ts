import { EC2Client } from "@aws-sdk/client-ec2";

export interface LambdaFunctionUrlEvent { // A map of all used variables, a dedicated type doesn't exist.
    requestContext: {
        http: {
            method: string, // GET, POST etc.
            path: string
        }
        queryStringParameters?: { [key: string]: string | null } | null
        body: string | null;
    }
    headers: { [key: string]: string }
}

export async function httpResponse (body: any, statusCode=200, headers={ "Content-Type": "text/json" }) {
    return {
        statusCode,
        headers,
        body
    };
}

// Used by Fetch API
export function RequestTimeoutSignal (time: number) {
	const controller = new AbortController();
	setTimeout(() => controller.abort(), time * 1000);
	return controller.signal;
};

// To only have one instance of the EC2Client
export const ec2Client = new EC2Client();
