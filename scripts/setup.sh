#!/bin/bash

# ===== CONFIGURATION =====
FORGE_INSTALLER_URL=https://maven.minecraftforge.net/net/minecraftforge/forge/1.21.8-58.1.0/forge-1.21.8-58.1.0-installer.jar
MINECRAFT_USER=minecraft
SERVER_DIR=/opt/minecraft/server
MAX_RAM=6G
MIN_RAM=2G
# =========================

# Update system and install Java
yum update -y
yum install -y java-21-amazon-corretto-headless wget

# Create minecraft user and directories
adduser $MINECRAFT_USER
mkdir -p $SERVER_DIR
chown -R $MINECRAFT_USER:$MINECRAFT_USER /opt/minecraft

cd $SERVER_DIR

# Download and run Forge installer
sudo -u $MINECRAFT_USER wget $FORGE_INSTALLER_URL -O forge-installer.jar
sudo -u $MINECRAFT_USER java -jar forge-installer.jar --installServer

# Rename the generated Forge JAR
FORGE_JAR=$(ls $SERVER_DIR/forge-*.jar | grep -v installer)
sudo -u $MINECRAFT_USER mv "$FORGE_JAR" server.jar

# Accept EULA
echo "eula=true" > eula.txt
chown $MINECRAFT_USER:$MINECRAFT_USER eula.txt

# Create start script
cat <<EOF > $SERVER_DIR/start
#!/bin/bash
cd $SERVER_DIR || exit 1
exec java -Xmx$MAX_RAM -Xms$MIN_RAM -jar server.jar nogui
EOF
chmod +x $SERVER_DIR/start
chown $MINECRAFT_USER:$MINECRAFT_USER $SERVER_DIR/start

# Create stop script
cat <<EOF > $SERVER_DIR/stop
#!/bin/bash
pkill -u $MINECRAFT_USER -f "java"
EOF
chmod +x $SERVER_DIR/stop
chown $MINECRAFT_USER:$MINECRAFT_USER $SERVER_DIR/stop

# Create systemd service
cat <<EOF > /etc/systemd/system/minecraft.service
[Unit]
Description=Minecraft Forge Server
Wants=network-online.target
After=network-online.target

[Service]
User=$MINECRAFT_USER
WorkingDirectory=$SERVER_DIR
ExecStart=$SERVER_DIR/start
ExecStop=$SERVER_DIR/stop
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable minecraft
systemctl start minecraft
