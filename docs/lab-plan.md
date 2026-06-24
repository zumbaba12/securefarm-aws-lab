# Lab Plan

## Goal

Build a small intentionally vulnerable farmer-monitor website, deploy it to owned AWS infrastructure, attack it in controlled ways, detect the activity with AWS tools, then secure and document the before/after state.

## Phases

1. Local vulnerable app
   - Login, plots, seasons, and dashboard summary.
   - Seeded demo user and sample farm data.
   - Documented vulnerabilities that are easy to exercise locally.

2. Local attack notes
   - Manual SQL injection, XSS, weak auth, and insecure upload/session checks where applicable.
   - Store safe payload examples in `attacks/`.

3. AWS vulnerable deployment
   - Deploy to owned AWS infrastructure.
   - Start with a deliberately simple deployment, then add controls.
   - Document network boundaries, IAM permissions, logging, and public endpoints.

4. Monitoring and detection
   - Enable CloudTrail, CloudWatch logs/alarms, VPC flow logs where relevant, AWS WAF logs if an ALB is used, GuardDuty, Inspector, and Security Hub as the lab matures.
   - Map each attack to one or more detection signals.

5. Remediation pass
   - Fix vulnerabilities one at a time.
   - Keep before/after notes with evidence.
   - Add tests for remediated behavior.

## Initial Vulnerability Targets

The first app version should include intentionally vulnerable behavior that is local-lab friendly:

- SQL injection on a search or login path.
- Stored or reflected XSS in plot or season notes.
- Weak login controls with no rate limiting.
- Insecure session or cookie defaults in development.
- Verbose error messages that expose implementation details.

Each vulnerability should be documented with:

- The affected route or screen.
- Why it exists.
- A safe local proof-of-concept.
- The expected detection signal.
- The eventual fix.

## AWS Notes

Do not add AWS credentials to the repo. Use named profiles, environment variables, or CI secrets when deployment automation is introduced.
