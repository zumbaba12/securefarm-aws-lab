# S3 Integration Report

## Summary

SecureFarm now supports authenticated plot attachments backed by Amazon S3.
Plots, seasons, and upload metadata remain in SQLite; uploaded file objects are
stored in the private S3 bucket `securefarm-uploads-1111`.

The deployed EC2 instance uses the IAM role `securefarm-ec2-cloudwatch-role`.
The app uses the AWS SDK default credential provider chain, so uploads work from
EC2 through the instance role without `aws configure` and without AWS access
keys in `/etc/securefarm.env`.

## Implemented Flow

1. An authenticated user opens a plot detail page.
2. The user uploads an allowed attachment from the Attachments panel.
3. The API validates ownership, file type, and file size.
4. The API generates the S3 key server-side under `plot-uploads/`.
5. The file object is uploaded to `securefarm-uploads-1111`.
6. SQLite stores upload metadata in `plot_uploads`.
7. The UI lists attachment metadata without rendering file contents inline.

## Security Guardrails

- Upload routes require authentication.
- Users can only upload/list/delete attachments for their own plots.
- S3 keys are generated server-side; clients do not choose object paths.
- Allowed file types are limited to `.txt`, `.csv`, `.jpg`, `.jpeg`, `.png`,
  and `.pdf`.
- Upload size defaults to 5 MiB.
- Uploaded objects are not made public by the app.
- AWS credentials are not stored in code, `.env`, seed data, or tests.
- Automated tests use a stubbed S3 backend.

## Verification Completed

- EC2 IAM role policy was tested with AWS CLI against
  `securefarm-uploads-1111`.
- The app was deployed to EC2 with:
  - `AWS_REGION=ap-southeast-2`
  - `SECUREFARM_UPLOAD_BUCKET=securefarm-uploads-1111`
  - `SECUREFARM_UPLOAD_PREFIX=plot-uploads`
  - `SECUREFARM_UPLOAD_MAX_BYTES=5242880`
- Browser upload from the plot Attachments panel succeeded after correcting the
  EC2 region value from `ap_southeast-2` to `ap-southeast-2`.

## Evidence To Capture

- Plot detail page showing the Attachments panel and successful uploaded
  metadata row.
- EC2 terminal output showing:

```bash
aws s3 ls s3://securefarm-uploads-1111/plot-uploads/ --recursive
```

- `/etc/securefarm.env` showing S3 configuration with secrets redacted if any
  unrelated values are present.
- Optional CloudWatch or `journalctl` evidence showing the upload service
  running without S3 errors after the region fix.

## Remaining Notes

Real S3 upload verification is complete for the owned EC2 lab deployment. The
bucket should remain private, and uploaded objects should only contain fake lab
data.
