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

variable "subnet_ids" {
  description = "List of subnet IDs"
  type        = list(string)
}

variable "node_type" {
  description = "ElastiCache node type"
  type        = string
}

variable "num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "ecs_tasks_security_group_id" {
  description = "Security group ID of ECS tasks"
  type        = string
}

variable "sns_topic_arn" {
  description = "ARN of SNS topic for notifications"
  type        = string
  default     = ""
}
