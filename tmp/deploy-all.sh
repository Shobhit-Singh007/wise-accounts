#!/bin/bash
cd /home/ec2-user/wise-accounts
curl -s -o /home/ec2-user/wise-accounts/backend.tar "https://wise-accounts-deploy.s3.us-east-1.amazonaws.com/backend-latest.tar?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAZ7WUGORBBOXDWSCX%2F20260717%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260717T061146Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=e0f22077377c8847df138d93fc3727c48f90581b1d81bc1f986b086b37b66965"
docker load -i /home/ec2-user/wise-accounts/backend.tar
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
rm -f /home/ec2-user/wise-accounts/backend.tar
curl -s -o /tmp/admin-dist.zip "https://wise-accounts-deploy.s3.us-east-1.amazonaws.com/admin-dist.zip?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAZ7WUGORBBOXDWSCX%2F20260717%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260717T061147Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=1c67af34fe28e7207fb3bfbcebbbf174738d94583bd0750c25ba88731c0e8b25"
mkdir -p /tmp/admin-dist
unzip -o /tmp/admin-dist.zip -d /tmp/admin-dist
docker cp /tmp/admin-dist/. wise-accounts-nginx:/usr/share/nginx/html/admin/
rm -rf /tmp/admin-dist /tmp/admin-dist.zip
echo "DEPLOY DONE"
