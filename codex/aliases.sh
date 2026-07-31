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

# Git helpers for the codex branch
alias gcodex='git -C ~/my-agent-os checkout codex && git -C ~/my-agent-os pull'
alias gpush='git -C ~/my-agent-os add -A && git -C ~/my-agent-os commit -m "feat(codex): $(date +%Y-%m-%d) ecosystem update" && git -C ~/my-agent-os push origin codex'
