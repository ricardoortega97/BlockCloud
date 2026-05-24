import boto3

class EventBridgeManager:
    def __init__(self, rule_name: str, region_name: str):
        self.rule_name = rule_name
        self.scheduler = boto3.client('scheduler', region_name=region_name)

    def disable_rule(self):
        # Fetch current schedule config to preserve all required fields on update
        schedule = self.scheduler.get_schedule(
            Name=self.rule_name,
            GroupName='default'
        )
        self.scheduler.update_schedule(
            Name=self.rule_name,
            GroupName='default',
            ScheduleExpression=schedule['ScheduleExpression'],
            FlexibleTimeWindow=schedule['FlexibleTimeWindow'],
            Target=schedule['Target'],
            State='DISABLED'
        )
        return f"Schedule {self.rule_name} has been disabled."
