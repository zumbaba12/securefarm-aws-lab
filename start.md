# Cloud Security Lab: Secure + Attack + Monitor a Small Web App on AWS

## Project Overview

Build a small intentionally vulnerable web app, deploy it on AWS, attack it in a controlled way, then secure and monitor it using AWS security tools.

This project combines:

- **Web security**: login, SQL injection/XSS concepts, brute force, insecure configurations
- **Cloud security**: IAM, logging, monitoring, WAF, vulnerability scanning
- **DevOps**: deployment, networking, DNS, TLS, database, backups
- **Portfolio value**: document before/after security improvements

---

## Project Name Idea

**SecureFarm AWS Lab**

A mini farm-management dashboard where users can register, log in, add farm plots, upload images, and view data.

This connects nicely to TerraAgra-style experience, but should be made as a separate lab project.

---

## Main Goal

The goal is not to build a perfect production app.

The goal is to learn a realistic cloud security workflow:

```text
Build -> Misconfigure -> Attack -> Detect -> Fix -> Document
