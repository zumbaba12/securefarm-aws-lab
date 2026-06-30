# Claude Summary

Added an authenticated plot-attachment upload feature backed by S3, per
`handoff/claude-prompt.md`. Treated as ordinary S3 functionality, not a new
intentional vulnerability.

## Changes made

- **Config** (`app/server/src/config.js`): added an `upload` section —
  `SECUREFARM_UPLOAD_BUCKET` (default `securefarm-uploads-1111`),
  `SECUREFARM_UPLOAD_PREFIX` (default `plot-uploads`),
  `SECUREFARM_UPLOAD_MAX_BYTES` (default `5242880`), and an optional
  `AWS_REGION`. No AWS access keys are stored here.
- **Uploads module** (`app/server/src/uploads.js`, new): content-type/extension
  allow-list, filename sanitization, server-side S3 key generation, and an
  `s3Storage` backend (PutObject/DeleteObject via `@aws-sdk/client-s3` using the
  default credential provider chain).
- **Schema** (`app/server/src/db.js`): new `plot_uploads` table (id, plot_id,
  user_id, original_name, s3_bucket, s3_key, content_type, size_bytes,
  created_at).
- **API** (`app/server/src/app.js`): `createApp(db, { storage })` now accepts an
  injectable storage backend; added `multer` (memory storage, size + type
  limits) and routes `GET` / `POST` / `DELETE /api/plots/:id/uploads`.
- **Frontend**: `apiUpload()` multipart helper (`app/client/src/api.js`); an
  Attachments panel on plot detail with an upload control, metadata table, and
  delete (`app/client/src/pages/PlotDetail.jsx`); small upload styles
  (`app/client/src/styles.css`).
- **Dependencies** (`app/server/package.json`): added `@aws-sdk/client-s3` and
  `multer`; lockfile updated.
- **Tests** (`app/server/test/api.test.js`): stubbed S3 + 6 upload tests.
- **Docs**: `app/README.md`, `docs/ec2-deploy.md`, and
  `deploy/securefarm.env.example` updated with upload config, IAM-role behavior,
  local-credentials behavior, and an owner S3 smoke check.

## Upload guardrails (not an intentional vulnerability)

- Auth required on every upload/list/delete route.
- Owners can only act on their own plots.
- S3 keys are generated server-side:
  `plot-uploads/user-<userId>/plot-<plotId>/<uuid>-<sanitized-filename>`.
- Size limited to `SECUREFARM_UPLOAD_MAX_BYTES` (default 5 MiB).
- Allow-list of low-risk types only: `.txt`, `.csv`, `.jpg`/`.jpeg`, `.png`,
  `.pdf`. HTML, SVG, JS, scripts, executables, and archives are rejected.
- Objects uploaded without a public ACL; privacy relies on the bucket's Block
  Public Access settings. Only metadata is returned — contents are never
  rendered inline.
- Generic user-facing errors; AWS SDK details are logged server-side only.

## AWS credentials

The app uses the AWS SDK default credential provider chain. On EC2 this resolves
to the attached instance role (`securefarm-ec2-cloudwatch-role`); locally,
uploads only work if the developer already has valid AWS credentials and bucket
access. No access keys are placed in code, `.env`, seed data, tests, or
examples.

## Commands run

```bash
cd app
npm install        # added @aws-sdk/client-s3 + multer; lockfile updated
npm test           # 13/13 passing
npm run build      # client build clean (41 modules)
```

## Tests and smoke checks

- `npm test` — **13/13 passing**, including the 6 new upload tests: routes
  require auth; a user cannot list/upload for a plot they don't own (404);
  disallowed type rejected (415); oversized file rejected (413); successful
  upload sanitizes the filename, generates a server-side key under
  `plot-uploads/`, and persists/returns metadata.
- `npm run build` — clean.

## Upload tested: mocked (not against real S3)

Automated tests use an in-memory S3 stub, so no real AWS access is required.
Real S3 PutObject/ListObjects was **not** exercised from this environment (no
instance role or credentials available here). The owner runs the real-S3
verification on EC2 via the smoke check added to `docs/ec2-deploy.md`.

## Risks / known gaps

- Real S3 upload path is unverified from here; depends on the EC2 role policy
  and a correct `AWS_REGION` (documented as `ap-southeast-2`).
- Object privacy relies on bucket-level Block Public Access (no per-object ACL
  is sent, which also avoids failures on buckets with ACLs disabled).
- Type checking uses the client-declared MIME plus an extension match, not deep
  content sniffing — bounded by the small allow-list and 5 MiB cap.
- `npm audit` still reports the pre-existing dev-toolchain advisories; no new
  runtime advisories beyond the AWS SDK / multer install.

---

## Follow-up: Codex review fixes (`handoff/codex-review.md`)

Scoped fixes for the two Codex findings on the S3 upload feature. No new product
features; intentional lab vulnerabilities untouched.

### Files changed

- `app/server/src/app.js` — `POST /api/plots/:id/uploads` now wraps the
  `plot_uploads` insert/select in `try/catch`. On metadata failure after a
  successful `storage.put()`, it calls `storage.remove({ bucket, key })` (itself
  guarded) and returns a generic `500 { error: 'Upload failed. Please try
  again.' }`. AWS/SQLite details are logged server-side only.
- `app/server/test/api.test.js` — (1) the `before()` setup now attaches
  `server.once('error', reject)` so the setup promise rejects (instead of
  hanging) if `app.listen()` cannot bind; the handler is removed on success so
  later listener errors don't affect the resolved promise. (2) Added a test that
  drops `plot_uploads` in an isolated app so the insert fails after `put()`, then
  asserts status 500, exactly one `put` and one `remove` with matching
  bucket/key, and that the client error leaks no table/SQL/AWS internals.

### How each finding was addressed

1. **Orphaned S3 objects on metadata failure** — addressed by the try/catch +
   `storage.remove()` cleanup above; proven by the new cleanup test.
2. **Tests hang on listen failure** — addressed by the `server.once('error',
   reject)` handler in the test setup; success path behavior is unchanged.

### Commands run

```bash
cd app
npm test    # 14/14 passing (was 13; +1 cleanup test)
npm run build  # client build clean (41 modules)
```

### Test results

- `npm test` — **14/14 passing**, including the new
  "a successful S3 put is cleaned up when metadata persistence fails" test. The
  logged `metadata persistence failed: no such table: plot_uploads` line is the
  expected server-side-only log for that test; nothing leaks to the client.
- `npm run build` — clean.

Local TCP listen works in this environment, so `npm test` ran normally (the
listen-error path the Codex sandbox hit was not reproduced here, but the new
`error`-event handler covers it).

### Remaining gaps

- The cleanup path itself is best-effort: if `storage.remove()` also fails after
  a metadata failure, the object can still be orphaned (logged, not retried).
  This matches the finding's requested scope.
