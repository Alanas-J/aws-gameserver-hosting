import { httpResponse, LambdaFunctionUrlEvent } from './utils';
import { getAllInstanceDetails } from "./api/getAllInstanceDetails";
import { getInstanceStatus } from "./api/getInstanceStatus";
import { sendInstanceAction } from './api/sendInstanceAction';


export async function handler (event: LambdaFunctionUrlEvent) {
    const path = event.requestContext.http.path.split('/');
    const [_, route, instanceName, instanceAction] = path;

    try {
        switch (route) {
            case 'instances':
                const instanceDetails = await getAllInstanceDetails();
                return httpResponse({ instanceDetails });
            
            case 'instance': 
                switch(instanceAction) {
                    case 'start':
                    case 'restart':
                    case 'stop':
                        if (event.headers.authorization === process.env.AUTH_PASSWORD) {
                            return await sendInstanceAction(instanceName, instanceAction as any);
    
                        } else {
                            return httpResponse({ message: 'Unauthorized.' }, 401);
                        }

                    case 'status':
                        return await getInstanceStatus(instanceName);
                }
            default:
                return httpResponse({ message: 'Invalid path.' }, 400);
        }

    } catch (error) {
        console.error(error)
        return httpResponse({ message: 'Unexpected internal error.' }, 500);
    }
}
