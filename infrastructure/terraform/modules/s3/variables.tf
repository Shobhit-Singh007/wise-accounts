variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "kms_key_arn" {
  description = "ARN of KMS key for SSE"
  type        = string
  default     = ""
}
