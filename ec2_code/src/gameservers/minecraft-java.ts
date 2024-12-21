import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { Gameserver, GameserverStatus } from ".";
import { InstanceMetadata } from "../utils/instance-metadata";
import logger from "../utils/logger";
import { execSync } from "child_process";
import crypto from 'crypto';
import { Rcon } from "rcon-client";


const rconConfig = {
    host: 'localhost',
    port: 25575,
    password: crypto.randomUUID() // Only the server needs to know / will use the RCON client.
}

export class MinecraftJavaServer implements Gameserver {
    status: GameserverStatus
    crashCheckInterval?: NodeJS.Timeout

    constructor(instanceMeta: InstanceMetadata) {
        console.log(instanceMeta);

        logger.info('Minecraft Java server launch...')
        this.status = {
            state: 'starting',
            launchTime: new Date().toISOString()
        }

        if (!process.env.GAMESERVER_SERVER_FILES_DIR || !process.env.GAMESERVER_VAR_DIR || !process.env.GAMESERVER_CODE_DIR) {
            logger.error('Gameserver path env variables are missing!');
            throw new Error('Gameserver path env variables are missing!');
        }

        const serverFilepath = process.env.GAMESERVER_SERVER_FILES_DIR+'/minecraft_java';
        const minecraftJarPath = `${serverFilepath}/minecraft_server.jar`

        if (existsSync(serverFilepath)) {
            logger.info('Minecraft directory detected.')

        } else {
            logger.info('No minecraft java install detected -- performing first time install.');
            this.status.state = 'installing';
            const defaultServerDownloadUrl = 'https://piston-data.mojang.com/v1/objects/4707d00eb834b446575d89a61a11b5d548d8c001/server.jar';
            const downloadUrl = instanceMeta.tags.gameserverConfig.minecraftServerJarUrl ?? defaultServerDownloadUrl;

            logger.info('Installing server...');
            try {
                logger.info('Making server directory...');
                mkdirSync(serverFilepath);
                
                logger.info('Downloading server jar...');
                execSync(`wget -O ${minecraftJarPath} ${downloadUrl}`);
                
                logger.info('Agreeing to EULA...');
                writeFileSync(serverFilepath+'/eula.txt', 'eula=true', 'utf8');

                logger.info('Adding default server properties....');
                const defaultConfigPath =`${process.env.GAMESERVER_CODE_DIR}/assets/minecraft_default_server.properties`;
                copyFileSync(defaultConfigPath, `${serverFilepath}/server.properties`);

            } catch (error: any) {
                logger.error('Error during server install', { errorMessage: error.message, stdError: error?.stderr.toString() });
                throw error;
            }
            logger.info('Install finished!');
        }


        logger.info('Beginning server start...');
        try {
            const minecraftLogPath = `${process.env.GAMESERVER_VAR_DIR}/logs/minecraft_java`;
            if (!existsSync(minecraftLogPath)) {
                logger.info('Creating factorio log directory...', { path: minecraftLogPath });
                mkdirSync(minecraftLogPath);
            }

            // @TODO: Change RCON password in the server config.
            // @TODO: figure out how much RAM to use
            const ramProvisionMB = 3000;

            logger.info('Starting server...');
            const minecraftStartCmd = `java -Xmx${ramProvisionMB}M -Xms${ramProvisionMB}M -jar ${minecraftJarPath} nogui 2>&1 | tee -a ${minecraftLogPath}/minecraft-${this.status.launchTime}.log`;
            execSync(`screen -S minecraft-java -d -m bash -c '${minecraftStartCmd}'`);

            logger.info('Minecraft Java server started in screen session.');
            this.status.state = 'running';

        } catch (error: any) {
            logger.error('Error starting server in screen', { errorMessage: error.message, stdError: error?.stderr.toString() });
            this.status.state = 'stopped/crashed';
            throw error;
        }


        logger.info('Server crash check loop initiated.');
        this.crashCheckInterval = setInterval(() => {
            try {
                const output = execSync('screen -ls | grep "minecraft-java" || true').toString();
                if (!output) {
                    logger.warn("Minecraft java server process is stopped/crashed!");
                    this.status.state = 'stopped/crashed';
                    if (this.crashCheckInterval) {
                        clearInterval(this.crashCheckInterval);
                        this.crashCheckInterval = undefined;
                    }
                }
            } catch (error: any) {
                logger.error('Error performing server crash check', { errorMessage: error.message, stdError: error?.stderr?.toString() });
            }
        }, 5000);
    }


    async getStatus() {
        if (['running', 'status-check-error'].includes(this.status.state)) {
            try {
                logger.info('Fetching factorio server status via RCON...');
                const rcon = await Rcon.connect(rconConfig)
                
                const rconResponse = await rcon.send('/players online');
                logger.info('Players online command response', { rconResponse });
                const playerCount = rconResponse.match(/There are (\d+) of a max of (\d+)/)?.[1];
    
                if (playerCount) {
                    this.status.playerCount = parseInt(playerCount);
                }
    
                rcon.end();
                this.status.state = 'running';
                logger.info('Current minecraft server status', { status: this.status });
            } catch (error) {
                logger.error('Error while fetching status via RCON:', { error: error, status: this.status  });
                this.status.state = 'status-check-error';
            }
        }
        return this.status;
    }


    async shutDown() {
        this.status.state = 'shutting-down';

        try {
            logger.info('Shutting down minecraft java server.');
            execSync('screen -S minecraft-java -X stuff "stop\\n"');

            logger.info('Disabling the process crash check loop.');
            if (this.crashCheckInterval) {
                clearInterval(this.crashCheckInterval);
                this.crashCheckInterval = undefined;
            }

            logger.info('Waiting for server process shutdown...');
            while(true) {
                const output = execSync('pgrep -a minecraft || true').toString(); // @TODO: need to find name of minecraft server process

                if (!output) {
                    logger.info('Process successfully shut down!');
                    return;
                } else {
                    logger.info('pgrep still detects a process...', { output });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

        } catch (error: any) {
            logger.error('Error shutting server down gracefully.', { 
                errorMessage: error.message, 
                stdError: error?.stderr?.toString(),
                stdOut: error?.stdout?.toString(),
            });
        }
    }
}
