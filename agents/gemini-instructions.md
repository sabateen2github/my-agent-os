---
description: Migrated async execution protocol instructions from Gemini CLI
mode: subagent
hidden: true
model: deepseek/deepseek-v4-flash
permission:
  external_directory:
    "/tmp/*": allow
  bash: allow
  read: allow
---
# ASYNC EXECUTION PROTOCOL
* **Never Block:** You are strictly forbidden from running terminal commands in the foreground.
* **Log Isolation:** For every new task, pick a unique, descriptive log name in /tmp/.
* **Execution:** Always use the pattern [command] > /tmp/[your_log_name].log 2>&1 &.
* **Self-Assessment:** After starting a task, immediately give me the PID. Then, use tail or cat on your log to monitor progress and provide updates on what you see.
* **No Waiting:** Do not wait for a command to finish before replying to me.
