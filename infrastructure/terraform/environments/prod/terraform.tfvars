# Production environment specific variables

aws_region  = "ap-south-1"
environment = "prod"
project_name = "wise-accounts"

# VPC (3 AZs for production HA)
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
availability_zones   = ["ap-south-1a", "ap-south-1b", "ap-south-1c"]

# RDS - Larger instance, Multi-AZ, more storage
db_instance_class        = "db.r6g.large"
db_allocated_storage     = 100
db_max_allocated_storage = 500
multi_az                 = true
db_backup_retention_period = 30

# ECS - More resources, higher availability
container_image  = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts-api:prod-latest"
container_cpu    = 1024
container_memory = 2048
container_port   = 3000
app_desired_count = 2
app_min_count     = 2
app_max_count     = 6

# ElastiCache
redis_node_type = "cache.t3.small"

# Monitoring & Logging - Extended retention
enable_enhanced_monitoring = true
log_retention_days         = 90

# Security
enable_waf          = true
kms_deletion_window = 30

# Domain
domain_name     = "wiseaccounts.example.com"
certificate_arn = "arn:aws:acm:ap-south-1:123456789012:certificate/your-cert-arn"

# SES/SNS
ses_sender_email = "noreply@wiseaccounts.example.com"
sns_topic_email  = "ops-alerts@wiseaccounts.example.com"

# Cognito URLs
cognito_callback_urls = ["https://api.wiseaccounts.example.com/auth/callback"]
cognito_logout_urls   = ["https://api.wiseaccounts.example.com/auth/logout"]

# Additional environment variables for production
additional_environment_variables = {
  LOG_LEVEL              = "warn"
  RATE_LIMIT_WINDOW_MS   = "60000"
  RATE_LIMIT_MAX_REQUESTS = "100"
  CORS_ORIGIN             = "https://app.wiseaccounts.example.com"
}
