# Agent OS — Codex Shell Aliases
# Sourced from ~/.bashrc by the setup script

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

# Add agent-os tools to PATH
export PATH="$HOME/my-agent-os/tools:$PATH"

# Browser health check
export AGENT_OS_BROWSER_URL="http://localhost:9222"

# ── Aliases ────────────────────────────────────────────────────
alias codex='\codex'                          # ensure we use the binary
alias agent-os='codex'                        # codex IS agent-os now
alias ca='codex'                              # short alias
alias cr='codex resume --last'                # resume last session
alias clist='codex resume'                    # session picker
alias cmcp='codex mcp list'                   # list MCPs
alias cmcpa='codex mcp add'                   # add MCP
alias ccheck='bash ~/my-agent-os/tools/check-audit-needed.sh'  # audit check
alias browserok='curl -s $AGENT_OS_BROWSER_URL/json/version 2>/dev/null && echo "✓ Browser OK" || echo "✗ Browser DOWN"'

# Quick code-only mode (skip agent-os ecosystem prompt for fast edits)
alias cq='codex -c model_instructions_file=""'

# Update agent-os ecosystem from repo
alias cup='bash ~/my-agent-os/codex/setup.sh'

# Git helpers for the codex branch — same pattern the orchestrator uses
alias gcodex='git -C ~/my-agent-os checkout codex && git -C ~/my-agent-os pull'

# gpush <message> — verify first, commit second, push last. Same as orchestrator.
# Usage: gpush "fix: hardened browser bypass for PX captcha"
gpush() {
  local msg="${*}"
  if [ -z "$msg" ]; then
    echo "Usage: gpush \"<commit message>\""
    echo "  Same pattern as the orchestrator: prove first, commit second, push last."
    return 1
  fi
  (
    cd ~/my-agent-os
    git add codex/ agents/ skills/ tools/ .gitignore 2>/dev/null || true
    git commit -m "$msg" && git push origin codex
  )
}

# Status check — what would be committed?
alias gstat='git -C ~/my-agent-os status'
alias gdiff='git -C ~/my-agent-os diff --stat'
alias glog='git -C ~/my-agent-os log --oneline -10'
