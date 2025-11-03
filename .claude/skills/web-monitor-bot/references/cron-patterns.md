# Cron Schedule Patterns

Common cron patterns for different monitoring frequencies.

## Syntax
```
* * * * * command
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7, Sun-Sat)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

## Common Patterns

### Every N Minutes
```bash
# Every 5 minutes
*/5 * * * * /path/to/bot.sh

# Every 15 minutes
*/15 * * * * /path/to/bot.sh

# Every 30 minutes
*/30 * * * * /path/to/bot.sh
```

### Hourly
```bash
# Every hour at minute 0
0 * * * * /path/to/bot.sh

# Every 2 hours
0 */2 * * * /path/to/bot.sh
```

### Specific Times
```bash
# Every day at 9:00 AM
0 9 * * * /path/to/bot.sh

# Twice daily (9 AM and 5 PM)
0 9,17 * * * /path/to/bot.sh

# Business hours (9 AM - 5 PM, every hour)
0 9-17 * * * /path/to/bot.sh
```

### Day-Specific
```bash
# Weekdays only at 9 AM
0 9 * * 1-5 /path/to/bot.sh

# Weekends only
0 9 * * 0,6 /path/to/bot.sh

# Mondays at 10 AM
0 10 * * 1 /path/to/bot.sh
```

## Peak Window Pattern

For high-traffic scenarios with a known release time:

```bash
# Peak window: 4 rapid checks at 7:59 PM
59 19 * * * /path/to/peak-run.sh

# Off-peak: Every 5 minutes, skip peak hour
*/5 0-18,20-23 * * * /path/to/bot.sh
```

## Managing Crontab

### View current cron jobs
```bash
crontab -l
```

### Edit crontab
```bash
crontab -e
```

### Add new job without editing
```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * /path/to/bot.sh") | crontab -
```

### Remove all cron jobs
```bash
crontab -r
```

## Tips

1. **Test first**: Run the command manually before adding to cron
2. **Use absolute paths**: Always use full paths to scripts and executables
3. **Redirect output**: Append `>> /path/to/log.txt 2>&1` to capture logs
4. **Avoid overlap**: Use lock files to prevent concurrent executions
5. **Time zones**: Cron uses system time, verify with `date` command
