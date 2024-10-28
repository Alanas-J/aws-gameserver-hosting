import { Construct } from "constructs";
import { GatewayVpcEndpoint, GatewayVpcEndpointAwsService, IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";


export class VpcConstruct extends Construct {
    vpc: Vpc
    vpcS3Endpoint: GatewayVpcEndpoint

    constructor(parent: Construct) {
        super(parent, 'VpcConstruct')

        this.vpc = new Vpc(this, 'VPC', {
            vpcName: 'GameServerVPC',
            ipAddresses: IpAddresses.cidr('10.0.255.0/24'), // Arbitrary choice, can be expanded for space for a fleet of instances.
            subnetConfiguration: [
                {
                    name: 'GameServerPublicSubnet',
                    cidrMask: 28, // 16 hosts
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    name: 'GameServerPrivateSubnet',
                    cidrMask: 28, // 16 hosts
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                }
            ],
            maxAzs: 1,
            natGateways: 0
        });

        this.vpcS3Endpoint = new GatewayVpcEndpoint(this, 'S3VpcEndpoint', {
            vpc: this.vpc,
            service: GatewayVpcEndpointAwsService.S3
        });
    }
}
