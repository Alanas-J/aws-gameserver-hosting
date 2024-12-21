# AWS Game Server Hosting Project
**Still very much in development but currently working and able to host factorio servers without issue.**

The idea of this AWS stack is to create cheap server hosting by creating on-demand self-stopping servers; this stack when not is only has EC2 EBS Storage costs at $0.08/GB-month of use + sub $0.01 S3 use (unless storing significant save backups).

And only paying for EC2 compute/IPV4 provisioning/bandwidth when you are using it. Lambda should not exceed the free use tier and it's concurrency can be limited to 1 to prevent malicious attacker cost damage.

---

The idea of this stack comes from how; usually not wanting to pay for a server you have one friend in the group locally host a server. But all those play sessions then depend on the presence of the single friend.

My idea is to leverage AWS Lambda and AWS EC2s to create a system where any one of those friends could hit an API to start a gameserver on AWS with the server idling itself out into a shutdown when not in use making the hosting cost almost entirely on-demand (not as good as free but the next best thing).

### Stack Architecture
This stack levarages EC2, Lambda, S3, CloudWatch (+ optionally Route 53 & CloudFront)

![Gameserver Stack Architecture Diagram](Gameserver%20Stack%20Arch.png "Gameserver Stack Architecture Diagram")


## How to use this stack
Ensure you have the AWS CDK + AWS CLI + a recent version of Node.js downloaded and configured on your system.

`/cdk/src/stack-config.ts` defines the stack configurations eg. Provisioning servers + enabling/disabling config options / providing a Route 53 Zone and DNS if you wish to use.

Afterwards, run `npm i` to install the needed npm dependencies and `npm run deploy` to provision the stack.


## Gameserver Lambda API
All the methods are HTTP method agnostic, can GET, POST, PUT etc... (slight laziness on my part)

### /instances
Returns
```ts
{
    instanceDetails: InstanceDetails[]
}
```

InstanceDetails definition:
``` ts
interface InstanceDetails {
    id?: string
    state?: InstanceState
    gameHosted?: string
    serverName?: string
    domain?: string
    publicIp?: string
    instanceType?: string
    launchTime?: Date
}
```

### /instance/<instance_name>/status
Returns
```ts
{
    instanceDetails: InstanceDetails
    gameserverStatus?: GameserverStatusResponse
}
```

GameserverStatusResponse definition:
``` ts
interface GameserverStatusResponse {
    state: 'installing' | 'starting' | 'running' | 'shutting-down' | 'stopped/crashed' | 'status-check-error' 
    launchTime: string
    playerCount?: number
    serverVersion?: string
    additionalServerStats?: {
        [key: string]: any
    }
    idleTimeoutTime?: number
}
```

---

These below require the Authorization header to be filled with your config assigned API password:
### /instance/<instance_name>/start
Returns AWS SDK EC2 Client's StartInstancesCommandOutput.StartingInstances

### /instance/<instance_name>/stop
Returns AWS SDK EC2 Client's StopInstancesCommandOutput.StoppingInstances

### /instance/<instance_name>/restart
Returns AWS SDK EC2 Client's RebootInstancesCommandOutput


## Useful instance shell commands
This stack is very light and still relies on linux server management
For managing the EC2 instances under the hood. Perform all logged in as 'ec2-user' via EC2 Instance Connect.

### Stopping/Starting the Gameserver Service for manual changes
For stopping the server to load in own save files + changing server config.
```bash
# For debugging gameserver / temporarily stopping it for manual intervention.
sudo systemctl stop gameserver
sudo systemctl start gameserver
sudo systemctl status gameserver
sudo systemctl restart gameserver
```
### Debugging/Terminal Attached Running
```bash
# Running the Node.js server / attached to your current terminal as the gameserver user.
sudo -su gameserver-user GAMESERVER_SERVER_FILES_DIR="/opt/server_files" GAMESERVER_VAR_DIR="/var/gameserver" GAMESERVER_CODE_DIR="/opt/gameserver" node /opt/gameserver/dist/bundle.js

# Performing a manual code sync
sudo -su gameserver-user /opt/gameserver/scripts/utils/code_sync.sh

# Attaching to the factorio server console
sudo -su gameserver-user screen -S factorio -r
# To deattach press the following in sequence
CTRL + A then D
```

### Moving Server Files to and from AWS S3 using AWS S3 CLI
This stack creates an s3 with a /server_backups/ subdirectory. Meant for saving files.
#### For Factorio
```bash
    # Factorio save files files are in
    /opt/server_files/factorio/saves

    # We can copy all of the saves from EC2 to S3 (or vice versa if URIs are swapped)
    # With the sync cli
    aws s3 sync /opt/server_files/factorio/saves/ s3://BUCKET_NAME/server_backups/saves_dir_copy
    # --delete can be passed to remove any pre-existing files in the targeted directory 
    # ensuring a complete sync.

    # We can additionally just copy a single file (example here copies a file from s3)
    aws s3 cp s3://BUCKET_NAME/server_backups/saves_dir_copy/save.zip /opt/server_files/factorio/saves/

```

### System Resource Monitoring
```bash
# Checking instance RAM usage.
free -h
# Checking instance storage usage.
df -h
# By default an amazonlinux image instance uses about ~2.7GB out of the required 8GB
# After provisioning a bigger EBS volume you need to use a sequence of CLI commands to expand the partition and let the filesystem know of extra space.
```

## Backlog
- Adding more gameserver support eg. Minecraft.

- A Standalone UI (currently this stack and my expectation is that you integrate the lambda API in your own site.) In the future I may add barebones website serving functionality to the API lambda.

- An Eventbridge invoked Lambda for managing Route 53 Zone records on EC2 Instance boot (currently EC2 instances have too much power; any instance has complete record edit powers over the given zone if Route 53 DNS management is enabled.)

- Open to additional feature suggestions...
