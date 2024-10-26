import { Stack, Tags } from "aws-cdk-lib";
import { Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { serverInstances } from "../../stack-config";


export class EC2ProvisioningConstruct extends Construct {
    gameservers: Instance[]

    constructor(parent: Construct, vpc: Vpc, servermasterLambdaSG: SecurityGroup) {
        super(parent, 'EC2Provision');

        const gameserverSecurityGroup = new SecurityGroup(this, 'SecurityGroup', {
            vpc,
            allowAllOutbound: true, // Need to allow for dependancy installation.
            description: 'Gameserver Security Group',
        });

        // Allowing SSH only from EC2 Instance Connect via the AWS Console.
        gameserverSecurityGroup.addIngressRule(Peer.prefixList(`com.amazonaws.${Stack.of(this).region}.ec2-instance-connect`), Port.tcp(22), 'Allow SSH access via EC2 Instance Connect.');

        // Lambda @TODO: may need to change, might not use port 80 for node, yet to see. (might not want to give Node privelege enough to use port 80, but no idea how much power the 'ec2-user' has.)
        gameserverSecurityGroup.addIngressRule(Peer.securityGroupId(servermasterLambdaSG.securityGroupId), Port.tcp(80), 'Allow the servermaster lambda to access the HTTP port.');
        servermasterLambdaSG.addEgressRule(Peer.securityGroupId(gameserverSecurityGroup.securityGroupId), Port.tcp(80), 'Allow the servermaster lambda use the HTTP port to reach gameservers.')

        // Minecraft Port
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(25565), 'Allow all ipv4/tcp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.udp(25565), 'Allow all ipv4/udp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(25565), 'Allow all ipv6/tcp to connect to Minecraft.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.udp(25565), 'Allow all ipv6/udp to connect to Minecraft.');

        // Factorio Port
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.udp(34197), 'Allow all ipv4/udp to connect to Factorio.');
        gameserverSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.udp(34197), 'Allow all ipv6/udp to connect to Factorio.');


        this.gameservers = serverInstances.map((instanceConfig, index) => {
            const serverName = instanceConfig.name ?? `gameserver${index}`;

            const instance = new Instance(this, serverName+'Instance', {
                vpc,
                vpcSubnets: { subnetType: SubnetType.PUBLIC },
                machineImage: MachineImage.latestAmazonLinux2023(),
                instanceType: new InstanceType(instanceConfig.name),
                securityGroup: gameserverSecurityGroup,
            })
            Tags.of(instance).add('Server Name', serverName)

            // @TODO: Storage + parametre store config

            return instance

        }) 

    }
}
