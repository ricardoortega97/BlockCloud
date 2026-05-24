# Reinstall dependencies when requirements.txt changes
resource "null_resource" "install_dependencies" {
    triggers = {
        requirements = filemd5("${path.module}/../idle_check/requirements.txt")
    }

    provisioner "local-exec" {
        command = "pip install -r ${path.module}/../idle_check/requirements.txt -t ${path.module}/../idle_check/idle_check"
    }
}

# Package Lambda function code + dependencies into a zip
data "archive_file" "lambda_zip" {
    depends_on  = [null_resource.install_dependencies]
    type        = "zip"
    source_dir  = "${path.module}/../idle_check/idle_check"
    output_path = "${path.module}/lambda.zip"
}

# Reference pre-existing IAM roles (created outside Terraform)
data "aws_iam_role" "lambda_role" {
    name = "minecraftLambdaRole"
}

data "aws_iam_role" "eventbridge_role" {
    name = "EventBridge_Invoke_Lambda"
}

data "aws_iam_instance_profile" "ssm_profile" {
    name = "SSMManagedInstanceCoreEC2"
}

# Lambda function
resource "aws_lambda_function" "minecraftLambda" {
    filename         = data.archive_file.lambda_zip.output_path
    function_name    = "minecraftLambda"
    role             = data.aws_iam_role.lambda_role.arn
    handler          = "handler.lambda_handler"
    source_code_hash = data.archive_file.lambda_zip.output_base64sha256
    runtime          = "python3.13"
    timeout          = 30

    environment {
        variables = {
            INSTANCE_ID         = aws_instance.blockcloud_ec2.id
            DISCORD_WEBHOOK_URL = var.discord_webhook
            EVENTBRIDGE_RULE_NAME = "mc-idle-check"
        }
    }
}

# Fetch the latest Amazon Linux 2023 ARM64 AMI (required for t4g instances)
data "aws_ami" "amazon_linux_2023" {
    most_recent = true
    owners      = ["amazon"]

    filter {
        name   = "name"
        values = ["al2023-ami-*-arm64"]
    }
}

# EC2 instance
resource "aws_instance" "blockcloud_ec2" {
    ami                    = data.aws_ami.amazon_linux_2023.id
    instance_type          = "t4g.large"
    vpc_security_group_ids = [aws_security_group.blockcloud_sg.id]
    iam_instance_profile   = data.aws_iam_instance_profile.ssm_profile.name
    user_data              = file("${path.module}/../scripts/setup.sh")

    tags = {
        Name = "blockcloud-ec2"
    }
}

# Security group — Minecraft + SSH ingress, all egress
resource "aws_security_group" "blockcloud_sg" {
    name        = "minecraft_sg"
    description = "Minecraft server security group"

    ingress {
        from_port   = 25565
        to_port     = 25565
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow Minecraft connections"
    }

    ingress {
        from_port   = 22
        to_port     = 22
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
        description = "EC2 Instance Connect"
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
        description = "Allow all outbound"
    }
}

# Allow EventBridge Scheduler to invoke the Lambda
resource "aws_lambda_permission" "eventbridge_invoke" {
    statement_id  = "AllowEventBridgeScheduler"
    action        = "lambda:InvokeFunction"
    function_name = aws_lambda_function.minecraftLambda.function_name
    principal     = "scheduler.amazonaws.com"
    source_arn    = aws_scheduler_schedule.idle_check.arn
}

# EventBridge Scheduler — runs every 2 minutes while enabled
resource "aws_scheduler_schedule" "idle_check" {
    name        = "mc-idle-check"
    description = "Invoke idle-check Lambda every 2 minutes while server is active"
    group_name  = "default"

    flexible_time_window {
        mode = "OFF"
    }

    schedule_expression = "rate(2 minutes)"

    target {
        arn      = aws_lambda_function.minecraftLambda.arn
        role_arn = data.aws_iam_role.eventbridge_role.arn
    }
}
