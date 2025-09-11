import boto3
from botocore.exceptions import ClientError
import logging

class EC2Manager:
    """
    A class to manage EC2 instances, specifically for stopping instances and sending commands to a Minecraft server running on the instance.
    :param ec2_client: A Boto3 EC2 client.
    :param ssm_client: A Boto3 SSM client.
    :param instance_id: The ID of the EC2 instance to manage.
    """
    def __init__(self, instance_id: str, region_name: str):
        self.instance_id = instance_id
        self.ec2_client = boto3.client('ec2', region_name=region_name)
        self.ssm_client = boto3.client('ssm', region_name=region_name)
        self.logger = logging.getLogger(__name__)

    def stop(self):
        """
        Stops the EC2 instance specified by instance_id and waits until the instance is fully stopped.
        :raises ClientError: If there is an error stopping the instance.
        :return: The response from the stop_instances call.
        """
        try:
            stop_response = self.ec2_client.stop_instances(InstanceIds=[self.instance_id])
            waiter = self.ec2_client.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[self.instance_id])
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'IncorrectInstanceState':
                self.logger.error(
                    "Couldn't stop instance because it's in an incorrect state. "
                    "Ensure the instance is running before stopping it."
                )
                raise

        return stop_response

    def get_public_ip(self) -> str:
        """
        Retrieves the public IP address of the EC2 instance.
        :return: The public IP address as a string.
        """
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
        """
        Sends a command to the Minecraft server running on the EC2 instance via AWS Systems Manager (SSM).
        :param command: The command to send to the Minecraft server.

        :returns str: The command ID of the command.
        """
        try:
            response = self.ssm_client.send_command(
                InstanceIds=[self.instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={'commands': [f'screen -S minecraft -p 0 -X stuff "{command}\n"']}
            )
            command_id = response['Command']['CommandId']
            return command_id

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'IncorrectInstanceState':
                self.logger.error(
                    "Couldn't send command because the instance is in an incorrect state. "
                    "Ensure the instance is running and has SSM agent installed."
                )
            raise