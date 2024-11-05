import { Tags } from "aws-cdk-lib";
import { BlockDeviceVolume, EbsDeviceVolumeType, Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, SubnetType, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { serverInstances } from "../../stack-config";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { S3StorageConstruct } from "../s3-storage-construct/s3-storage-construct";
import path = require("path");
import { readFileSync } from "fs";


export class EC2ProvisioningConstruct extends Construct {
    gameservers: Instance[]
    gameserverRole: Role

    constructor(parent: Construct, vpc: Vpc, s3Construct: S3StorageConstruct) {
        super(parent, 'EC2Provision');

        const gameserverSecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
            vpc,
            allowAllOutbound: true, // Allowing for dependency installation.
            description: 'Gameserver Security Group',
        });
        // Allowing SSH only from EC2 Instance Connect via the AWS Console.
        gameserverSecurityGroup.addIngressRule(Peer.prefixList('pl-0839cc4c195a4e751'), Port.tcp(22), 'Allow SSH access via EC2 Instance Connect.');
        // I was hoping to initially limit this to lambda only, but lambdas from inside a VPC need an internet interface of any sort to perform AWS SDK calls (which cost money).
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080), 'Allow any ipv4/tcp to access Node server port.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(8080), 'Allow any ipv4/tcp to access Node server port.');
        // Minecraft Port
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(25565), 'Allow all ipv4/tcp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.udp(25565), 'Allow all ipv4/udp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(25565), 'Allow all ipv6/tcp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.udp(25565), 'Allow all ipv6/udp to connect to Minecraft.');
        // Factorio Port
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.udp(34197), 'Allow all ipv4/udp to connect to Factorio.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.udp(34197), 'Allow all ipv6/udp to connect to Factorio.');


        this.gameserverRole = new Role(this, 'GameserverRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com')
        });
        // List bucket + Pull server code.
        this.gameserverRole.addToPolicy(new PolicyStatement({
            actions: [
                's3:GetObject',
                's3:ListBucket',
            ],
            resources: [
                `arn:aws:s3:::${s3Construct.s3Bucket.bucketName}/ec2_code/*`,
                `arn:aws:s3:::${s3Construct.s3Bucket.bucketName}` // Not pathed resource arn for ListBucket.
            ]
        }));
        // Read/write filesave directory
        this.gameserverRole.addToPolicy(new PolicyStatement({
            actions: [
                's3:GetObject',
                's3:PutObject'
            ],
            resources: [
                `arn:aws:s3:::${s3Construct.s3Bucket.bucketName}/server_backups/*`,
            ]
        }));
        // Power to fix Route 53 records post boot.
        /* @TODO: figure out Route53 record policy, this will require testing.
        this.gameserverRole.addToPolicy(new PolicyStatement({
            actions: [
                'route53:ChangeResourceRecordSets',
                'route53:ListResourceRecordSets',
            ],
            resources: ['arn:aws:route53:::hostedzone/YOUR_HOSTED_ZONE_ID'],
            conditions: {
                'StringEquals': {
                    'route53:ChangeResourceRecordSets/<tagkey>': '<tag value>',
                },
            },
        }));
        */

        // UserData script loading
        const scriptPath = path.join(__dirname, '../../../../ec2_code/scripts/user_data.sh');
        const scriptContent = readFileSync(scriptPath, 'utf8');
        const userData = UserData.forLinux();
        userData.addCommands(scriptContent);


        // Gameserver provisioning
        this.gameservers = serverInstances.map((instanceConfig) => {
            const serverName = instanceConfig.name ?? instanceConfig.id;

            const instance = new Instance(this, instanceConfig.id, {
                vpc,
                vpcSubnets: { subnetType: SubnetType.PUBLIC },
                machineImage: MachineImage.latestAmazonLinux2023(),
                instanceType: new InstanceType(instanceConfig.instanceType),
                securityGroup: gameserverSecurityGroup,
                blockDevices: [{
                    deviceName: '/dev/xvda', // Root device name
                    volume: BlockDeviceVolume.ebs(instanceConfig.ssdStorageCapacityGiB, { 
                        deleteOnTermination: true,
                        volumeType: EbsDeviceVolumeType.GP3,
                    }),
                }],
                role: this.gameserverRole,
                userData
            });

            // @TODO: Need to figure out if I'll use parameter store or just tags.
            Tags.of(instance).add('Server Name', serverName);
            Tags.of(instance).add('Game Hosted', instanceConfig.startOnNextBoot);
            return instance;
        });
    }
}
