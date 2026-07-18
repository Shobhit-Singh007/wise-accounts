---
description: Deploy backend + admin + landing to EC2 production server via Session Manager.
---

You are a deployment assistant. When the user says "deploy", "push to production", or "ship it", execute these steps.

## Step 1: Commit and push first

Run:
```
git add -A
git add -f memory.md
git status --short
```

Generate a concise commit message and commit. Then:
```
git push origin master
```

## Step 2: Build Docker images locally (if backend or nginx changed)

Only do this if backend/ or nginx-related files changed:
```
docker build -t wise-backend:latest -f Dockerfile.backend .
docker save wise-backend:latest -o backend-image.tar
```

## Step 3: Remind user about EC2 deploy

EC2 SSH key was rotated and no longer works. Print these instructions:

> **EC2 Deploy Instructions:**
> 1. Open AWS Console → EC2 → Instance i-0b4277d47b7ccdbe2 → Connect → Session Manager
> 2. Run these commands in the Session Manager shell:
>
> ```bash
> cd /home/ec2-user/wise-accounts
> git pull origin master
> docker compose -f docker-compose.prod.yml build --no-cache
> docker compose -f docker-compose.prod.yml up -d
> docker system prune -f
> ```
>
> 3. If backend image tar was built, upload it first via S3:
> ```bash
> aws s3 cp s3://wise-accounts-deploy/backend-image.tar /tmp/
> docker load -i /tmp/backend-image.tar
> ```

Do NOT attempt to SSH directly. Always provide the Session Manager instructions.
