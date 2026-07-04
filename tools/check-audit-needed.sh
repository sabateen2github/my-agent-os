#!/bin/bash
# check-audit-needed.sh — determines if meta-cognition audit is due
# Exit codes: 0 = audit needed NOW, 1 = audit not needed yet, 2 = suggest audit
# Outputs JSON with reasoning

REPO_DIR="${MY_AGENT_OS_DIR:-$HOME/my-agent-os}"
LOG_DIR="${OPENCODE_LOG_DIR:-$HOME/.local/share/opencode/log}"

# Count commits since last meta-cognition commit
LAST_META_COMMIT=$(git -C "$REPO_DIR" log --oneline -100 --grep="meta-cognition" -1 2>/dev/null)
if [ -z "$LAST_META_COMMIT" ]; then
    COMMITS_SINCE=$(git -C "$REPO_DIR" rev-list --count HEAD 2>/dev/null)
else
    LAST_META_HASH=$(echo "$LAST_META_COMMIT" | awk '{print $1}')
    COMMITS_SINCE=$(git -C "$REPO_DIR" rev-list --count "${LAST_META_HASH}..HEAD" 2>/dev/null)
fi
COMMITS_SINCE=${COMMITS_SINCE:-0}

# Count sessions (log files with pattern YYYY-MM-DDTHHMMSS.log)
SESSIONS=$(ls "$LOG_DIR"/20*.log 2>/dev/null | wc -l)

# Find timestamp of last meta-cognition commit for session comparison
if [ -n "$LAST_META_COMMIT" ]; then
    LAST_META_TS=$(git -C "$REPO_DIR" log -1 --format=%ct "${LAST_META_HASH}" 2>/dev/null)
    # Count sessions whose log file mtime is newer than last meta-cognition commit
    SESSIONS_SINCE=0
    for logfile in "$LOG_DIR"/20*.log; do
        [ -f "$logfile" ] || continue
        LOG_MTIME=$(stat -c %Y "$logfile" 2>/dev/null)
        if [ "$LOG_MTIME" -gt "$LAST_META_TS" ]; then
            SESSIONS_SINCE=$((SESSIONS_SINCE + 1))
        fi
    done
else
    SESSIONS_SINCE=$SESSIONS
fi

# Decision logic
NEED_AUDIT=1  # default: no
REASON=""

if [ "$COMMITS_SINCE" -ge 5 ]; then
    NEED_AUDIT=0
    REASON="5+ commits since last audit ($COMMITS_SINCE commits)"
elif [ "$SESSIONS_SINCE" -ge 3 ]; then
    NEED_AUDIT=0
    REASON="3+ sessions since last audit ($SESSIONS_SINCE sessions)"
elif [ "$COMMITS_SINCE" -ge 3 ]; then
    NEED_AUDIT=2
    REASON="3 commits since last audit — suggest but don't require"
fi

# Check for recent config changes
CONFIG_CHANGED=$(git -C "$REPO_DIR" log --oneline "${LAST_META_HASH}..HEAD" -- opencode.json 2>/dev/null | wc -l)
if [ "$CONFIG_CHANGED" -ge 1 ] && [ "$NEED_AUDIT" -eq 1 ]; then
    NEED_AUDIT=0
    REASON="opencode.json changed $CONFIG_CHANGED time(s) since last audit"
fi

cat <<EOF
{
  "need_audit": $([ "$NEED_AUDIT" -eq 0 ] && echo "true" || echo "false"),
  "severity": $([ "$NEED_AUDIT" -eq 0 ] && echo "\"required\"" || ([ "$NEED_AUDIT" -eq 2 ] && echo "\"suggested\"" || echo "\"none\"")),
  "commits_since_audit": $COMMITS_SINCE,
  "sessions_since_audit": $SESSIONS_SINCE,
  "total_sessions": $SESSIONS,
  "config_changed": $([ "$CONFIG_CHANGED" -ge 1 ] && echo "true" || echo "false"),
  "reason": "${REASON}",
  "last_audit_commit": "${LAST_META_HASH:-none}"
}
EOF

exit $NEED_AUDIT
