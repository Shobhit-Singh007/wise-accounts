output "endpoint" {
  description = "RDS instance endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "RDS instance address"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "username" {
  description = "RDS master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "arn" {
  description = "ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "id" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.id
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager secret for DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "subnet_group_name" {
  description = "Name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Name of the DB parameter group"
  value       = aws_db_parameter_group.main.name
}
