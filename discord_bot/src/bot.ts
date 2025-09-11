import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstanceStatusCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { EventBridgeClient, EnableRuleCommand, DisableRuleCommand } from "@aws-sdk/client-eventbridge";
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const region = 'us-east-1';

const ec2 = new EC2Client({ region: region });
const eventBridge = new EventBridgeClient({ region: region });

// Command definitions for the bot 
const commands = [
    new SlashCommandBuilder().setName("start").setDescription("Start the MC server"),
    new SlashCommandBuilder().setName("stop").setDescription("Stop the MC server"),
    new SlashCommandBuilder().setName("status").setDescription("Getting the status of the EC2 instance"),
    new SlashCommandBuilder().setName("help").setDescription("List available commands")
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
// Register commands with Discord API
async function registerCommands() {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commands }
    );
    console.log("Commands registered");
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
// Handle the /start command and wait for the instance to be running, then it gets the IP address
    if (interaction.commandName === "start") {
        try {
            await interaction.reply("Starting the MC server...");
            const startResult = await ec2.send(new StartInstancesCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!] }));
            if (!startResult.StartingInstances || startResult.StartingInstances.length === 0) {
                throw new Error("No instances were started. Please check the instance ID.");
            }

            // Wait for the instance to be in 'running' state
            let status = "";
            for (let i = 0; i < 20; i++) { // check status for up to 1 minute
                const statusData = await ec2.send(new DescribeInstanceStatusCommand({
                    InstanceIds: [process.env.EC2_INSTANCE_ID!],
                    IncludeAllInstances: true
                }));
                status = statusData.InstanceStatuses?.[0]?.InstanceState?.Name || "";
                if (status === "running") break;
                await new Promise(res => setTimeout(res, 3000));
            }

            // Get the public IP address
            const data = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!] }));
            const ipAddress = data.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
            if (ipAddress) {
                await interaction.followUp(`MC server started! Server IP: ${ipAddress}`);
                // Enable the EventBridge rule
                interaction.followUp("Enabling scheduled stop rule.");
                await eventBridge.send(new EnableRuleCommand({ Name: process.env.EVENTBRIDGE_RULE_NAME! }));
            } else {
                await interaction.followUp("MC server started, but no public IP address was assigned. The instance may be in a private subnet or not yet assigned an IP.");
            }

        } catch (error) {
            console.error(error);
            await interaction.followUp("Failed to start the MC server. Please try again later.");
        }
    }
    if (interaction.commandName === "stop") {
        try {
            await interaction.reply("Stopping the MC server...");
            const stopResult = await ec2.send(new StopInstancesCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!] }));
            if (!stopResult.StoppingInstances || stopResult.StoppingInstances.length === 0) {
                throw new Error("No instances were stopped. Please check the instance ID.");
            }

            // Disable the EventBridge rule
            await eventBridge.send(new DisableRuleCommand({ Name: process.env.EVENTBRIDGE_RULE_NAME! }));

            await interaction.followUp("MC server stopped.");
        } catch (error) {
            console.error(error);
            await interaction.followUp("Failed to stop the MC server. Please try again later.");
        }
    }

    if (interaction.commandName === "status") {
        const data = await ec2.send(new DescribeInstanceStatusCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!], IncludeAllInstances: true }));
        const status = data.InstanceStatuses?.[0]?.InstanceState?.Name || "unknown";
        await interaction.reply(`MC server status: ${status}`);
    }
    if (interaction.commandName === "help") {
        await interaction.reply("Available commands: /start, /stop, /status");
    }
});

client.login(process.env.DISCORD_TOKEN!);
registerCommands();