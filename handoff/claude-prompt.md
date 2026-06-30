# Claude Follow-Up Prompt

You are the code-writing agent for `SecureFarm AWS Lab`, a deliberately
vulnerable web security and AWS monitoring lab.

Read these files before coding:

- `AGENTS.md`
- `handoff/codex-review.md`
- `handoff/claude-summary.md`
- `app/server/src/app.js`
- `app/server/src/uploads.js`
- `app/server/test/api.test.js`

## Objective

Fix the Codex review findings in `handoff/codex-review.md` for the S3-backed
plot attachment feature. Keep the changes narrowly scoped to the findings.

## Required Fixes

1. Prevent orphaned S3 objects when metadata persistence fails.
   - In `POST /api/plots/:id/uploads`, the object is uploaded to S3 before the
     `plot_uploads` metadata row is inserted.
   - Wrap the metadata insert/select step in `try/catch`.
   - If metadata persistence fails after `storage.put()` succeeds, attempt
     `storage.remove({ bucket, key })` before returning a generic failure
     response.
   - Keep user-facing errors generic and avoid leaking AWS/SQLite internals.
   - Add a server test using the stub storage that proves cleanup is attempted
     when metadata persistence fails after a successful put.

2. Make the test server setup fail fast on listen errors.
   - Update the test setup in `app/server/test/api.test.js` so the promise
     waiting for `app.listen()` rejects if the server emits an `error` event.
   - Preserve the existing test behavior when listen succeeds.

## Constraints

- Do not add new product features.
- Do not change the intentional lab vulnerabilities unless required by these
  fixes.
- Do not perform real AWS or EC2 verification.
- Keep S3 interactions in automated tests stubbed/mocked.

## Verification

Run, if your environment allows it:

```bash
cd app
npm test
npm run build
```

If `npm test` cannot run because the environment blocks local TCP listeners,
state that clearly in `handoff/claude-summary.md` and include any narrower
checks you performed.

## Documentation / Handoff

Update `handoff/claude-summary.md` with:

- Files changed.
- Commands run.
- Test results.
- How each Codex finding was addressed.
- Any remaining gaps.

No changes are required to `app/README.md` or `docs/ec2-deploy.md` unless the
fix changes documented behavior.
