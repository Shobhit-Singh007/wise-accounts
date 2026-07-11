variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "callback_urls" {
  description = "List of callback URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/callback"]
}

variable "logout_urls" {
  description = "List of logout URLs for OAuth"
  type        = list(string)
  default     = ["http://localhost:3000/auth/logout"]
}

variable "pinpoint_app_id" {
  description = "Pinpoint application ID for analytics"
  type        = string
  default     = ""
}
