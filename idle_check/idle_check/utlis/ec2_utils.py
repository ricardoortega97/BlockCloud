import boto3
from botocore.exceptions import ClientError
import logging

class EC2Manager:
    """
    Manages EC2 instance lifecycle and sends commands to the Minecraft server via SSM.
    """
    def __init__(self, instance_id: str, region_name: str):
        self.instance_id = instance_id
        self.ec2_client = boto3.client('ec2', region_name=region_name)
        self.ssm_client = boto3.client('ssm', region_name=region_name)
        self.logger = logging.getLogger(__name__)

    def stop(self):
        """Stops the EC2 instance and waits until fully stopped."""
        try:
            stop_response = self.ec2_client.stop_instances(InstanceIds=[self.instance_id])
            waiter = self.ec2_client.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[self.instance_id])
        except ClientError as e:
            if e.response['Error']['Code'] == 'IncorrectInstanceState':
                self.logger.error("Instance is in an incorrect state. Ensure it is running before stopping.")
                raise
        return stop_response

    def get_public_ip(self) -> str:
        """Returns the public IP address of the EC2 instance."""
        try:
            response = self.ec2_client.describe_instances(InstanceIds=[self.instance_id])
            reservations = response.get('Reservations', [])
            if reservations:
                instances = reservations[0].get('Instances', [])
                if instances:
                    return instances[0].get('PublicIpAddress', '')
            return ''
        except ClientError as e:
            self.logger.error(f"Error retrieving public IP: {e}")
            return ''

    def send_mc_command(self, command: str):
        """Sends a command to the Minecraft server process via AWS SSM."""
        try:
            response = self.ssm_client.send_command(
                InstanceIds=[self.instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={'commands': [f'screen -S minecraft -p 0 -X stuff "{command}\n"']}
            )
            return response['Command']['CommandId']
        except ClientError as e:
            if e.response['Error']['Code'] == 'IncorrectInstanceState':
                self.logger.error("Instance is in an incorrect state or SSM agent is not running.")
            raise
