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

Write-Host "`n=== Step 4: Deploying to EC2 via SSM ===" -ForegroundColor Yellow

$EC2_REGION = "us-east-1"
$INSTANCE_ID = aws ec2 describe-instances --filters "Name=tag:Name,Values=wise-accounts" "Name=instance-state-name,Values=running" --query "Reservations[].Instances[].InstanceId" --output text --region $EC2_REGION
if (-not $INSTANCE_ID) { throw "No running EC2 instance found with tag Name=wise-accounts in $EC2_REGION" }
Write-Host "  Found EC2 instance: $INSTANCE_ID" -ForegroundColor Cyan

$BACKEND_URL = aws s3 presign s3://$S3_BUCKET/backend-image.tar --expires-in 3600 --region $S3_REGION
$NGINX_URL = aws s3 presign s3://$S3_BUCKET/nginx-image.tar --expires-in 3600 --region $S3_REGION

$SSM_PARAMS_FILE = Join-Path $PSScriptRoot "..\tmp_ssm.json"
$json = @{
    commands = @(
        "cd /home/ec2-user/wise-accounts",
        "curl -sSf -o backend-image.tar '$BACKEND_URL'",
        "curl -sSf -o nginx-image.tar '$NGINX_URL'",
        "sudo docker load -i backend-image.tar",
        "sudo docker load -i nginx-image.tar",
        "sudo /usr/libexec/docker/cli-plugins/docker-compose -f docker-compose.prod.yml up -d",
        "sleep 5",
        "cd /home/ec2-user/wise-accounts && sudo /usr/libexec/docker/cli-plugins/docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy",
        "sleep 2",
        "sudo docker ps",
        "curl -s http://localhost/api/v1/health"
    )
} | ConvertTo-Json -Compress
[System.IO.File]::WriteAllText($SSM_PARAMS_FILE, $json, [System.Text.UTF8Encoding]::new($false))

$CMD_ID = aws ssm send-command --instance-id $INSTANCE_ID --document-name "AWS-RunShellScript" --parameters "file://$SSM_PARAMS_FILE" --region $EC2_REGION --query "Command.CommandId" --output text
Write-Host "  SSM Command sent: $CMD_ID" -ForegroundColor Cyan

Write-Host "  Waiting for command to complete..." -ForegroundColor Yellow
while ($true) {
    Start-Sleep -Seconds 10
    $STATUS = aws ssm list-command-invocations --command-id $CMD_ID --details --region $EC2_REGION --query "CommandInvocations[0].Status" --output text
    Write-Host "  Status: $STATUS" -ForegroundColor Cyan
    if ($STATUS -eq "Success") { break }
    if ($STATUS -eq "Failed" -or $STATUS -eq "Cancelled" -or $STATUS -eq "TimedOut") {
        Write-Host "  Command failed with status: $STATUS" -ForegroundColor Red
        aws ssm list-command-invocations --command-id $CMD_ID --details --region $EC2_REGION --query "CommandInvocations[].{Output:CommandPlugins[].Output}" --output json
        throw "SSM command failed"
    }
}

Write-Host "`n=== Deployment Output ===" -ForegroundColor Green
$OUTPUT = aws ssm list-command-invocations --command-id $CMD_ID --details --region $EC2_REGION --query "CommandInvocations[].CommandPlugins[].Output" --output text
Write-Host $OUTPUT

Write-Host "`n=== DONE ===" -ForegroundColor Green
