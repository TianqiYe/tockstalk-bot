#!/bin/bash
# Start the analytics dashboard server

SCRIPT_DIR="$(dirname "$0")"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# Check if server is already running
if pgrep -f "node src/analytics-server.js" > /dev/null; then
  echo "Analytics server is already running on port 3002"
  echo "Visit: http://localhost:3002"
  exit 0
fi

# Start the server in background
nohup node src/analytics-server.js > data/analytics-server.log 2>&1 &
SERVER_PID=$!

sleep 2

# Check if it started successfully
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ Analytics dashboard started successfully!"
  echo "📊 Visit: http://localhost:3002"
  echo "📝 Server PID: $SERVER_PID"
  echo "📄 Logs: data/analytics-server.log"
else
  echo "❌ Failed to start analytics server"
  echo "Check data/analytics-server.log for errors"
  exit 1
fi
