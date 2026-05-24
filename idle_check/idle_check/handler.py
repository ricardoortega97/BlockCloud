import os
import requests
from utlis.mc_utils import get_player_count
from utlis.ec2_utils import EC2Manager
from utlis.eventBridge_utils import EventBridgeManager

INSTANCE_ID = os.environ['INSTANCE_ID']
RULE_NAME = os.environ["EVENTBRIDGE_RULE_NAME"]
DISCORD_WEBHOOK_URL = os.environ['DISCORD_WEBHOOK_URL']
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

ec2 = EC2Manager(INSTANCE_ID, AWS_REGION)
eb = EventBridgeManager(RULE_NAME, AWS_REGION)

def lambda_handler(event, context):
    check_players_handler()

def check_players_handler():
    mc_host = ec2.get_public_ip()
    player_count = get_player_count(mc_host)
    if player_count == 0:
        print("No players online, saving world and stopping instance.")
        ec2.send_mc_command("save-all")
        ec2.send_mc_command("stop")
        eb.disable_rule()
        notify_discord("Server is stopping due to inactivity. No players online.")
        ec2.stop()
    else:
        print(f"Players online: {player_count}, not stopping instance.")
    return {
        'statusCode': 200,
        'body': f'Player count checked: {player_count}'
    }

def notify_discord(message: str):
    """Sends a notification message to a Discord channel via webhook."""
    data = {"content": message}
    response = requests.post(DISCORD_WEBHOOK_URL, json=data)
    if response.status_code != 204:
        print(f"Failed to send Discord message: {response.status_code}, {response.text}")
    else:
        print("Discord notification sent.")
