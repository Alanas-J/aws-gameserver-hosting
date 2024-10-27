// Not bothered to prop drill for now.
let currentEvent;

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

export async function handler (event: LambdaFunctionUrlEvent) {
    currentEvent = event
    console.log(event)

    switch (event.requestContext.http.path.split('/')[1]) {
        case 'status':
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/json" },
                body: JSON.stringify({ message: "Status path" }),
            };
    }

    return {
        statusCode: 200,
        headers: { "Content-Type": "text/json" },
        body: JSON.stringify({ message: "Hello world!" }),
    };
};
