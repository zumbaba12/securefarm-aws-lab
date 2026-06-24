# SecureFarm App

A minimal, **deliberately vulnerable** farmer-monitor web app for the SecureFarm
AWS Lab. Login, plots, seasons, and a dashboard — plus a small set of clearly
marked intentional vulnerabilities for controlled pentesting practice.

> ⚠️ This app contains intentional security flaws. Run it **locally only** (it
> binds to `127.0.0.1` by default) or on AWS infrastructure you own and have
> provisioned for this lab. Do not expose it to untrusted networks.

## Stack

- **API:** Node.js + Express, SQLite (`better-sqlite3`)
- **Frontend:** React + Vite + React Router
- npm **workspaces** (`server`, `client`)

## Layout

```
app/
  package.json        # workspace root + dev scripts
  server/             # Express API + SQLite
    src/              # app.js, db.js, auth.js, seedData.js, index.js, config.js
    test/             # node:test integration tests
    data/             # SQLite file (gitignored, created on first run)
  client/             # React + Vite frontend
    src/pages/        # Login, Dashboard, Plots, PlotDetail
```

## Prerequisites

- Node.js 20+ (built/tested on Node 24)

## Setup

From the `app/` directory:

```bash
npm install        # installs server + client workspaces
npm run seed       # create + seed the SQLite database (optional; see note)
```

> The server also **auto-seeds** an empty database on first start, so
> `npm run seed` is only needed if you want to seed without starting the API.
> To reseed from scratch, delete `server/data/securefarm.sqlite*` and re-run.

## Run (development)

```bash
npm run dev        # starts the API (:4000) and Vite dev server (:5173) together
```

Then open <http://127.0.0.1:5173> and log in.

Run them separately if you prefer:

```bash
npm run dev:api    # Express on http://127.0.0.1:4000
npm run dev:web    # Vite on http://127.0.0.1:5173 (proxies /api -> :4000)
```

## Demo credentials (development only)

```
email:    farmer@securefarm.local
password: password123
```

These are surfaced by the API (`GET /api/demo-credentials`) and the login page
**only** when `NODE_ENV` is not `production`.

## Test

```bash
npm test           # runs server integration tests (node:test)
```

The suite covers login, auth enforcement, dashboard counts, plot/season CRUD,
and asserts that the intentional SQL-injection point is reachable.

There are no automated frontend tests; smoke-test the UI manually (login →
plots → add plot → plot detail → add season → sign out).

## Configuration

| Env var          | Default                         | Purpose                                    |
| ---------------- | ------------------------------- | ------------------------------------------ |
| `PORT`           | `4000`                          | API port                                   |
| `HOST`           | `127.0.0.1`                     | API bind address (loopback by default)     |
| `NODE_ENV`       | `development`                   | `production` hides demo creds + verbose UI |
| `SECUREFARM_DB`  | `server/data/securefarm.sqlite` | SQLite file path                           |

No AWS credentials, third-party URLs, or real secrets are used by the app.

## Intentional vulnerabilities

Each is marked in code with `LAB_VULNERABILITY` and documented under
`../attacks/`:

1. **SQL injection** in plot search (`GET /api/plots?search=`) →
   [`../attacks/sql-injection.md`](../attacks/sql-injection.md)
2. **Stored XSS** in plot/season notes (rendered via `dangerouslySetInnerHTML`)
   → [`../attacks/stored-xss.md`](../attacks/stored-xss.md)
3. **Weak auth controls** — plaintext passwords, no rate limiting, verbose/
   enumerable login errors → [`../attacks/weak-auth.md`](../attacks/weak-auth.md)
