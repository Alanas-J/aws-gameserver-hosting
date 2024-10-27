/* Dedicated config typing */
// Linter for some reason not picking up *.d.ts files automatically so this file has a separate name.

// This needs enum to be filled yourself for any additional regions.
// Can query with 'aws ec2 describe-managed-prefix-lists --region <region>'
export enum IPPrefixLists {
    eu_west1_ec2_instance_conntect_ipv4 = 'pl-0839cc4c195a4e751'
}

export interface GameserverConfig {
    // Used to identify the specific instance + becomes the subdomain name.
    // WARNING: id changes will recreate the instance deleting files.
    id: string,
    // Used as the Route 53 subdomain name when provided, otherwise the id is used.
    name?: string 
    // Game hosted on the instance, deploying a new game string + restarting the instance will swap servers.
    startOnNextBoot: 'minecraft' | 'factorio'
    // On first load of a specific server will pull server files from S3, instead of a fresh install.
    initFromS3?: string
    // What type of instance to use.
    instanceType: string
    // Storage
    ssdStorageCapacityGiB: number
}