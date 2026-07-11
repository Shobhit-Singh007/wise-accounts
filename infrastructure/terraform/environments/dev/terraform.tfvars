# Dev environment specific variables

aws_region  = "ap-south-1"
environment = "dev"
project_name = "wise-accounts"

# VPC
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.20.0/24"]
availability_zones   = ["ap-south-1a", "ap-south-1b"]

# RDS
db_instance_class        = "db.t3.medium"
db_allocated_storage     = 20
db_max_allocated_storage = 50
multi_az                 = false
db_backup_retention_period = 7

# ECS
container_image  = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/wise-accounts-api:latest"
container_cpu    = 512
container_memory = 1024
container_port   = 3000
app_desired_count = 1
app_min_count     = 1
app_max_count     = 3

# ElastiCache
redis_node_type = "cache.t3.micro"

# Monitoring & Logging
enable_enhanced_monitoring = false
log_retention_days         = 7

# Security
enable_waf          = false
kms_deletion_window = 7

# Domain
domain_name     = ""
certificate_arn = ""

# SES/SNS
ses_sender_email = ""
sns_topic_email  = ""

# Cognito URLs
cognito_callback_urls = ["http://localhost:3000/auth/callback"]
cognito_logout_urls   = ["http://localhost:3000/auth/logout"]
