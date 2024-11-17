import { existsSync, mkdirSync } from "fs";
import { Gameserver, GameserverStatus } from ".";
import { InstanceMetadata } from "../utils/instanceMetadata";
import logger from "../utils/logger";
import { execSync } from "child_process";
import crypto from 'crypto';
import { Rcon } from "rcon-client";


interface FactorioServerData {
    version?: string
}


const rconConfig = {
    host: 'localhost',
    port: 27015,
    password: crypto.randomUUID() // Only the server needs to know / will use the RCON client.
}

export class FactorioServer implements Gameserver {
    status: GameserverStatus
    factorioServerData: FactorioServerData = {}
    crashCheckInterval: NodeJS.Timeout

    constructor(instanceMeta: InstanceMetadata) {
        console.log(instanceMeta);

        logger.info('Factorio server launch...')
        this.status = {
            state: 'starting',
            launchTime: new Date().toISOString()
        }

        if (!process.env.GAMESERVER_SERVER_FILES_DIR || !process.env.GAMESERVER_VAR_DIR) {
            logger.error('Gameserver path env variables are missing!');
            throw new Error('Gameserver path env variables are missing!');
        }

        const serverFilepath = process.env.GAMESERVER_SERVER_FILES_DIR+'/factorio';
        const factorioExecPath = `${serverFilepath}/bin/x64/factorio`

        let installVersion: string | undefined;
        if (existsSync(serverFilepath)) {
            logger.info('Factorio directory detected.')

            if (instanceMeta.tags.gameHostedVersion) {
                logger.info('GameHostedVersion provided, checking if same as server output.')

                const serverVersion = this.getServerVersion(factorioExecPath)
                if (serverVersion !== instanceMeta.tags.gameHostedVersion) {
                    logger.info('Server version mismatch in manifest -- performing server install.', 
                        { installed: serverVersion, received: instanceMeta.tags.gameHostedVersion }
                    );
                    installVersion = instanceMeta.tags.gameHostedVersion;
                }
            }
        } else {
            logger.info('No factorio install detected -- performing first time install.');
            installVersion = instanceMeta.tags?.gameHostedVersion ?? 'stable';
        }

        if (installVersion) {
            logger.info('Starting server install.');
            this.status.state = 'installing';
            const factorioDownloadUrl = `https://factorio.com/get-download/${installVersion}/headless/linux64`;

            logger.info('Downloading factorio server.');
            try {
                execSync(`wget -O /tmp/factorio.tar.xz ${factorioDownloadUrl}`);
                logger.info('Server zip downloaded successfully to tmp');
            } catch (error: any) {
                logger.error('Error downloading file', { errorMessage: error.message, stdError: error?.stderr.toString() });
                throw error;
            }

            logger.info('Extracting factorio server.');
            try {
                execSync(`tar -xf /tmp/factorio.tar.xz -C ${process.env.GAMESERVER_SERVER_FILES_DIR}`);
                logger.info(`Server extracted successfully to ${process.env.GAMESERVER_SERVER_FILES_DIR}`);
            } catch (error: any) {
                logger.error('Error extracting file', { errorMessage: error.message, stdError: error?.stderr.toString() });
                throw error;
            }

            logger.info('Install finished.');
        }


        logger.info('Starting Factorio server...');
        try {
            const factorioLogPath = `${process.env.GAMESERVER_VAR_DIR}/logs/factorio`;
            if (!existsSync(factorioLogPath)) {
                logger.info('Creating factorio log directory...', { path: factorioLogPath });
                mkdirSync(factorioLogPath);
            }

            const factorioSavesPath = `${serverFilepath}/saves`;
            if (!existsSync(factorioSavesPath)) {
                try {
                    logger.info("Factorio saves directory doesn't exist; creating first save...");

                    const commmand = `${factorioExecPath} --create ${factorioSavesPath}/init.zip | tee -a ${factorioLogPath}/factorio-${this.status.launchTime}.log`;
                    execSync(commmand);
                    logger.info(`Initial save created...`);
                } catch (error: any) {
                    logger.error('Error creating initial save', { errorMessage: error.message, stdError: error?.stderr.toString() });
                    throw error;
                }
            }

            const serverVersion = this.getServerVersion(factorioExecPath);
            this.factorioServerData.version = serverVersion;
            this.status.addtionalServerStats = this.factorioServerData; // @TODO: clean this up later.
            logger.info('Starting Factorio server...', { serverVersion });

            const factorioStartCmd = `${factorioExecPath} --start-server-load-latest --rcon-port ${rconConfig.port} --rcon-password "${rconConfig.password}" 2>&1 | tee -a ${factorioLogPath}/factorio-${this.status.launchTime}.log`;
            execSync(`screen -S factorio -d -m bash -c '${factorioStartCmd}'`);

            logger.info('Factorio server started in screen session.');
            this.status.state = 'running';

        } catch (error: any) {
            logger.error('Error starting Factorio server in screen', { errorMessage: error.message, stdError: error?.stderr.toString() });
            this.status.state = 'stopped';
            throw error;
        }

        logger.info('Started!');
        this.status.state = 'running';

        // Crash check loop
        this.crashCheckInterval = setInterval(() => {
            try {
                const output = execSync('screen -ls | grep "factorio" || true').toString();
                if (!output) {
                    logger.warn("Factorio server process is stopped/crashed!");
                    this.status.state = 'stopped';
                } else {
                    this.status.state = 'running';
                }
            } catch (error: any) {
                logger.error('Error performing server crash check', { errorMessage: error.message, stdError: error?.stderr.toString() });
            }
        }, 5000)
    }


    getServerVersion(factorioExecPath: string): string {
        try {
            logger.info("Getting factorio server version....");
            const commmand = `${factorioExecPath} --version`;
            const output = execSync(commmand).toString();
            const versionMatches = output.match(/\d+\.\d+\.\d+/)
            if (!versionMatches) throw new Error(`Failed to parse version from factorio server '${output}'`);

            logger.info(`Factorio version fetched`, { output: output, version: versionMatches[0] });
            return versionMatches[0]
        } catch (error: any) {
            logger.error('Error getting the version', { errorMessage: error.message, stdError: error?.stderr.toString() });
            throw error;
        }
    }


    async getStatus() {
        try {
            logger.info('Fetching factorio server status via RCON...');
            const rcon = await Rcon.connect(rconConfig)

            const rconResponse = await rcon.send('/players online');
            logger.info('Players online command response', { rconResponse });
            const playerCount = rconResponse.match(/Online players \((\d+)\)/)?.[1];

            if (playerCount) {
                this.status.playerCount = parseInt(playerCount);
            }

            // @TODO: Future potential additional config to fetch
            // /config get max-players
            // /config get name
            // /config get description
            // /config get tags

            rcon.end();
            logger.info('Current factorio server status', this.status);
            return this.status;

        } catch (error) {
            logger.error('Error while fetching status via RCON:', { error: error });
            throw error;
        }
    }


    async shutDown() {
        this.status.state = 'shutting-down'
        try {
            logger.info('Shutting down factorio server.');
            execSync('screen -S factorio -X stuff "/quit\\n" && screen -S factorio -r');
        } catch (error: any) {
            logger.error('Error shutting factorio server down gracefully.', { errorMessage: error.message, stdError: error?.stderr.toString() });
        }
    }
}
