# Claude Implementation Prompt

You are the code-writing agent for `SecureFarm AWS Lab`, a deliberately vulnerable web security and AWS monitoring lab.

Read these files before coding:

- `start.md`
- `README.md`
- `AGENTS.md`
- `docs/lab-plan.md`
- `docs/app-spec.md`
- `docs/codex-review-checklist.md`

## Objective

Create the first runnable version of the SecureFarm app under `app/`.

The app should be a minimal farmer monitor website with:

- Login.
- Dashboard.
- Plots.
- Plot detail.
- Seasons.
- Seeded local demo data.
- A small set of clearly documented intentional vulnerabilities for pentesting practice.

## Preferred Stack

Use a stack that is fast to run locally and easy to review. Prefer:

- Node.js + Express API.
- SQLite database.
- React + Vite frontend.

Keep the implementation simple. Do not add Docker, Terraform, AWS SDK integration, background workers, payment systems, email, maps, offline sync, or mobile packaging in this first pass.

If you choose a different stack, explain why in `handoff/claude-summary.md`.

## Product Requirements

Design the UI as a quiet operational dashboard, not a landing page.

Screens:

- `/login`: email/password login, local demo credentials visible only in development.
- `/`: dashboard summary after login.
- `/plots`: list plots, add plot form, basic search/filter.
- `/plots/:id`: plot detail with plot metadata and seasons.
- `/plots/:id/seasons/new` or equivalent inline form: create season.

Data:

- Users: name, email, password or password hash depending on the intentionally vulnerable design.
- Plots: owner, name, location, size hectares, crop type, status, notes.
- Seasons: plot, name/number, crop type, variety, start date, expected harvest date, status, notes.

## Required Intentional Vulnerabilities

Add exactly these lab vulnerabilities in the first pass. Mark each in code with `LAB_VULNERABILITY`.

1. SQL injection in plot search.
   - Create a plot search endpoint that uses unsafe string interpolation.
   - Document a safe local proof-of-concept in `attacks/sql-injection.md`.

2. Stored XSS in plot or season notes.
   - Render notes unsafely on the detail page.
   - Document a safe payload in `attacks/stored-xss.md`.

3. Weak authentication controls.
   - No rate limiting in local lab mode.
   - Verbose login failure behavior or seeded weak demo password.
   - Document the behavior in `attacks/weak-auth.md`.

Do not add more vulnerabilities in this first pass unless they are necessary to make the app run.

## Security Boundary

This is an owned lab app. Make the default config local-only:

- API binds to localhost by default unless explicitly configured.
- Do not include real AWS credentials.
- Do not include third-party target URLs.
- Do not include malware, persistence, credential theft, or evasion logic.

## Documentation Requirements

Update or create:

- `app/README.md` with setup, run, seed, and test commands.
- `attacks/sql-injection.md`.
- `attacks/stored-xss.md`.
- `attacks/weak-auth.md`.
- `handoff/claude-summary.md`.

`handoff/claude-summary.md` must include:

- Files changed.
- Commands run.
- Tests or smoke checks performed.
- Intentional vulnerabilities added.
- Known gaps.

## Quality Requirements

- Keep the code small and readable.
- Add automated tests where practical for core behavior.
- Ensure the app starts from a clean checkout using documented commands.
- Avoid unrelated features from TerraAgraApp. This lab only needs login, plots, and seasons.

## Completion Criteria

Stop when:

- The app can be installed and run locally.
- The demo user can log in.
- Plots and seasons can be viewed and created.
- The three required vulnerabilities are documented and reachable.
- `handoff/claude-summary.md` is complete.
