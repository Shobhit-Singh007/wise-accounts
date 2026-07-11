variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming and tagging"
  type        = string
  default     = "wise-accounts"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "wiseaccounts"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "multi_az" {
  description = "Enable multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "wise-accounts-cluster"
}

variable "ecs_service_name" {
  description = "Name of the ECS service"
  type        = string
  default     = "wise-accounts-api"
}

variable "container_image" {
  description = "Docker image URL for the NestJS app"
  type        = string
}

variable "container_cpu" {
  description = "CPU units for the Fargate task"
  type        = number
}

variable "container_memory" {
  description = "Memory in MiB for the Fargate task"
  type        = number
}

variable "container_port" {
  description = "Port exposed by the container"
  type        = number
  default     = 3000
}

variable "app_desired_count" {
  description = "Desired number of ECS tasks"
  type        = number
}

variable "app_min_count" {
  description = "Minimum number of ECS tasks for auto-scaling"
  type        = number
}

variable "app_max_count" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS"
  type        = string
  default     = ""
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "cognito_callback_urls" {
  description = "List of callback URLs for Cognito OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/callback"]
}

variable "cognito_logout_urls" {
  description = "List of logout URLs for Cognito OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/logout"]
}

variable "ses_sender_email" {
  description = "Verified SES email address for sending emails"
  type        = string
  default     = ""
}

variable "sns_topic_email" {
  description = "Email for SNS notification subscriptions"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_enhanced_monitoring" {
  description = "Enable RDS enhanced monitoring"
  type        = bool
  default     = false
}

variable "kms_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30
}

variable "additional_environment_variables" {
  description = "Additional environment variables for the NestJS app"
  type        = map(string)
  default     = {}
}

variable "enable_waf" {
  description = "Enable WAF ACL"
  type        = bool
  default     = true
}
