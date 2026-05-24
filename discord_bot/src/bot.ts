import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstanceStatusCommand, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { SchedulerClient, GetScheduleCommand, UpdateScheduleCommand } from "@aws-sdk/client-scheduler";
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const region = process.env.AWS_REGION || 'us-east-1';

const ec2 = new EC2Client({ region });
const scheduler = new SchedulerClient({ region });

async function setScheduleState(state: 'ENABLED' | 'DISABLED') {
    const schedule = await scheduler.send(new GetScheduleCommand({
        Name: process.env.EVENTBRIDGE_RULE_NAME!,
        GroupName: 'default'
    }));
    await scheduler.send(new UpdateScheduleCommand({
        Name: process.env.EVENTBRIDGE_RULE_NAME!,
        GroupName: 'default',
        ScheduleExpression: schedule.ScheduleExpression!,
        FlexibleTimeWindow: schedule.FlexibleTimeWindow!,
        Target: schedule.Target!,
        State: state
    }));
}

// Slash command definitions
const commands = [
    new SlashCommandBuilder().setName("start").setDescription("Start the MC server"),
    new SlashCommandBuilder().setName("stop").setDescription("Stop the MC server"),
    new SlashCommandBuilder().setName("status").setDescription("Get the status of the EC2 instance"),
    new SlashCommandBuilder().setName("help").setDescription("List available commands")
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

async function registerCommands() {
    await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commands }
    );
    console.log("Commands registered");
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "start") {
        try {
            await interaction.reply("Starting the MC server...");
            const startResult = await ec2.send(new StartInstancesCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!] }));
            if (!startResult.StartingInstances || startResult.StartingInstances.length === 0) {
                throw new Error("No instances were started. Please check the instance ID.");
            }

            // Poll until instance is in 'running' state (up to ~1 minute)
            let status = "";
            for (let i = 0; i < 20; i++) {
                const statusData = await ec2.send(new DescribeInstanceStatusCommand({
                    InstanceIds: [process.env.EC2_INSTANCE_ID!],
                    IncludeAllInstances: true
                }));
                status = statusData.InstanceStatuses?.[0]?.InstanceState?.Name || "";
                if (status === "running") break;
                await new Promise(res => setTimeout(res, 3000));
            }

            const data = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [process.env.EC2_INSTANCE_ID!] }));
            const ipAddress = data.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;
            if (ipAddress) {
                await interaction.followUp(`MC server started! Server IP: ${ipAddress}`);
                interaction.followUp("Enabling scheduled idle-check rule.");
                await setScheduleState('ENABLED');
            } else {
                await interaction.followUp("MC server started, but no public IP was assigned.");
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
            await setScheduleState('DISABLED');
            await interaction.followUp("MC server stopped.");
        } catch (error) {
            console.error(error);
            await interaction.followUp("Failed to stop the MC server. Please try again later.");
        }
    }

    if (interaction.commandName === "status") {
        const data = await ec2.send(new DescribeInstanceStatusCommand({
            InstanceIds: [process.env.EC2_INSTANCE_ID!],
            IncludeAllInstances: true
        }));
        const status = data.InstanceStatuses?.[0]?.InstanceState?.Name || "unknown";
        await interaction.reply(`MC server status: ${status}`);
    }

    if (interaction.commandName === "help") {
        await interaction.reply("Available commands: /start, /stop, /status");
    }
});

client.login(process.env.DISCORD_TOKEN!);
registerCommands();
