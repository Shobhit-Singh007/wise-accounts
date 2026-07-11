resource "aws_db_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-db-subnet-group"
  description = "Database subnet group for ${var.project_name}-${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-subnet-group"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_db_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-pg"
  family      = "postgres16"
  description = "Parameter group for ${var.project_name}-${var.environment}"

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "none"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements,auto_explain"
  }

  parameter {
    name  = "auto_explain.log_min_duration"
    value = "1000"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-pg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-${var.environment}-db"

  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = var.db_max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = var.kms_key_arn

  db_name                     = var.db_name
  username                    = var.db_username
  password                    = var.db_password
  port                        = 5432

  db_subnet_group_name        = aws_db_subnet_group.main.name
  parameter_group_name        = aws_db_parameter_group.main.name
  vpc_security_group_ids      = [aws_security_group.rds.id]

  multi_az                    = var.multi_az
  backup_retention_period     = var.backup_retention_period
  backup_window               = "03:00-04:00"
  maintenance_window          = "sun:05:00-sun:06:00"
  copy_tags_to_snapshot       = true
  delete_automated_backups    = false
  skip_final_snapshot         = false
  final_snapshot_identifier   = "${var.project_name}-${var.environment}-db-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  auto_minor_version_upgrade  = true
  monitoring_interval         = var.enable_enhanced_monitoring ? 60 : 0
  monitoring_role_arn         = var.enable_enhanced_monitoring ? aws_iam_role.rds_enhanced_monitoring[0].arn : null

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = var.kms_key_arn

  deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name        = "${var.project_name}-${var.environment}-db"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_tasks_security_group_id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-monitoring-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name_prefix             = "${var.project_name}-${var.environment}-db-credentials-"
  description             = "Database credentials for ${var.project_name}-${var.environment}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = 7

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-credentials"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
    dbInstanceIdentifier = aws_db_instance.main.id
  })
}
