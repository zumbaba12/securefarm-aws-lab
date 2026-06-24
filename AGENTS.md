# Agent Workflow

## Roles

Codex owns:

- Translating the lab goal into implementation prompts.
- Keeping vulnerabilities intentional, bounded, and documented.
- Reviewing Claude's code for correctness, lab value, and accidental risk.
- Writing review output to `handoff/codex-review.md`.

Claude owns:

- Implementing the requested app and lab changes.
- Running relevant local checks.
- Summarizing changes, commands, and risks in `handoff/claude-summary.md`.

## Workflow

1. Codex updates `handoff/claude-prompt.md` with the next build request.
2. Claude implements only what the prompt asks for.
3. Claude updates `handoff/claude-summary.md`.
4. Codex reviews the diff and writes `handoff/codex-review.md`.
5. Claude fixes review findings in a follow-up pass.

## Review Standard

Codex reviews should lead with findings ordered by severity. Reviews should distinguish:

- Intentional lab vulnerabilities requested by the prompt.
- Accidental vulnerabilities that undermine the lab or expose unnecessary risk.
- Functional bugs that block login, plots, seasons, or deployment.
- Missing tests or missing verification.

## Lab Guardrails

- Keep intentionally vulnerable behavior obvious in code and docs.
- Prefer a local-only default configuration.
- Do not hard-code real AWS credentials, personal data, or reusable passwords.
- Seed demo accounts only with fake data.
- Make destructive scripts opt-in and clearly named.
