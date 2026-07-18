#!/bin/bash
set -e

# ──────────────────────────────────────────────
# deploy-backend.sh — Build & deploy backend to AWS ECS
# Usage: ./deploy-backend.sh [environment]
#   environment: dev | prod (default: dev)
# ──────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-dev}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $*"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $*"; }
log_error()   { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"; }

# Source environment file
ENV_FILE="${PROJECT_ROOT}/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  log_error "Environment file not found at ${ENV_FILE}"
  exit 1
fi
source "$ENV_FILE"

# ── Configuration ──────────────────────────────────
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID not set}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="wise-accounts-api"
ECR_TAG="${ENVIRONMENT}-$(date '+%Y%m%d-%H%M%S')"
ECR_LATEST_TAG="${ENVIRONMENT}-latest"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

ECS_CLUSTER="wise-accounts-cluster"
ECS_SERVICE="wise-accounts-api"
ECS_TASK_DEF="wise-accounts-${ENVIRONMENT}"

# ── Validate environment ──────────────────────────
if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
  log_error "Invalid environment '${ENVIRONMENT}'. Use 'dev' or 'prod'."
  exit 1
fi

log_info "Starting deployment for environment: ${ENVIRONMENT}"
log_info "ECR URI: ${ECR_URI}"

# ── Step 1: Authenticate Docker with ECR ──────────
log_info "Authenticating Docker with ECR..."
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
log_success "Docker authenticated with ECR"

# ── Step 2: Build Docker image ────────────────────
log_info "Building Docker image..."
docker build \
  -t "${ECR_REPO_NAME}:${ECR_TAG}" \
  -t "${ECR_REPO_NAME}:${ECR_LATEST_TAG}" \
  -f "${PROJECT_ROOT}/backend/Dockerfile" \
  "${PROJECT_ROOT}/backend"
log_success "Docker image built successfully"

# ── Step 3: Tag and push to ECR ──────────────────
log_info "Tagging and pushing images to ECR..."
docker tag "${ECR_REPO_NAME}:${ECR_TAG}" "${ECR_URI}:${ECR_TAG}"
docker tag "${ECR_REPO_NAME}:${ECR_LATEST_TAG}" "${ECR_URI}:${ECR_LATEST_TAG}"

docker push "${ECR_URI}:${ECR_TAG}"
docker push "${ECR_URI}:${ECR_LATEST_TAG}"
log_success "Images pushed to ECR: ${ECR_URI}:${ECR_TAG}"

# ── Step 4: Register new task definition ───────────
log_info "Registering new ECS task definition..."
TASK_DEF_ARN=$(aws ecs describe-task-definition \
  --task-definition "$ECS_TASK_DEF" \
  --region "$AWS_REGION" \
  --query "taskDefinition.taskDefinitionArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$TASK_DEF_ARN" ]; then
  log_info "Task definition '${ECS_TASK_DEF}' not found — using existing service's task def"
  LATEST_TASK_DEF=$(aws ecs describe-services \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$AWS_REGION" \
    --query "services[0].taskDefinition" \
    --output text)
else
  LATEST_TASK_DEF=$TASK_DEF_ARN
fi

NEW_TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition "$LATEST_TASK_DEF" \
  --region "$AWS_REGION" \
  --query "taskDefinition" \
  --output json \
  | jq --arg IMG "${ECR_URI}:${ECR_TAG}" \
    'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy) | .containerDefinitions[0].image = $IMG')

NEW_TASK_DEF_ARN=$(echo "$NEW_TASK_DEF" \
  | aws ecs register-task-definition \
    --region "$AWS_REGION" \
    --cli-input-json "$(echo "$NEW_TASK_DEF" | jq -c '{family: .family, taskRoleArn: .taskRoleArn, executionRoleArn: .executionRoleArn, networkMode: .networkMode, containerDefinitions: .containerDefinitions, volumes: .volumes, placementConstraints: .placementConstraints, requiresCompatibilities: .requiresCompatibilities, cpu: .cpu, memory: .memory}')" \
    --query "taskDefinition.taskDefinitionArn" \
    --output text)

log_success "New task definition registered: ${NEW_TASK_DEF_ARN}"

# ── Step 5: Force new ECS deployment ──────────────
log_info "Updating ECS service to use new task definition..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$NEW_TASK_DEF_ARN" \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --query "service.serviceArn" \
  --output text > /dev/null

log_success "ECS service '${ECS_SERVICE}' updated — new deployment started"

# ── Step 6: Wait for service stability ────────────
log_info "Waiting for service to become stable (this may take several minutes)..."
if aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION" \
  --timeout 600; then
  log_success "Deployment completed successfully! Service is stable."
else
  log_error "Deployment timed out or failed. Checking service events..."
  aws ecs describe-services \
    --cluster "$ECS_CLUSTER" \
    --services "$ECS_SERVICE" \
    --region "$AWS_REGION" \
    --query "services[0].events[0:5]" \
    --output table
  exit 1
fi

# ── Print summary ─────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Summary${NC}"
echo -e "${GREEN}  Environment:    ${ENVIRONMENT}${NC}"
echo -e "${GREEN}  Image:          ${ECR_URI}:${ECR_TAG}${NC}"
echo -e "${GREEN}  ECS Cluster:    ${ECS_CLUSTER}${NC}"
echo -e "${GREEN}  ECS Service:    ${ECS_SERVICE}${NC}"
echo -e "${GREEN}  Task Def:       ${NEW_TASK_DEF_ARN}${NC}"
echo -e "${GREEN}  Deployed At:    $(date)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
