import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Gameserver, GameserverStatus } from ".";
import { InstanceMetadata } from "../utils/instanceMetadata";
import logger from "../utils/logger";
import { execSync } from "child_process";

process.env.GAMESERVER_CODE_DIR;

interface FactorioServerManifest {
    installedVersion: string
}

export class FactorioServer implements Gameserver {
    status: GameserverStatus

    constructor(instanceMeta: InstanceMetadata) {
        logger.info('Factorio server launch...')
        this.status = {
            state: 'starting',
            launchTime: new Date().toISOString()
        }

        if (!process.env.GAMESERVER_SERVER_FILES_DIR || !process.env.GAMESERVER_VAR_DIR) {
            logger.error('Gameserver path env variables are missing!');
            throw new Error('Gameserver path env variables are missing!');
        }
        const manifestFilepath = process.env.GAMESERVER_VAR_DIR+'/factorio-manifest.json';

        let installVersion: string | undefined;
        if (existsSync(manifestFilepath)) {
            logger.info('Manifest file detected.')

            if (instanceMeta.tags.gameHostedVersion) {
                const manifest: FactorioServerManifest = JSON.parse(readFileSync(manifestFilepath, 'utf8'));
                if (manifest.installedVersion !== instanceMeta.tags.gameHostedVersion) {
                    logger.info('Server version mismatch in manifest -- performing server install.');
                    installVersion = instanceMeta.tags.gameHostedVersion;
                }
            }
        } else {
            logger.info('No manifest file written -- performing first time install.');
            installVersion = 'stable';
        }

        const serverFilepath = process.env.GAMESERVER_SERVER_FILES_DIR+'/factorio';

        if (installVersion) {
            logger.info('Starting server install.');
            this.status.state = 'installing';
            const serverFilepath = process.env.GAMESERVER_SERVER_FILES_DIR+'/factorio';
            const factorioDownloadUrl = `https://factorio.com/get-download/${installVersion}/headless/linux64`;

            logger.info('Downloading factorio server.');
            try {
                if (!existsSync(serverFilepath)) {
                    logger.info('Creating factorio server file directory...', { path: serverFilepath });
                    mkdirSync(serverFilepath);
                }

                execSync(`wget -O ${serverFilepath}/factorio.tar.xz ${factorioDownloadUrl}`);
                logger.info(`Server downloaded successfully to ${serverFilepath}`);
            } catch (error: any) {
                logger.error('Error downloading file', { errorMessage: error.message, stdError: error?.stderr.toString() });
                throw error;
            }


            logger.info('Extracting factorio server.');
            try {
                execSync(`tar -xf ${serverFilepath}/factorio.tar.xz -C ${serverFilepath}`);
                logger.info(`Server extracted successfully to ${serverFilepath}`);
            } catch (error: any) {
                logger.error('Error extracting file', { errorMessage: error.message, stdError: error?.stderr.toString() });
                throw error;
            }

            logger.info('Updating server manifest.');
            const manifest: FactorioServerManifest = {
                installedVersion: installVersion
            }
            writeFileSync(manifestFilepath, JSON.stringify(manifest, null, 2), 'utf8');
            logger.info('Install finished.');
        }

        // start server
        logger.info('Starting Factorio server...');
        try {
            const factorioLogPath = `${process.env.GAMESERVER_VAR_DIR}/logs/factorio`;
            if (!existsSync(factorioLogPath)) {
                logger.info('Creating factorio log directory...', { path: factorioLogPath });
                mkdirSync(factorioLogPath);
            }

            const factorioBinaryPath = `${serverFilepath}/factorio/bin/x64/factorio`
            const factorioSavesPath = `${serverFilepath}/factorio/saves`;
            if (!existsSync(factorioSavesPath)) {
                try {
                    const commmand = `${factorioBinaryPath} --create ${factorioSavesPath}/initial-save.zip | tee -a ${factorioLogPath}/factorio-${this.status.launchTime}.log`
                    logger.info("Factorio saves directory doesn't exist; creating first save...");
                    execSync(commmand);
                    logger.info(`Initial save created...`);
                } catch (error: any) {
                    logger.error('Error creating initial save', { errorMessage: error.message, stdError: error?.stderr.toString() });
                    throw error;
                }
            }

            const factorioStartCmd = `${factorioBinaryPath} --start-server-load-latest --rcon-port 27015 --rcon-password "sdfgsfdgsdfg" | tee -a ${factorioLogPath}/factorio-${this.status.launchTime}.log`;
            execSync(`screen -S factorio -d -m bash -c '${factorioStartCmd}'`);

            logger.info('Factorio server started in screen session.');

        } catch (error: any) {
            logger.error('Error starting Factorio server in screen', { errorMessage: error.message, stdError: error?.stderr.toString() });
            throw error;
        }

        logger.info('Started!');
        this.status.state = 'running';
        // @TODO: Automate a interval to ensure server is still alive.
    }

    getStatus() {
        return {} as any
    }

    shutDown() {
        this.status.state = 'shutting-down'
        try {
            logger.info('Shutting down factorio server.');
            execSync('screen -S factorio -X stuff "/quit\\n" && screen -S factorio -r');
        } catch (error: any) {
            logger.error('Error shutting factorio server down gracefully.', { errorMessage: error.message, stdError: error?.stderr.toString() });
        }
        return {} as any
    }
}
