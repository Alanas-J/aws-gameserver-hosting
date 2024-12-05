import { Stack, Tags } from "aws-cdk-lib";
import { CfnInstance, CfnLaunchTemplate, EbsDeviceVolumeType, MachineImage, Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { stackConfig, serverInstances } from "../../stack-config";
import { CfnInstanceProfile, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { S3StorageConstruct } from "../s3-storage-construct/s3-storage-construct";
import path = require("path");
import { readFileSync } from "fs";


export class EC2ProvisioningConstruct extends Construct {
    gameservers: CfnInstance[]
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
        // Allows the EC2 to Log and create it's Log Group + Stream
        this.gameserverRole.addToPolicy(new PolicyStatement({
            actions: [
                "logs:PutLogEvents",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
            ],
            resources: [
                '*',
            ]
        }));

        // Allows the EC2s to shutdown eachother.
        this.gameserverRole.addToPolicy(new PolicyStatement({
            actions: [
                'ec2:StopInstances',
            ],
            resources: ['*'],
            conditions: {
                'StringEquals': {
                    'aws:ResourceTag/aws:cloudformation:stack-id': Stack.of(this).stackId,
                }
            }
        }));

        if (stackConfig.ENABLE_ROUTE_53_MAPPING) {
            // Power for the EC2 instance to create ARecords for itself.
            // @TODO: I may move this to a dedicated lambda the EC2 instance has to ask in the future.
            this.gameserverRole.addToPolicy(new PolicyStatement({
                actions: [
                    'route53:ChangeResourceRecordSets',
                    "route53:GetChange",
                    'route53:ListResourceRecordSets',
                ],
                resources: [`arn:aws:route53:::hostedzone/${stackConfig.ROUTE53_ZONE_ID}`],
            }));
        }

        

        // Currently the only way to enable metadata tag access is via Cfn constructs in the CDK.
        const instanceProfile = new CfnInstanceProfile(this, 'InstanceProfile', {
            roles: [this.gameserverRole.roleName]
        });
        const scriptPath = path.join(__dirname, '../../../../ec2_code/scripts/user_data.sh');
        const scriptContent = readFileSync(scriptPath);
        const launchTemplate = new CfnLaunchTemplate(this, 'LaunchTemplate', {
            launchTemplateData: {
                iamInstanceProfile: {
                    arn: instanceProfile.attrArn
                },
                metadataOptions: {
                    httpEndpoint: 'enabled',
                    httpProtocolIpv6: 'enabled',
                    httpTokens: 'required',
                    instanceMetadataTags: 'enabled'
                },
                imageId: MachineImage.latestAmazonLinux2023().getImage(this).imageId,
                securityGroupIds: [gameserverSecurityGroup.securityGroupId],
                userData: scriptContent.toString('base64'),
            }
        });

        // Gameserver provisioning
        this.gameservers = serverInstances.map((instanceConfig) => {
            const serverName = instanceConfig.name ?? instanceConfig.id;

            const instance = new CfnInstance(this, instanceConfig.id, {
                launchTemplate: {
                    launchTemplateId: launchTemplate.ref,
                    version: launchTemplate.attrLatestVersionNumber,
                },
                subnetId: vpc.publicSubnets[0].subnetId,
                instanceType: instanceConfig.instanceType,
                blockDeviceMappings: [{
                    deviceName: '/dev/xvda', // Root device name
                    ebs: {
                        volumeSize: instanceConfig.ssdStorageCapacityGiB,
                        volumeType: EbsDeviceVolumeType.GP3,
                        deleteOnTermination: true
                    }
                }]
            });

            Tags.of(instance).add('Name', 'GameserverStackEC2Provision/'+instanceConfig.id);
            Tags.of(instance).add('ServerName', serverName);
            Tags.of(instance).add('GameHosted', instanceConfig.startOnNextBoot);
            if (instanceConfig.version) Tags.of(instance).add('GameHostedVersion', instanceConfig.version);

            if (stackConfig.ENABLE_ROUTE_53_MAPPING) {
                Tags.of(instance).add('DomainName', stackConfig.DOMAIN_NAME);
                Tags.of(instance).add('HostedZone', stackConfig.ROUTE53_ZONE_ID);
            }
            return instance;

        });
    }
}
