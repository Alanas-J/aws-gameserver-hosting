import { existsSync, mkdirSync } from "fs";
import winston from "winston";

const LOG_DIRECTORY = '/var/gameserver/logs'

// Create log directory if it doesn't exist.
if (!existsSync(LOG_DIRECTORY)) {
    mkdirSync(LOG_DIRECTORY, { recursive: true });
}


const consoleTransport = new winston.transports.Console({ 
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    )
});

const fileTransport = new winston.transports.File({
    filename: LOG_DIRECTORY+'/node_server.log',
    level: 'info',  // Minimum log level to be logged to the file
    maxsize: 1000000, // Maximum file size (in bytes) before rotating (1MB)
    maxFiles: 3, // Number of files to keep (log rotation)
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
})

// Create a logger instance
const logger = winston.createLogger({
    level: 'info', // Default level
    transports: [
        consoleTransport,
        fileTransport
    ]
});

export default logger;
