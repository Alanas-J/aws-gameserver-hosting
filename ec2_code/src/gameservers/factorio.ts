import { existsSync, readFileSync, writeFileSync } from "fs";
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
            installVersion = 'latest';
        }

        if (installVersion) {
            logger.info('Starting server install.');
            this.status.state = 'installing';
            const serverFilepath = process.env.GAMESERVER_SERVER_FILES_DIR+'/factorio';
            const factorioDownloadUrl = `https://factorio.com/get-download/${installVersion}/headless/linux64`;

            logger.info('Downloading factorio server.');
            try {
                execSync(`wget -O ${serverFilepath} ${factorioDownloadUrl}/factorio.tar.xz`);
                logger.info(`Server downloaded successfully to ${serverFilepath}`);
            } catch (error: any) {
                logger.error('Error downloading file', { error });
                throw error;
            }


            logger.info('Extracting factorio server.');
            try {
                execSync(`tar -xf ${serverFilepath}/factorio.tar.xz -C ${serverFilepath}`);
                logger.info(`Server extracted successfully to ${serverFilepath}`);
            } catch (error: any) {
                logger.error('Error extracting file', { error });
                throw error;
            }


            logger.info('@TODO: Configuring factorio server.');
            // located at: factorio/config/config.ini
            // will need to enable RCON
            // + set RCON password.

            logger.info('Updating server manifest.');
            const manifest: FactorioServerManifest = {
                installedVersion: installVersion
            }
            writeFileSync(manifestFilepath, JSON.stringify(manifest, null, 2), 'utf8');
            logger.info('Install finished.');
        }

        // start server
    }

    getStatus() {

        return {} as any
    }

    shutDown() {
        return {} as any
    }
}
