## Documentation for idle_check

### Purpose

This project runs as a backend service on AWS Lambda, providing serverless execution of Python code for scalable and cost-efficient automation. It integrates with Discord slash commands to manage a Minecraft server hosted on an EC2 instance via EventBridge.

The main purpose is to reduce unnecessary server runtime by automatically stopping the instance when no players are online (after 30 minutes of inactivity). Any member of the Discord server can easily start or stop the Minecraft server without relying on a local PC.

### How It Works

- A Discord slash command triggers an API request that starts the EventBridge rule and the EC2 instance hosting the Minecraft server.
- The AWS Lambda function *idle_check* runs on a schedule to monitor server activity.
- If no players have been online for 30 minutes, the Lambda function issues commands to save progress and stop the EC2 instance.
- This ensures the server only runs when needed, saving costs while letting any Discord member start or stop it without using a local machine.

### Deployment Instructions

1. **Prepare the Environment**
    - Ensure you have Python 3.10 or higher installed (compatible with AWS Lambda).
    - Install all required packages listed in `requirements.txt` using:
      ```
      pip install -r requirements.txt -t ./package
      ```
    - Move your source code into the `package` directory.

2. **Create the Deployment Package**
    - Zip the contents of the `package` directory (not the directory itself):
      ```
      cd package
      zip -r ../lambda_function.zip .
      ```
    - The resulting `lambda_function.zip` file is ready for upload to AWS Lambda.

3. **AWS Lambda Environment Requirements**
    - Runtime: Python 3.10 or higher (choose based on your code compatibility).
    - Memory: Configure according to workload (default is 128 MB).
    - Timeout: Set an appropriate timeout the function (e.g., 45 sec)
    - Environment Variables: Define any required vairables in the Lambda Configuration.

      - `INSTANCE_ID`: EC2 instance id
      - `RULE_NAME`: EventBridge rule name
      - `AWS_REGION`: AWS region where the services are at, ex: us-east-2 
      - `DISCORD_WEBHOOK_URL`: webhook url from Discord bot which will send a message in the sever

4. **AWS EventBridge Requirements**
    - Rule Type: Sheduled
      - For this project, EventBridge rule is triggered by a Discord slash command.
    - Target: AWS Lambda function that manages the EC2 server start/stop.
    - Permisions: 
      -EventBridge needs permission to invoke your Lambda Function.
      - Ensure the Lambda execution role allows `lambda:InvokeFunction`.
    - Rele Name: Set a descriptive name, eg., `start-mc-server-rule`.
    - [**Important**] Region: Must match the region of your Lambda and EC2 instance, else will need to create a VPC rule to configure. 

5. **Apply Least Privilege Principle**
    - Please apply the least privilege princile w/ IAM roles and users in AWS (I had created a user for the bot to use as it was inside the pi desktop).

6. **Testing Locally**
    - You can use tools like [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html) or [localstack](https://github.com/localstack/localstack) to test your Lambda function locally before deployment.

### Requirements

- All Python dependencies must be listed in `requirements.txt`.
- The Lambda handler must be defined (e.g., `lambda_function.lambda_handler`).
- Ensure compatibility with the AWS Lambda Python runtime.

### Notes

- Do not include unnecessary files (such as tests or documentation) in the deployment zip.
- If your code uses native dependencies, ensure they are compiled for the Lambda environment (Amazon Linux).
- Might be outdated since there was some mixup between the code here and in the Lambda...

### License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).