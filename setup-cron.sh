#!/bin/bash

# 设置定时任务：每天早上 9 点运行脚本

SCRIPT_PATH="/Users/yantaomac/.openclaw/workspace/projects/follow-builders-notion/generate-digest-v2.js"
LOG_PATH="/Users/yantaomac/.openclaw/workspace/projects/follow-builders-notion/logs/digest.log"

# 创建日志目录
mkdir -p "$(dirname "$LOG_PATH")"

# 创建 cron 任务
(crontab -l 2>/dev/null; echo "0 9 * * * /usr/bin/node $SCRIPT_PATH >> $LOG_PATH 2>&1") | crontab -

echo "✅ Cron job setup completed!"
echo "📅 Schedule: Every day at 9:00 AM"
echo "📄 Script: $SCRIPT_PATH"
echo "📋 Log: $LOG_PATH"
echo ""
echo "To view current crontab: crontab -l"
echo "To edit crontab: crontab -e"
echo "To test manually: node $SCRIPT_PATH"
