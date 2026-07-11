resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Redis subnet group for ${var.project_name}-${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-subnet-group"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for Redis"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
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
    Name        = "${var.project_name}-${var.environment}-redis-sg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-redis-pg"
  family      = "redis7"
  description = "Redis parameter group for ${var.project_name}-${var.environment}"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-pg"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project_name}-${var.environment}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled  = true
  apply_immediately          = var.environment == "dev" ? true : false
  auto_minor_version_upgrade = true

  maintenance_window = "sun:06:00-sun:07:00"
  notification_topic_arn = var.sns_topic_arn

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
    Project     = var.project_name
  }
}
