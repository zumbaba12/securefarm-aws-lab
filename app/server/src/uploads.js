import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';

// Deliberately small allow-list of low-risk content types -> permitted file
// extensions. HTML, SVG, JavaScript, scripts, executables, and archives are all
// rejected because they are absent from this map. This keeps the upload feature
// a plain S3 exercise rather than a new arbitrary-file-hosting vulnerability.
export const ALLOWED_TYPES = {
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
};

// A file is allowed only when its declared content type is on the allow-list
// AND its extension matches one of the extensions for that type.
export function isAllowed(mimetype, originalName) {
  const exts = ALLOWED_TYPES[mimetype];
  if (!exts) return false;
  const ext = path.extname(originalName || '').toLowerCase();
  return exts.includes(ext);
}

// Reduce an arbitrary client filename to a safe token for use in an S3 key.
// Strips directory components and anything outside [A-Za-z0-9._-].
export function sanitizeFilename(name) {
  const base = path.basename(name || '');
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 100);
  return cleaned || 'file';
}

// S3 keys are always generated server-side; the client never supplies the key.
// Shape: plot-uploads/user-<userId>/plot-<plotId>/<uuid>-<sanitized-filename>
export function buildKey(userId, plotId, originalName) {
  const safe = sanitizeFilename(originalName);
  const uuid = crypto.randomUUID();
  return `${config.upload.prefix}/user-${userId}/plot-${plotId}/${uuid}-${safe}`;
}

let client;
function s3() {
  if (!client) {
    client = new S3Client(config.upload.region ? { region: config.upload.region } : {});
  }
  return client;
}

// Real S3-backed storage. Objects are uploaded without a public ACL; keeping
// uploads private relies on the bucket's Block Public Access settings. The app
// only ever stores/returns metadata, never renders object contents inline.
export const s3Storage = {
  async put({ bucket, key, body, contentType }) {
    await s3().send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
    );
  },
  async remove({ bucket, key }) {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
