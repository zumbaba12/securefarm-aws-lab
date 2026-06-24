# SecureFarm AWS Lab

SecureFarm AWS Lab is a deliberately vulnerable farmer-monitor web app used for web security, AWS deployment, attack simulation, detection, and remediation practice.

This repository is not intended to start as a production-secure app. The learning workflow is:

```text
Build -> Misconfigure -> Attack -> Detect -> Fix -> Document
```

## Current Repo Role

This repo is set up for a two-agent workflow:

- `Codex`: lab architect, prompt writer, and code reviewer.
- `Claude`: implementation agent that writes code from [handoff/claude-prompt.md](handoff/claude-prompt.md).

After Claude implements changes, it should update [handoff/claude-summary.md](handoff/claude-summary.md). Codex then reviews the diff and writes findings to [handoff/codex-review.md](handoff/codex-review.md).

## Intended App Scope

The first build should be a minimal farmer monitor app inspired by TerraAgra concepts, but much smaller:

- Login and session handling.
- Plot list and plot detail views.
- Season creation/listing for each plot.
- Dashboard summary for active plots and seasons.
- Seeded sample data for repeatable testing.
- Intentional vulnerabilities for controlled pentesting.

## Suggested Structure

Claude should create the application under `app/`. Supporting lab material should live outside the app:

- `docs/`: product, security, and AWS lab notes.
- `handoff/`: prompts, implementation summaries, and reviews.
- `attacks/`: manual attack notes and safe proof-of-concept payloads.
- `aws/`: deployment and monitoring notes or IaC, when added.
- `deploy/`: EC2 runtime templates for Nginx, systemd, and environment config.
  The current EC2 layout assumes the Git repository is cloned to
  `/opt/securefarm/securefarm-aws-lab`.

## Deployment

The current EC2 deployment runbook is [docs/ec2-deploy.md](docs/ec2-deploy.md).

## Safety Boundary

Run attacks only against local instances or AWS resources that you own and explicitly provision for this lab. Do not point scanners, brute-force tools, or exploit payloads at third-party systems.
