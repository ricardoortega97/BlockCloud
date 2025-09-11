import boto3

class EventBridgeManager:
    """
    Class to disable an EventBridge rule when the EC2 instance is stopped in the idle check process.
    """
    def __init__(self, rule_name: str, region_name: str = 'us-east-1'):
        self.rule_name = rule_name
        self.event = boto3.client('events', region_name=region_name)

    def disable_rule(self):
        """
        Disables the EventBridge rule specified by rule_name.
        :return: A message indicating the rule has been disabled.
        """
        self.event.disable_rule(Name=self.rule_name)
        return f"Rule {self.rule_name} has been disabled."