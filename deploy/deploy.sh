#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/securefarm/securefarm-aws-lab}"
APP_SUBDIR="$APP_DIR/app"
DB_PATH="${SECUREFARM_DB:-/var/lib/securefarm/securefarm.sqlite}"
DB_DIR="$(dirname "$DB_PATH")"
SERVICE_NAME="${SERVICE_NAME:-securefarm}"

echo "Deploying SecureFarm from $APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Error: $APP_DIR is not a Git repository." >&2
  exit 1
fi

cd "$APP_DIR"
git pull

cd "$APP_SUBDIR"
npm ci
npm run build

sudo mkdir -p "$DB_DIR"
sudo chown "$(id -un):$(id -gn)" "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH; seeding demo data."
  SECUREFARM_DB="$DB_PATH" npm run seed
else
  echo "Database already exists at $DB_PATH; skipping seed."
fi

sudo systemctl restart "$SERVICE_NAME"
sudo nginx -t
sudo systemctl reload nginx

curl -fsS http://127.0.0.1:4000/api/health >/dev/null
curl -fsS http://127.0.0.1/api/health >/dev/null

echo "Deploy complete."
