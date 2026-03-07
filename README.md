## BlockCloud

**BlockCould** is a project that integrates a Discord Bot and an AWS Serverless function to showcase my full-stack + cloud engineering skills. 

My goal was to use a Discord bot to start our Minecraft Server that will be on a EC2 instance on behalf instead of waiting for the friend that had the server on their computer and port forwarding their modem. 

I wanted to also strengthen my understanding of AWS cloud services while also considering the cost optimization strategies (because we are broke...).

### Project Overview

- **Discord Bot** - Automates AWS tasks (start/stop EC2 instance, checks the status)
  - **Docker + Raspberry Pi** - The Discord Bot containerized with Docker and is deployed on a Raspberry Pi for lightweight, always-on hosting. 

- **Idle Check** - A scheduled service using AWS Lambda + EventBridge 

## Architecture Diagram

![BlockCloud architecture](./images/mcServer.webp)

## Documentation for discord_bot

### Purpose

This project runs as a backend service that integrates Discord slash commands with AWS infrastructure for managing the MC server hosted on the EC2 instance. 

It provides a simple interface for our Discord server member to start, stop, or check the status of th Minecraft server without requiring the need of a member to host the server on their local pc. Combining Discord API with AWS SDK calls, the bot automates cloud resource management in a user-friendly way.

### How It Works

- A Discord slash command is issued(/start, /stop, /status).
- The bot receives the command with the API and validates it.
- `/start`:
  - Starts the Server.
  - Enables the EventBridge idle check rule.
  - Since the instance uses a **public IP**, each start will result in an new IP address.
  -  (Optional) You can associate an **Elastic IP** for a permanent address, but note that Elastic IPs may incur additional AWS costs if left unattached.
- `/stop`:
  - Disables the rule.
  - Saves the world file.
  - Stops the EC2 instance.
- `/status`:
  - Checks the status of the EC2 instance.

### Deployment Instructions 

1. **Prepare the Environment**
    - Ensure you have Node.js v18 or higher installed (compatible w/ Discord.js v14)

2. **Install Dependencies**

    ```bash
    pip install -r requirements.txt
    ```

3. **Configure Environment**
    - Create a `.env` file or update the configuration file with your Discord bot token and any required settings.
    
    #### Required Environment Variables:
    - `DISCORD_TOKEN`: Bot token from the Discord Developer Portal.
    - `DISCORD_CLIENT_ID`: Client/application ID.
    - `AWS_REGION`: AWS region of your infrastructure (e.g., us-east-2).
    - `INSTANCE_ID`: EC2 instance ID for the Minecraft server.
    - `RULE_NAME`: EventBridge rule name tied to idle checking.

4. **Apply Least Privilege Principle**
    - Please apply the least privilege principle w/ IAM roles and users in AWS (I had created a user for the bot to use as it was inside the pi desktop).

5. **Run the Bot**
    - locally (for testing):

    ```bash
    python bot.py
    ```
    - As a Service (prod):
      - Docker or similar
      - Raspberry Pi

### Requirements for discord_bot.py

- Node.js v18+
- discord.js v14+
- AWS SDK for Node.js (v3 recommended)
- A registered Discord application with bot token and slash command  

### Notes

- Ensure your bot token is kept secure and never shared publicly.
- Refer to the documentation for troubleshooting and advanced configuration.
- For support or feature requests, open an issue on the repository.
- Will add more in the futures that will benefit my discord server and user-friendly+ 

### Future added features goals:

- Add Elastic IP address to the EC2 instance for a permanent address.
- More slash commands that will use AWS SSM to save, reset, debug the MC server.
- Limit permissions for the server so only certain members can send discord commands.

## Documentation for idle_check

### Purpose

This project runs as a backend service on AWS Lambda, providing serverless execution of Python code for scalable and cost-efficient automation. It integrates with Discord slash commands to manage a Minecraft server hosted on an EC2 instance via EventBridge.

