output "user_pool_id" {
  description = "ID of the Cognito user pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN of the Cognito user pool"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Endpoint of the Cognito user pool"
  value       = aws_cognito_user_pool.main.endpoint
}

output "user_pool_domain" {
  description = "Domain of the Cognito user pool"
  value       = aws_cognito_user_pool_domain.main.domain
}

output "app_client_id" {
  description = "ID of the Cognito app client"
  value       = aws_cognito_user_pool_client.main.id
}

output "app_client_secret" {
  description = "Secret of the Cognito app client"
  value       = aws_cognito_user_pool_client.main.client_secret
  sensitive   = true
}

output "identity_pool_id" {
  description = "ID of the Cognito identity pool"
  value       = aws_cognito_identity_pool.main.id
}

output "identity_pool_arn" {
  description = "ARN of the Cognito identity pool"
  value       = aws_cognito_identity_pool.main.arn
}

output "authenticated_role_arn" {
  description = "ARN of the authenticated IAM role"
  value       = aws_iam_role.cognito_authenticated.arn
}

output "unauthenticated_role_arn" {
  description = "ARN of the unauthenticated IAM role"
  value       = aws_iam_role.cognito_unauthenticated.arn
}

output "resource_server_identifier" {
  description = "Identifier of the Cognito resource server"
  value       = aws_cognito_resource_server.main.identifier
}
