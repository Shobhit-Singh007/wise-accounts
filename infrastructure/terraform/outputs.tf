output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.ecs.alb_dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = module.ecs.alb_zone_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.database_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = module.ecs.service_name
}

output "ecs_task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = module.ecs.task_definition_arn
}

output "invoices_bucket_name" {
  description = "Name of the invoices S3 bucket"
  value       = module.s3.invoices_bucket_name
}

output "invoices_bucket_arn" {
  description = "ARN of the invoices S3 bucket"
  value       = module.s3.invoices_bucket_arn
}

output "backups_bucket_name" {
  description = "Name of the backups S3 bucket"
  value       = module.s3.backups_bucket_name
}

output "backups_bucket_arn" {
  description = "ARN of the backups S3 bucket"
  value       = module.s3.backups_bucket_arn
}

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = module.s3.assets_bucket_name
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = module.s3.assets_bucket_arn
}

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_app_client_id" {
  description = "Cognito app client ID"
  value       = module.cognito.app_client_id
}

output "cognito_identity_pool_id" {
  description = "Cognito identity pool ID"
  value       = module.cognito.identity_pool_id
}

output "kms_key_arn" {
  description = "ARN of the KMS key"
  value       = aws_kms_key.main.arn
}

output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}