The main purpose is to reduce unnecessary server runtime by automatically stopping the instance when no players are online (after 30 minutes of inactivity). Any member of the Discord server can easily start or stop the Minecraft server without relying on a local PC.

### How It Works

- A Discord slash command triggers an API request that starts the EventBridge rule and the EC2 instance hosting the Minecraft server.

- The AWS Lambda function `idle_check` runs on a schedule to monitor server activity.

- If no players have been online for 30 minutes, the Lambda function issues commands to save progress and stop the EC2 instance.

- This ensures the server only runs when needed, saving costs while letting any Discord member start or stop it without using a local machine.

### Deployment Instructions

1. **Prepare the Environment**
    - Ensure you have **Python 3.10** or higher installed (compatible with AWS Lambda).

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
    - Runtime: **Python 3.10** or higher (choose based on your code compatibility).
    - Memory: Configure according to workload (default is 128 MB).
    - Timeout: Set an appropriate timeout the function (e.g., 45 sec)
    - Environment Variables: Define any required variables in the Lambda Configuration.

      - `INSTANCE_ID`: EC2 instance id
      - `RULE_NAME`: EventBridge rule name
      - `AWS_REGION`: AWS region where the services are at, ex: us-east-2 
      - `DISCORD_WEBHOOK_URL`: webhook url from Discord bot which will send a message in the sever

4. **AWS EventBridge Requirements**
    - Rule Type: Scheduled

      - For this project, EventBridge rule is triggered by a Discord slash command.

    - Target: AWS Lambda function that manages the EC2 server start/stop.

    - Permissions: 
    
      - EventBridge needs permission to invoke your Lambda Function.

      - Ensure the Lambda execution role allows `lambda:InvokeFunction`.
    - Rule Name: Set a descriptive name, eg., `start-mc-server-rule`.
    - [**Important**] Region: Must match the region of your Lambda and EC2 instance, else will need to create a VPC rule to configure. 

5. **Apply Least Privilege Principle**
    - Please apply the least privilege principle w/ IAM roles and users in AWS (I had created a user for the bot to use as it was inside the pi desktop).

6. **Testing Locally**
    - You can use tools like [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html) or [localstack](https://github.com/localstack/localstack) to test your Lambda function locally before deployment.

### Requirements for idle_check

- All Python dependencies must be listed in `requirements.txt`.
- The Lambda handler must be defined (e.g., `lambda_function.lambda_handler`).
- Ensure compatibility with the AWS Lambda Python runtime.

### Notes

- Do not include unnecessary files (such as tests or documentation) in the deployment zip.

- If your code uses **native dependencies**, ensure they are compiled for the Lambda environment (Amazon Linux).

- Might be outdated since there was some mixup between the code here and in the Lambda...



## Challenges & Learnings

1. **Docker on Raspberry Pi** 

   Running the bot container on an ARM-based device caused compatibility issues. Although the container stayed active, slash command requests didn’t go through at first. After debugging, I realized the Raspberry Pi needed its own AWS credentials. I created a dedicated IAM user, stored credentials securely in an .env file, and got the bot working end-to-end. 

2. **EventBridge**

    This was my first time using EventBridge to connect a Discord bot with a Lambda function. While I was able to create a rule that stopped idle servers after a set time, integrating it with the bot caused issues: the rule sometimes triggered incorrectly or fired before the EC2 instance had fully started. I solved this by refining the event logic and adding proper ordering between start/stop workflows.

3. **AWS SDK & Debugging**

    - Learning the AWS SDKs for both Node.js and Python required digging into the official docs to understand their structure.

    - Debugging Lambda meant relying on CloudWatch logs to fine-tune event patterns and limits. 

    - Minecraft status library required a fixed IP, but since I avoided attaching an Elastic IP to save costs, I used AWS SSM to dynamically fetch the instance’s public IP address. 

## Tech Stack
 - Application: Node.js + TypeScript, Python
 - Infra: AWS Lambda, EC2, EventBridge, IAM, SSM
 - Deployment: Docker, Raspberry Pi 4 

 ## License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
