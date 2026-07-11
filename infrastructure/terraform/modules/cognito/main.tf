resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  auto_verified_attributes = ["email"]

  username_attributes      = ["email"]
  username_configuration {
    case_sensitive = false
  }

  mfa_configuration = "OFF"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "phone_number"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  schema {
    name                = "company_name"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  schema {
    name                = "gstin"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-user-pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-${var.environment}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  refresh_token_validity        = 30
  access_token_validity         = 60
  id_token_validity             = 60

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  analytics_configuration {
    application_id = var.pinpoint_app_id
  }
}

resource "aws_cognito_identity_pool" "main" {
  identity_pool_name               = "${var.project_name}-${var.environment}-identity-pool"
  allow_unauthenticated_identities = true
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.main.id
    provider_name           = aws_cognito_user_pool.main.endpoint
    server_side_token_check = false
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-identity-pool"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role" "cognito_authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          "StringEquals" = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-cognito-authenticated-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role" "cognito_unauthenticated" {
  name = "${var.project_name}-${var.environment}-cognito-unauthenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          "StringEquals" = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.main.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-cognito-unauthenticated-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role_policy" "cognito_authenticated" {
  name = "${var.project_name}-${var.environment}-cognito-authenticated-policy"
  role = aws_iam_role.cognito_authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${var.environment}-invoices-*",
          "arn:aws:s3:::${var.project_name}-${var.environment}-invoices-*/*",
          "arn:aws:s3:::${var.project_name}-${var.environment}-assets-*",
          "arn:aws:s3:::${var.project_name}-${var.environment}-assets-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*",
          "cognito-identity:*"
        ]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents",
          "mobileanalytics:GetReports",
          "mobileanalytics:GetFinancialReports"
        ]
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_iam_role_policy" "cognito_unauthenticated" {
  name = "${var.project_name}-${var.environment}-cognito-unauthenticated-policy"
  role = aws_iam_role.cognito_unauthenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-sync:*"
        ]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "mobileanalytics:PutEvents"
        ]
        Resource = ["*"]
      }
    ]
  })
}

resource "aws_cognito_identity_pool_roles_attachment" "main" {
  identity_pool_id = aws_cognito_identity_pool.main.id

  roles = {
    "authenticated"   = aws_iam_role.cognito_authenticated.arn
    "unauthenticated" = aws_iam_role.cognito_unauthenticated.arn
  }
}

resource "aws_cognito_resource_server" "main" {
  identifier = "${var.project_name}-${var.environment}-resource-server"
  name       = "${var.project_name}-${var.environment}-resource-server"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "api.access"
    scope_description = "API access scope"
  }
}
