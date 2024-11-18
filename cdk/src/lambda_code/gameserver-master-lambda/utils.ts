
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
	let controller = new AbortController();
	setTimeout(() => controller.abort(), time * 1000);
	return controller.signal;
};
