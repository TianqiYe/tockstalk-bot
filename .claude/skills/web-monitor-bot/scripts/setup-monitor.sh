#!/bin/bash
# Interactive setup script for web monitor bot

echo "🤖 Web Monitor Bot Setup"
echo "========================"
echo ""

# Get project directory
read -p "Enter project directory name: " PROJECT_DIR
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Copy template files
SKILL_DIR="$(dirname "$0")/.."
cp "$SKILL_DIR/assets/bot-template.js" ./bot.js
cp "$SKILL_DIR/assets/analytics-server.js" ./analytics-server.js
cp "$SKILL_DIR/assets/dashboard.html" ./dashboard.html
cp "$SKILL_DIR/assets/package.json" ./package.json
cp "$SKILL_DIR/assets/.env.example" ./.env

echo "✅ Template files copied"
echo ""

# Configure .env
echo "📝 Configuration"
read -p "Enter target URL to monitor: " TARGET_URL
read -p "Enter Slack webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK
read -p "Enter analytics dashboard port (default 3002): " ANALYTICS_PORT
ANALYTICS_PORT=${ANALYTICS_PORT:-3002}

cat > .env << EOF
TARGET_URL=$TARGET_URL
TARGET_SELECTOR=body
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK
ANALYTICS_PORT=$ANALYTICS_PORT
EOF

echo "✅ Configuration saved to .env"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Initialize analytics
echo "[]" > analytics.json
echo "✅ Analytics file initialized"
echo ""

# Setup cron
echo "⏰ Cron Schedule Setup"
echo "How often should the bot check?"
echo "1) Every 5 minutes"
echo "2) Every 15 minutes"
echo "3) Every 30 minutes"
echo "4) Every hour"
echo "5) Custom"
read -p "Select option (1-5): " CRON_OPTION

case $CRON_OPTION in
  1) CRON_SCHEDULE="*/5 * * * *" ;;
  2) CRON_SCHEDULE="*/15 * * * *" ;;
  3) CRON_SCHEDULE="*/30 * * * *" ;;
  4) CRON_SCHEDULE="0 * * * *" ;;
  5) read -p "Enter custom cron schedule: " CRON_SCHEDULE ;;
  *) CRON_SCHEDULE="*/15 * * * *" ;;
esac

# Create run script
cat > run-bot.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
xvfb-run -a --server-args="-screen 0 1920x1080x24" node bot.js >> bot.log 2>&1
EOF
chmod +x run-bot.sh

# Create start-analytics script
cat > start-analytics.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
if pgrep -f "node analytics-server.js" > /dev/null; then
  echo "Analytics server is already running"
  exit 0
fi
nohup node analytics-server.js > analytics-server.log 2>&1 &
echo "✅ Analytics dashboard started"
echo "📊 Visit: http://localhost:$ANALYTICS_PORT"
EOF
chmod +x start-analytics.sh

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit bot.js to customize the monitoring logic (look for TODO comments)"
echo "2. Add to crontab: $CRON_SCHEDULE $(pwd)/run-bot.sh"
echo "3. Start analytics dashboard: ./start-analytics.sh"
echo ""
echo "To add to crontab, run:"
echo "(crontab -l 2>/dev/null; echo \"$CRON_SCHEDULE $(pwd)/run-bot.sh >> $(pwd)/bot.log 2>&1\") | crontab -"
