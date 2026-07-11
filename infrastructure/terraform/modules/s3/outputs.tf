output "invoices_bucket_name" {
  description = "Name of the invoices S3 bucket"
  value       = aws_s3_bucket.invoices.bucket
}

output "invoices_bucket_arn" {
  description = "ARN of the invoices S3 bucket"
  value       = aws_s3_bucket.invoices.arn
}

output "invoices_bucket_id" {
  description = "ID of the invoices S3 bucket"
  value       = aws_s3_bucket.invoices.id
}

output "backups_bucket_name" {
  description = "Name of the backups S3 bucket"
  value       = aws_s3_bucket.backups.bucket
}

output "backups_bucket_arn" {
  description = "ARN of the backups S3 bucket"
  value       = aws_s3_bucket.backups.arn
}

output "backups_bucket_id" {
  description = "ID of the backups S3 bucket"
  value       = aws_s3_bucket.backups.id
}

output "assets_bucket_name" {
  description = "Name of the assets S3 bucket"
  value       = aws_s3_bucket.assets.bucket
}

output "assets_bucket_arn" {
  description = "ARN of the assets S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "assets_bucket_id" {
  description = "ID of the assets S3 bucket"
  value       = aws_s3_bucket.assets.id
}
