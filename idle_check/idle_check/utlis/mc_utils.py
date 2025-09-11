from mcstatus import BedrockServer

def get_player_count(host: str) -> int:
    try:
        server = BedrockServer(host, 25565)
        status = server.status()
        return status.players.online
    except Exception as e:
        print(f"Error retrieving player count: {e}")
        return -1
