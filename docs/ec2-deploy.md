# EC2 Deployment Runbook

This runbook deploys the intentionally vulnerable SecureFarm lab app to Ubuntu 24.04 LTS on EC2.

## Current Target

- Public IP: `3.25.94.255`
- Public DNS: `ec2-3-25-94-255.ap-southeast-2.compute.amazonaws.com`
- OS: Ubuntu 24.04 LTS
- Inbound security group:
  - SSH `22`: your IP only
  - HTTP `80`: public
  - HTTPS `443`: public, reserved for later TLS setup
- Outbound security group: any

## Exposure Warning

This app contains intentional vulnerabilities for lab work. Public HTTP access means internet scanners and unknown users can reach the app. Do not put real data, real passwords, AWS credentials, or reusable personal credentials into the app.

The app should still run with the API bound to `127.0.0.1`; Nginx is the public entry point.

## Local Steps

Run these from your workstation before touching EC2:

```bash
git status
git push
```

Deploy from `main` if the PR is merged. Deploy from `implement-securefarm-website` if you intentionally want to deploy the feature branch before merge.

## Server Setup

SSH into the instance:

```bash
ssh ubuntu@3.25.94.255
```

Install OS packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl ca-certificates build-essential nginx
```

Install Node.js 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Clone the repo:

```bash
sudo mkdir -p /opt/securefarm
sudo chown ubuntu:ubuntu /opt/securefarm
git clone https://github.com/zumbaba12/securefarm-aws-lab.git /opt/securefarm
cd /opt/securefarm
git checkout main
```

If deploying the feature branch before merge:

```bash
git checkout implement-securefarm-website
```

## App Install

Install dependencies and build the frontend:

```bash
cd /opt/securefarm/app
npm ci
npm run build
```

Create the SQLite data directory and seed the database:

```bash
sudo mkdir -p /var/lib/securefarm
sudo chown ubuntu:ubuntu /var/lib/securefarm
SECUREFARM_DB=/var/lib/securefarm/securefarm.sqlite npm run seed
```

## Environment

Install the environment file:

```bash
sudo cp /opt/securefarm/deploy/securefarm.env.example /etc/securefarm.env
sudo chmod 640 /etc/securefarm.env
```

Current values:

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
SECUREFARM_DB=/var/lib/securefarm/securefarm.sqlite
```

`NODE_ENV=production` hides the demo credential helper endpoint and UI affordance. The intentional SQL injection, stored XSS, and weak password model remain in this lab version.

## API Service

Install and start the systemd service:

```bash
sudo cp /opt/securefarm/deploy/systemd/securefarm.service /etc/systemd/system/securefarm.service
sudo systemctl daemon-reload
sudo systemctl enable securefarm
sudo systemctl start securefarm
sudo systemctl status securefarm
```

Check API locally from the instance:

```bash
curl -i http://127.0.0.1:4000/api/health
```

## Nginx

Install the Nginx site:

```bash
sudo cp /opt/securefarm/deploy/nginx/securefarm.conf /etc/nginx/sites-available/securefarm
sudo ln -sf /etc/nginx/sites-available/securefarm /etc/nginx/sites-enabled/securefarm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Verify locally from the instance:

```bash
curl -i http://127.0.0.1/
curl -i http://127.0.0.1/api/health
```

Verify publicly from your workstation:

```bash
curl -i http://3.25.94.255/
curl -i http://3.25.94.255/api/health
```

Then open:

- `http://3.25.94.255`
- `http://ec2-3-25-94-255.ap-southeast-2.compute.amazonaws.com`

## Logs

API logs:

```bash
sudo journalctl -u securefarm -f
```

Nginx logs:

```bash
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

## Update Deployment

After pushing a new commit:

```bash
cd /opt/securefarm
git pull
cd app
npm ci
npm run build
sudo systemctl restart securefarm
sudo nginx -t
sudo systemctl reload nginx
```

Run smoke checks again:

```bash
curl -i http://127.0.0.1/api/health
curl -i http://3.25.94.255/api/health
```

## Rollback

Use Git to return to a known commit:

```bash
cd /opt/securefarm
git log --oneline -5
git checkout <known-good-commit>
cd app
npm ci
npm run build
sudo systemctl restart securefarm
sudo systemctl reload nginx
```

SQLite data is stored outside the repo at `/var/lib/securefarm/securefarm.sqlite`.
