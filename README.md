# AWS Game Server Hosting Project
**Still very much in development but currently working and able to host factorio servers without issue.**

The idea of this AWS stack is to create cheap server hosting by creating on-demand self-stopping servers; this stack when not is only has EC2 EBS Storage costs at $0.08/GB-month of use + sub $0.01 S3 use (unless storing significant save backups).

And only paying for EC2 compute/IPV4 provisioning/bandwidth when you are using it. Lambda should not exceed the free use tier and it's concurrency can be limited to 1 to prevent malicious attacker cost damage.

---

The idea of this stack comes from how; usually not wanting to pay for a server you have one friend in the group locally host a server. But all those play sessions then depend on the presence of the single friend.

My idea is to leverage AWS Lambda and AWS EC2s to create a system where any one of those friends could hit an API to start a gameserver on AWS with the server idling itself out into a shutdown when not in use making the hosting cost almost entirely on-demand (not as good as free but the next best thing).

### Stack Architecture
This stack levarages EC2, Lambda, S3, CloudWatch (+ optionally Route 53 & CloudFront)

\<Will be adding an architecture diagram here\>


## How to use this stack
Ensure you have the AWS CDK + AWS CLI + a recent version of Node.js downloaded and configured on your system.

`/cdk/src/stack-config.ts` defines the stack configurations eg. Provisioning servers + enabling/disabling config options / providing a Route 53 Zone and DNS if you wish to use.

Afterwards, run `npm i` to install the needed npm dependencies and `npm run deploy` to provision the stack.


## Gameserver Lambda API

\<Will be filling this out in the future...\>

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
sudo -su gameserver-user GAMESERVER_SERVER_FILES_DIR="/opt/server_files" GAMESERVER_VAR_DIR="/var/gameserver" node /opt/gameserver/dist/bundle.js

# Performing a manual code sync
sudo -su gameserver-user /opt/gameserver/scripts/utils/code_sync.sh

# Attaching to the factorio server console
sudo -su gameserver-user screen -S factorio -r
# To deattach press the following in sequence
CTRL + A then D

# Checking instance RAM usage.
free -h
# Checking instance storage usage.
df -h
# By default an amazonlinux image instance uses about ~2.7GB out of the required 8GB
# After provisioning a bigger EBS volume you need to use a sequence of CLI commands to expand the partition and let the filesystem know of extra space.
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
