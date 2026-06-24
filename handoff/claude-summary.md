# Claude Summary

First runnable build of the SecureFarm app, per `handoff/claude-prompt.md`.

## Stack chosen

As preferred by the prompt: **Node.js + Express API**, **SQLite**
(`better-sqlite3`), **React + Vite** frontend, wired together with npm
workspaces. No deviation — no rationale needed.

## Changes Made

- Created the SecureFarm app under `app/` as an npm-workspace monorepo
  (`server` + `client`).
- **Server (Express + SQLite):** login/session auth (in-memory bearer tokens),
  dashboard summary, plot list/search/create, plot detail, season create/list.
  Schema migration + idempotent seed of one demo user, 3 plots, 3 seasons.
  Auto-seeds an empty DB on first start.
- **Client (React + Vite):** Login, Dashboard, Plots (list/search/add),
  PlotDetail (metadata + seasons + add season). Quiet operational dashboard
  styling (greens/soil neutrals), responsive sidebar layout. Vite dev proxy
  `/api → :4000`.
- Added the three required intentional vulnerabilities, each marked
  `LAB_VULNERABILITY`, with matching notes in `attacks/`.

## Files Changed

Created:

- `app/package.json`, `app/README.md` (README replaced the placeholder)
- `app/server/package.json`
- `app/server/src/config.js`, `db.js`, `auth.js`, `seedData.js`, `seed.js`,
  `app.js`, `index.js`
- `app/server/test/api.test.js`
- `app/client/package.json`, `vite.config.js`, `index.html`
- `app/client/src/main.jsx`, `App.jsx`, `api.js`, `auth.jsx`, `styles.css`
- `app/client/src/components/Layout.jsx`
- `app/client/src/pages/Login.jsx`, `Dashboard.jsx`, `Plots.jsx`, `PlotDetail.jsx`
- `attacks/sql-injection.md`, `attacks/stored-xss.md`, `attacks/weak-auth.md`
- `handoff/claude-summary.md` (this file)

## Intentional Vulnerabilities Added

1. **SQL injection** — `GET /api/plots?search=` interpolates `search` straight
   into the SQL string (`app/server/src/app.js`). PoC: `' OR '1'='1` returns all
   plots; a lone `'` leaks the driver error. See `attacks/sql-injection.md`.
2. **Stored XSS** — plot/season `notes` are stored verbatim and the plot detail
   page renders notes via `dangerouslySetInnerHTML`
   (`app/client/src/pages/PlotDetail.jsx`). PoC:
   `<img src=x onerror="alert('xss-lab')">`. See `attacks/stored-xss.md`.
3. **Weak auth** — plaintext passwords, seeded weak password (`password123`), no
   rate limiting, and verbose/enumerable login errors (`app/server/src/app.js`,
   `db.js`, `seedData.js`, `config.js`). See `attacks/weak-auth.md`.

No other vulnerabilities were intentionally added.

## Setup and Run Commands

```bash
cd app
npm install
npm run dev      # API :4000 + Vite :5173 (auto-seeds empty DB)
# demo login: farmer@securefarm.local / password123
npm test         # server integration tests
```

## Verification Performed

- `npm install` (workspaces) — succeeded.
- `npm test` — **7/7 passing** (login, enumeration message, auth enforcement,
  dashboard counts, plot CRUD, season create, SQLi reachability). Tests exit
  cleanly.
- `npm run build` (client) — succeeded (41 modules, clean build).
- Manual API smoke test via curl against a running server:
  - health + login return a token;
  - SQLi payload `' OR '1'='1` returns all 3 plots vs. 1 for a normal `River`
    search;
  - verbose enumeration message confirmed for unknown email;
  - XSS payload stored verbatim and returned on plot detail fetch;
  - plot + season creation persist; dashboard counts update.
- Build artifacts and the smoke-test SQLite DB were cleaned up afterward.

## Known Gaps / Risks

- **Local-only defaults intentional:** API binds to `127.0.0.1`, demo creds and
  verbose errors are dev-mode only. No HTTPS, no production hardening (by
  design for phase 1).
- **Sessions are in-memory:** tokens reset on server restart; no persistence or
  expiry. Fine for the lab.
- **No frontend automated tests** — manual smoke test only (per prompt scope).
- **SQLi scope:** the injectable query is still constrained by `user_id`, so the
  documented PoC widens results within the demo user's own plots rather than
  cross-user/table extraction. The injection point itself is genuine; deeper
  extraction is left for a later phase with more seeded data.
- `npm audit` reports 2 advisories from the dev toolchain (transitive); not
  addressed in this pass to avoid forced breaking upgrades.
- No AWS, Docker, Terraform, uploads, or other out-of-scope features — excluded
  per the prompt.
