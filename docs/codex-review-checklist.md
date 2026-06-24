# Codex Review Checklist

Use this checklist after Claude updates the app.

## Functional

- Login works with seeded demo credentials.
- Plots can be listed, created, viewed, and persisted.
- Seasons can be created and displayed for a plot.
- Navigation works at desktop and mobile widths.
- Setup commands in the README are accurate.

## Vulnerability Intent

- Intentional vulnerabilities are clearly marked with `LAB_VULNERABILITY`.
- Each intentional vulnerability has a matching note in `attacks/` or docs.
- The vulnerable behavior is reachable in local/dev lab mode.
- No real secrets or personal data are committed.

## Accidental Risk

- No unnecessary remote calls.
- No third-party target URLs in attack scripts.
- No credential leaks in logs or fixtures.
- No destructive scripts run by default.

## Verification

- Dependency install succeeds.
- App starts locally.
- Unit or integration tests run if present.
- Basic browser smoke test covers login, plots, and seasons.
