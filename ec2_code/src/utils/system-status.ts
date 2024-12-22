import { execSync } from "child_process";
import logger from "./logger";

// Returns a string eg. '2G/5G'
export function getSystemStorageUsage(): string | undefined {
    try {
        return execSync(`df -h | awk '$6 == "/" {print $3"/"$2}'`).toString();
    } catch (error: any) {
        logger.error('Failed to query current system storage use.', { errorMessage: error.message, stdError: error?.stderr.toString() })
    }
    return;
}

// Returns a string eg. '2Gi/5Gi'
export function getSystemMemoryUsage(): string | undefined {
    try {
        return execSync(`free -h | awk '/^Mem:/ {print $3"/"$2}'`).toString();
    } catch (error: any) {
        logger.error('Failed to query current system memory use.', { errorMessage: error.message, stdError: error?.stderr.toString() })
    }
    return;
}

// Returns a string eg. '5.12%'
export function getSystemCPUUsage(): string | undefined {
    try {
        return execSync(`mpstat | awk '/all/ {print 100 - $12"%"}'`).toString();
    } catch (error: any) {
        logger.error('Failed to query current system CPU use.', { errorMessage: error.message, stdError: error?.stderr.toString() })
    }
    return;
}
