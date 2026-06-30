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
plot uploads (auth, ownership, type/size rejection, metadata persistence with a
stubbed S3), and asserts that the intentional SQL-injection point is reachable.

There are no automated frontend tests; smoke-test the UI manually (login →
plots → add plot → plot detail → add season → sign out).

## Configuration

| Env var          | Default                         | Purpose                                    |
| ---------------- | ------------------------------- | ------------------------------------------ |
| `PORT`           | `4000`                          | API port                                   |
| `HOST`           | `127.0.0.1`                     | API bind address (loopback by default)     |
| `NODE_ENV`       | `development`                   | `production` hides demo creds + verbose UI |
| `SECUREFARM_DB`  | `server/data/securefarm.sqlite` | SQLite file path                           |
| `SECUREFARM_UPLOAD_BUCKET` | `securefarm-uploads-1111` | S3 bucket for plot attachments        |
| `SECUREFARM_UPLOAD_PREFIX` | `plot-uploads`          | Key prefix for uploaded objects         |
| `SECUREFARM_UPLOAD_MAX_BYTES` | `5242880` (5 MiB)    | Max upload size in bytes                |
| `AWS_REGION`     | (resolved by SDK)               | Region for the S3 client (e.g. `ap-southeast-2`) |

No AWS access keys are stored in code, `.env`, seed data, tests, or examples.

## Plot attachments (S3 uploads)

Each plot detail page (`/plots/:id`) has an **Attachments** panel where the plot
owner can upload one file at a time. Files are stored in S3 and only their
metadata (original name, S3 key, content type, size, timestamp) is shown in the
UI — object contents are never rendered inline.

### AWS credentials

The app uses the **AWS SDK default credential provider chain** — it does **not**
read AWS access keys from `.env` or code:

- **On EC2:** credentials come from the attached IAM instance role
  (`securefarm-ec2-cloudwatch-role`), which has an S3 upload policy for the
  bucket. No `aws configure` and no static keys are required.
- **Locally:** uploads only work if the developer already has valid AWS
  credentials resolvable by the SDK (e.g. `~/.aws/credentials`, SSO, or
  environment variables) **and** access to the bucket. Without them the upload
  call fails and the UI shows a generic "Upload failed" message; the rest of the
  app still works. Automated tests stub S3, so they never need AWS access.

### Upload guardrails

This feature is treated as ordinary S3 functionality, **not** a new intentional
vulnerability. It enforces:

- Auth required on every upload/list/delete route.
- Owners can only act on their own plots.
- S3 keys are generated server-side:
  `plot-uploads/user-<userId>/plot-<plotId>/<uuid>-<sanitized-filename>`.
- Size limited to `SECUREFARM_UPLOAD_MAX_BYTES` (default 5 MiB).
- Allow-list of low-risk types only: `.txt`, `.csv`, `.jpg`/`.jpeg`, `.png`,
  `.pdf`. HTML, SVG, JS, scripts, executables, and archives are rejected.
- Objects are uploaded without a public ACL; keeping them private relies on the
  bucket's **Block Public Access** settings.
- Generic user-facing errors; AWS SDK details are logged server-side only.

## Intentional vulnerabilities

Each is marked in code with `LAB_VULNERABILITY` and documented under
`../attacks/`:

1. **SQL injection** in plot search (`GET /api/plots?search=`) →
   [`../attacks/sql-injection.md`](../attacks/sql-injection.md)
2. **Stored XSS** in plot/season notes (rendered via `dangerouslySetInnerHTML`)
   → [`../attacks/stored-xss.md`](../attacks/stored-xss.md)
3. **Weak auth controls** — plaintext passwords, no rate limiting, verbose/
   enumerable login errors → [`../attacks/weak-auth.md`](../attacks/weak-auth.md)
