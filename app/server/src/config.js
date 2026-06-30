import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local-only defaults. Bind to loopback unless the operator explicitly opts out.
export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '127.0.0.1',
  // The lab runs in "dev" mode by default, which exposes demo credentials and
  // verbose errors. Set NODE_ENV=production to suppress lab affordances.
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  dbPath: process.env.SECUREFARM_DB || path.join(__dirname, '..', 'data', 'securefarm.sqlite'),

  // S3 upload settings. Credentials are NOT configured here: the AWS SDK uses
  // its default provider chain (on EC2 this resolves to the attached IAM role).
  upload: {
    bucket: process.env.SECUREFARM_UPLOAD_BUCKET || 'securefarm-uploads-1111',
    prefix: process.env.SECUREFARM_UPLOAD_PREFIX || 'plot-uploads',
    maxBytes: Number(process.env.SECUREFARM_UPLOAD_MAX_BYTES) || 5 * 1024 * 1024,
    // Region is resolved by the SDK if unset; set AWS_REGION on the instance.
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || undefined,
  },
};

export const DEMO_CREDENTIALS = {
  email: 'farmer@securefarm.local',
  // LAB_VULNERABILITY (weak-auth): seeded weak, reusable demo password.
  password: 'password123',
};
