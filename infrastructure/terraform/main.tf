module "vpc" {
  source = "./modules/vpc"

  environment          = var.environment
  project_name         = var.project_name
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = var.availability_zones
  container_port       = var.container_port
}

module "rds" {
  source = "./modules/rds"

  environment               = var.environment
  project_name              = var.project_name
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  db_instance_class         = var.db_instance_class
  db_allocated_storage      = var.db_allocated_storage
  db_max_allocated_storage  = var.db_max_allocated_storage
  db_name                   = var.db_name
  db_username               = var.db_username
  db_password               = var.db_password
  multi_az                  = var.multi_az
  backup_retention_period   = var.db_backup_retention_period
  enable_enhanced_monitoring = var.enable_enhanced_monitoring
  kms_key_arn               = aws_kms_key.main.arn
  ecs_tasks_security_group_id = module.vpc.ecs_tasks_security_group_id
}

module "ecs" {
  source = "./modules/ecs"

  environment         = var.environment
  project_name        = var.project_name
  vpc_id              = module.vpc.vpc_id
  alb_security_group_id   = module.vpc.alb_security_group_id
  ecs_tasks_security_group_id = module.vpc.ecs_tasks_security_group_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  cluster_name        = var.ecs_cluster_name
  service_name        = var.ecs_service_name
  container_image     = var.container_image
  container_cpu       = var.container_cpu
  container_memory    = var.container_memory
  container_port      = var.container_port
  desired_count       = var.app_desired_count
  min_count           = var.app_min_count
  max_count           = var.app_max_count
  domain_name         = var.domain_name
  certificate_arn     = var.certificate_arn
  log_retention_days  = var.log_retention_days
  db_host             = module.rds.endpoint
  db_port             = module.rds.port
  db_name             = module.rds.database_name
  db_username         = var.db_username
  db_password         = var.db_password
  redis_host          = module.elasticache.primary_endpoint
  redis_port          = "6379"
  jwt_secret          = var.jwt_secret
  cognito_user_pool_id       = module.cognito.user_pool_id
  cognito_app_client_id      = module.cognito.app_client_id
  cognito_identity_pool_id   = module.cognito.identity_pool_id
  invoices_bucket            = module.s3.invoices_bucket_name
  backups_bucket             = module.s3.backups_bucket_name
  assets_bucket              = module.s3.assets_bucket_name
  aws_region                 = var.aws_region
  ses_sender_email           = var.ses_sender_email
  sns_topic_email            = var.sns_topic_email
  additional_env_vars        = var.additional_environment_variables
  task_execution_role_arn    = aws_iam_role.ecs_task_execution.arn
  task_role_arn              = aws_iam_role.ecs_task.arn
}

module "s3" {
  source = "./modules/s3"

  environment  = var.environment
  project_name = var.project_name
  kms_key_arn  = aws_kms_key.main.arn
}

module "elasticache" {
  source = "./modules/elasticache"

  environment         = var.environment
  project_name        = var.project_name
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_cache_nodes
  ecs_tasks_security_group_id = module.vpc.ecs_tasks_security_group_id
}

module "cognito" {
  source = "./modules/cognito"

  environment         = var.environment
  project_name        = var.project_name
  callback_urls       = var.cognito_callback_urls
  logout_urls         = var.cognito_logout_urls
}
