output "primary_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "primary_endpoint_port" {
  description = "Redis primary endpoint port"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "cluster_id" {
  description = "ElastiCache cluster ID"
  value       = aws_elasticache_cluster.main.cluster_id
}

output "arn" {
  description = "ARN of the ElastiCache cluster"
  value       = aws_elasticache_cluster.main.arn
}

output "parameter_group_name" {
  description = "Name of the ElastiCache parameter group"
  value       = aws_elasticache_parameter_group.main.name
}

output "subnet_group_name" {
  description = "Name of the ElastiCache subnet group"
  value       = aws_elasticache_subnet_group.main.name
}

output "security_group_id" {
  description = "ID of the Redis security group"
  value       = aws_security_group.redis.id
}
