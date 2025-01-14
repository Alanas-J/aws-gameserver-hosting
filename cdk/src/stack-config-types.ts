/* Dedicated config typing */
// Linter for some reason not picking up *.d.ts files automatically so this file has a separate name.

// This needs enum to be filled yourself for any additional regions.
// Can query with 'aws ec2 describe-managed-prefix-lists --region <region>'
export enum IPPrefixLists {
    eu_west1_ec2_instance_conntect_ipv4 = 'pl-0839cc4c195a4e751'
}

export interface GameserverConfig {
    // Used to identify the specific instance + becomes the subdomain name if name is not provided.
    // WARNING: this acts as the logical id for CloudFormation to track, a change causes resource recreation.
    id: string,
    // Used as the Route 53 subdomain name when provided, otherwise the id is used.
    name?: string 
    // Game hosted on the instance, deploying a new game string + restarting the instance will swap servers.
    startOnNextBoot: 'minecraft-java' | 'factorio'
    // What type of instance to use.
    instanceType: string
    // Storage
    ssdStorageCapacityGiB: number,
    // Ability to configure optional per gameserver passwords.
    // Not intended to protect against malicious users
    // Purely exists to protect less tech savvy users from corrupting server data by instance stops/restarts.
    passwords?: {
        instanceStart?: string,
        full?: string
    }
}

export interface MinecraftJavaConfig extends GameserverConfig {
    config?: {
        // Where to download the minecraft jar from on initial server setup. 
        // If not provided will use: https://piston-data.mojang.com/v1/objects/4707d00eb834b446575d89a61a11b5d548d8c001/server.jar
        minecraftServerJarUrl?: string
        // Alternative to a server jar url, modded server zip url to intialise the server with.
        forgeZipUrl?: string
        // Instead of running the Jar directly, a shell script for starting the server can be provided.
        // (Common for modded servers)
        startScriptPath?: string
    }
}

export interface FactorioConfig extends GameserverConfig {
    config?: {
        // What version of server to use (will change versions on boot.) Will download latest if not provided.
        factorioVersion?: string
    }
}
