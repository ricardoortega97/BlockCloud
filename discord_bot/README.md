## Documentation for discord_bot 

### Purpose

This project runs as a backend service that integrates Discord slash commands with AWS infrastructure for managing the MC server hosted on the EC2 instance. 

It provides a simple interface for our Discord server memeber to start, stop, or check the staus of th Minecraft server without requiring the need of a member to host the server on their local pc. Combinding Discord API with AWS SDK calls, the bot automates cloud resource management in a user-friendly way.

## How It Works

- A Dicord slash command is issued(/start, /stop, /status).
- The bot receives the command with the API and validaes it.
- `/start`:
  - Starts the Server.
  - Enables the EventBridge idle check rule.
  - Since the instance uses a **public IP**, each start will result in an new IP address.
  -  (Optional) You can associate an **Elastic IP** for a permanent address, but note that Elastic IPs may incur additional AWS costs if left unattached.
- `/stop`:
  - Disables the rule.
  - Saves the world file.
  - Stops the EC2 instnace.
- `/status`:
  - Checks the staus of the EC2 instance.

## Deployment Instructions 

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
    - `DISCORD_CLENT_ID`: Client/application ID.
    - `AWS_REGION`: AWS region of your infrastructure (e.g., us-east-2).
    - `INSTANCE_ID`: EC2 instance ID for the Minecraft server.
    - `RULE_NAME`: EventBridge rule name tied to idle checking.

4. **Apply Least Privilege Principle**
    - Please apply the least privilege princile w/ IAM roles and users in AWS (I had created a user for the bot to use as it was inside the pi desktop).

5. **Run the Bot**
    - locally (for testing):

    ```bash
    python bot.py
    ```
    - As a Service (prod):
      - Docker or similar
      - Raspberry Pi

## Requirements 

- Node.js v18+
- discord.js v14+
- AWS SDK for Node.js (v3 recommended)
- A registered Discord application with bot token and slash command  

## Notes

- Ensure your bot token is kept secure and never shared publicly.
- Refer to the documentation for troubleshooting and advanced configuration.
- For support or feature requests, open an issue on the repository.
- Will add more in the futures that will benefit my discord server and user-friendly+ 

### Future added features goals:

- Add Elastic IP address to the EC2 instance for a permanent address.
- More slash commands that will use AWS SSM to save, reset, debug the MC server.
- Limit permissions for the server so only certain members can send discord commands.

### License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).