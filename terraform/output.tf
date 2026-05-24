output "instance_id" {
    value = aws_instance.blockcloud_ec2.id
}

output "lambda_arn" {
    value = aws_lambda_function.minecraftLambda.arn
}

output "eventbridge_rule" {
    value = aws_scheduler_schedule.idle_check.name
}
