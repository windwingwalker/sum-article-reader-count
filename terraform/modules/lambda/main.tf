resource "aws_ecr_repository" "default" {
  name                 = var.app_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_lambda_function" "default" {
  function_name = var.app_name

  package_type = "Image"
  image_uri = "${aws_ecr_repository.default.repository_url}:${var.tag}"

  role = var.lambda_role
  depends_on = [
    aws_ecr_repository.default,
    aws_cloudwatch_log_group.default
  ]
}

resource "aws_cloudwatch_log_group" "default" {
  name = "/aws/lambda/${var.app_name}"

  retention_in_days = 30
}

resource "aws_lambda_event_source_mapping" "default" {
  event_source_arn = "arn:aws:sqs:us-east-1:${var.aws_account_id}:article-reader-count"
  function_name    = aws_lambda_function.default.arn
  depends_on = [
    aws_lambda_function.default
  ]
}