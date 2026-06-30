# Report Screenshots

Use screenshots as evidence for the lab report and documentation. Store report
images under `docs/screenshots/` so they stay near the written material.

## Naming

Use short, numbered filenames that describe the evidence:

```text
docs/screenshots/01-app-login.png
docs/screenshots/02-app-dashboard.png
docs/screenshots/03-cloudwatch-log-groups.png
docs/screenshots/04-cloudwatch-nginx-access-events.png
docs/screenshots/05-cloudwatch-memory-disk-metrics.png
docs/screenshots/06-cloudwatch-cpu-alarm-email.png
docs/screenshots/08-s3-plot-upload-ui.png
docs/screenshots/09-s3-object-listing.png
```

## Recommended Evidence

Capture the minimum screenshots needed to prove each phase:

- App login page and successful dashboard load.
- Plot list and plot detail screens.
- CloudWatch Log Groups showing:
  - `/securefarm/nginx/access`
  - `/securefarm/nginx/error`
  - `/securefarm/system/auth`
- CloudWatch log events for Nginx access/error logs and auth logs.
- CloudWatch metrics showing memory and disk usage from the agent.
- CPU alarm test evidence, including the alarm state/history and received SNS
  email notification.
- Status check alarm configuration showing `StatusCheckFailed >= 1` and the
  same SNS topic. Do not force a failed EC2 status check just for a screenshot.
- S3 plot upload evidence:
  - Plot detail Attachments panel showing a successful uploaded metadata row.
  - EC2 terminal or AWS Console S3 object listing under
    `s3://securefarm-uploads-1111/plot-uploads/`.
  - `/etc/securefarm.env` S3 configuration showing `AWS_REGION=ap-southeast-2`
    and the upload bucket/prefix values, with unrelated sensitive values
    redacted if present.

## Redaction

Before committing screenshots, redact:

- AWS account IDs.
- Full ARNs where not needed.
- Email addresses, except fake lab addresses.
- Public IPs or DNS names if the report will be shared outside the lab.
- Session tokens, cookies, SSH details, or secret values.

Keep screenshots focused on the evidence. Avoid capturing unrelated browser
tabs, terminal history, or AWS resources from other projects.
