#!/bin/bash
# Run bot 4 times with 15-second intervals
cd /home/distiller/projects/tockstalk-bot

for i in {1..4}; do
  echo "=== Attempt $i of 4 ==="
  xvfb-run -a --server-args="-screen 0 1920x1080x24" node src/bot.js

  # If booking succeeded, stop
  if [ $? -eq 0 ]; then
    echo "Booking successful! Stopping."
    exit 0
  fi

  # Sleep 15 seconds between attempts (except after last one)
  if [ $i -lt 4 ]; then
    sleep 15
  fi
done

echo "All attempts completed"
