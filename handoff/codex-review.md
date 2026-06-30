# Codex Re-Review

## Findings

No remaining findings from this follow-up review.

## Resolved Findings

1. **Orphaned S3 objects on metadata failure** — resolved.
   - `app/server/src/app.js` now wraps the `plot_uploads` metadata insert/select
     after `storage.put()` in `try/catch`.
   - On metadata failure, it attempts `storage.remove({ bucket, key })` before
     returning a generic upload failure.
   - `app/server/test/api.test.js` adds a stub-storage regression test that
     forces metadata persistence to fail and verifies the matching S3 object is
     removed.

2. **Tests hang on listener errors** — resolved.
   - `app/server/test/api.test.js` now attaches `server.once('error', reject)`
     while awaiting `app.listen()`.
   - In this sandbox, `npm test` now fails fast instead of hanging when local TCP
     listen is denied.

## Open Questions / Assumptions

- Real S3 upload remains owner-verified after EC2 deployment. Automated tests
  correctly use stubbed S3.
- The MIME/extension allow-list remains an accepted bounded guardrail for this
  lab; it is not deep content inspection.

## Verification Performed

- Read the updated `handoff/claude-summary.md`.
- Reviewed the follow-up changes in `app/server/src/app.js` and
  `app/server/test/api.test.js`.
- Ran `npm run build` from `app/`: passed.
- Ran `npm test` from `app/`: failed fast because this sandbox denies local TCP
  listen. This is expected in this environment and confirms the previous hang is
  fixed here. Claude reports `npm test` passes in their environment.

## Change Summary

Claude fixed the upload failure cleanup path and hardened the test listener
setup against bind errors. The S3 upload feature remains scoped as private,
authenticated plot attachments with stubbed automated tests and owner-run EC2/S3
verification.
