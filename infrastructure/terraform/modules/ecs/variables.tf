variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "alb_security_group_id" {
  description = "Security group ID for the ALB"
  type        = string
}

variable "ecs_tasks_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for the ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "container_image" {
  description = "Docker image URI"
  type        = string
}

variable "container_cpu" {
  description = "CPU units for Fargate task"
  type        = number
}

variable "container_memory" {
  description = "Memory in MiB for Fargate task"
  type        = number
}

variable "container_port" {
  description = "Container port"
  type        = number
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
}

variable "min_count" {
  description = "Minimum number of tasks for autoscaling"
  type        = number
}

variable "max_count" {
  description = "Maximum number of tasks for autoscaling"
  type        = number
}

variable "domain_name" {
  description = "Domain name for Route53 record"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
}

variable "db_host" {
  description = "RDS endpoint address"
  type        = string
}

variable "db_port" {
  description = "RDS port"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "redis_host" {
  description = "Redis endpoint"
  type        = string
}

variable "redis_port" {
  description = "Redis port"
  type        = string
}

variable "jwt_secret" {
  description = "JWT secret"
  type        = string
  sensitive   = true
}

variable "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  type        = string
}

variable "cognito_app_client_id" {
  description = "Cognito app client ID"
  type        = string
}

variable "cognito_identity_pool_id" {
  description = "Cognito identity pool ID"
  type        = string
}

variable "invoices_bucket" {
  description = "Invoices S3 bucket name"
  type        = string
}

variable "backups_bucket" {
  description = "Backups S3 bucket name"
  type        = string
}

variable "assets_bucket" {
  description = "Assets S3 bucket name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "ses_sender_email" {
  description = "SES sender email"
  type        = string
  default     = ""
}

variable "sns_topic_email" {
  description = "SNS topic email"
  type        = string
  default     = ""
}

variable "additional_env_vars" {
  description = "Additional environment variables"
  type        = map(string)
  default     = {}
}

variable "task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of KMS key for log encryption"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = ""
}
