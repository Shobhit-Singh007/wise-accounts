# deploy-ec2.ps1 — Build, save, upload Docker images to EC2 via S3
# Usage: .\scripts\deploy-ec2.ps1

$ErrorActionPreference = "Stop"

$S3_BUCKET = "wise-accounts-deploy"
$S3_REGION = "us-east-1"
$BACKEND_IMAGE = "ghcr.io/shobhit-singh007/wise-accounts-backend:latest"
$NGINX_IMAGE = "ghcr.io/shobhit-singh007/wise-accounts-nginx:latest"

Write-Host "`n=== Step 1: Building Docker images ===" -ForegroundColor Yellow

Write-Host "Building backend..." -ForegroundColor Cyan
docker build -t $BACKEND_IMAGE ./backend
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }

Write-Host "Building nginx..." -ForegroundColor Cyan
docker build -t $NGINX_IMAGE -f Dockerfile.nginx .
if ($LASTEXITCODE -ne 0) { throw "Nginx build failed" }

Write-Host "`n=== Step 2: Saving images ===" -ForegroundColor Yellow
docker save $BACKEND_IMAGE -o backend-image.tar
docker save $NGINX_IMAGE -o nginx-image.tar

$backendSize = (Get-Item backend-image.tar).Length / 1MB
$nginxSize = (Get-Item nginx-image.tar).Length / 1MB
Write-Host "  backend-image.tar: $([math]::Round($backendSize, 1)) MB" -ForegroundColor Cyan
Write-Host "  nginx-image.tar: $([math]::Round($nginxSize, 1)) MB" -ForegroundColor Cyan

Write-Host "`n=== Step 3: Uploading to S3 ===" -ForegroundColor Yellow
aws s3 cp backend-image.tar s3://$S3_BUCKET/ --region $S3_REGION
aws s3 cp nginx-image.tar s3://$S3_BUCKET/ --region $S3_REGION

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "`nNow run these commands on EC2 (via Session Manager):" -ForegroundColor Yellow
Write-Host @"
cd ~/wise-accounts

# Generate presigned URLs
BACKEND_URL=`$(aws s3 presign s3://$S3_BUCKET/backend-image.tar --expires-in 3600 --region $S3_REGION)
NGINX_URL=`$(aws s3 presign s3://$S3_BUCKET/nginx-image.tar --expires-in 3600 --region $S3_REGION)

# Download
curl -o backend-image.tar "`$BACKEND_URL"
curl -o nginx-image.tar "`$NGINX_URL"

# Load & restart
sudo docker load -i backend-image.tar
sudo docker load -i nginx-image.tar
sudo /usr/libexec/docker/cli-plugins/docker-compose -f docker-compose.prod.yml up -d

# Verify
sudo docker ps
curl http://localhost/api/v1/health
"@ -ForegroundColor Cyan
