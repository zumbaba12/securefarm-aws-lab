# CloudTrail Setup

## Purpose

CloudTrail was enabled to record AWS account activity for the SecureFarm AWS
Lab.

CloudWatch monitors server and app behavior, while CloudTrail monitors AWS API
and account activity.

## Trail Configuration

- Trail name: `securefarm-cloudtrail`
- Multi-Region trail: enabled
- Event type: management events
- API activity: read and write
- Log storage: S3 bucket
- Log file validation: enabled
- CloudTrail logs sent to CloudWatch Logs
- Data events: not enabled initially
- Insights events: not enabled initially

## Test Performed

A test tag was added to the EC2 instance.

Expected and observed CloudTrail event:

- Event source: `ec2.amazonaws.com`
- Event name: `CreateTags`

## Useful Event Fields

Review these fields when using CloudTrail events as report evidence:

- `eventTime`
- `eventSource`
- `eventName`
- `awsRegion`
- `sourceIPAddress`
- `userIdentity`
- `requestParameters`
