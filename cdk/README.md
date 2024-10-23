# Welcome to your CDK TypeScript project (slightly edited from template)
The `cdk.json` file tells the CDK Toolkit how to execute your app.

Need to install the aws-cdk prior:\
`npm install -g aws-cdk`\
and also run the bootstrap command to allow it to deploy on your behalf.\

`cdk deploy --context aws:cdk:account=123456789012 --context aws:cdk:region=us-west-2` can also be used to target a specific account/region for deployment instead of defaults, or context set in the cdk.json.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
