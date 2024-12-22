import { EC2Client } from "@aws-sdk/client-ec2";
import { serverInstances, stackConfig } from "../../stack-config";

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


// Simple password protection
export function checkInstanceFullAccess(instanceName: string, password: string): boolean {
    if (password === stackConfig.MASTER_PASSWORD) {
        return true;
    } else {
        const instance = serverInstances.find((server) => server.name === instanceName);
        if (instance?.passwords?.full && instance?.passwords?.full === password) {
            return true;
        }
    }
    return false;
}
export function checkInstanceStartAccess(instanceName: string, password: string): boolean {
    if (checkInstanceFullAccess(instanceName, password)) {
        return true;
    } else {
        const instance = serverInstances.find((server) => server.name === instanceName);
        if (instance?.passwords?.instanceStart && instance?.passwords?.instanceStart === password) {
            return true;
        }
    }
    return false;
}
