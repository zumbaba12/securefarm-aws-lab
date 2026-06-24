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
};

export const DEMO_CREDENTIALS = {
  email: 'farmer@securefarm.local',
  // LAB_VULNERABILITY (weak-auth): seeded weak, reusable demo password.
  password: 'password123',
};
