#!/bin/bash
# Disable cron jobs after successful booking
echo "Disabling tockstalk cron jobs..."
crontab -l | grep -v "tockstalk-bot" > /tmp/cron-no-tockstalk
crontab /tmp/cron-no-tockstalk
echo "Bot stopped! Cron jobs removed."
echo "To re-enable, manually edit crontab with: crontab -e"
