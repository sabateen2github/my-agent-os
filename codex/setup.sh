#!/usr/bin/env bash
# Agent OS — Codex Ecosystem Setup
# Run: bash ~/my-agent-os/codex/setup.sh
#
# This script bootstraps the full Agent OS ecosystem on Codex + DeepSeek V4-Flash.
# It is safe to run multiple times — it will update in place.

set -euo pipefail

RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; BOLD='\033[1m'; RST='\033[0m'
ok()   { printf "${GREEN}✓${RST} %s\n" "$*"; }
warn() { printf "${YELLOW}!${RST} %s\n" "$*"; }
die()  { printf "${RED}✗ %s${RST}\n" "$*" >&2; exit 1; }
head1(){ printf "\n${BOLD}%s${RST}\n" "$*"; }

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CODEX_DIR="${REPO_DIR}/codex"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

head1 "Agent OS — Codex Ecosystem Setup"
echo "  Repo:     $REPO_DIR"
echo "  Codex:    $CODEX_HOME"
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────
head1 "1/5  Prerequisites"

if ! command -v node &>/dev/null; then
  die "Node.js not found. Install: https://nodejs.org"
fi
ok "Node.js $(node --version)"

# ── 2. Install Codex CLI ──────────────────────────────────────
head1 "2/5  Codex CLI"

if command -v codex &>/dev/null; then
  ok "Codex CLI already installed: $(codex --version 2>&1 | head -1)"
else
  echo "Installing Codex CLI..."
  npm install -g @openai/codex || die "Failed to install Codex CLI"
  ok "Codex CLI installed: $(codex --version 2>&1 | head -1)"
fi

# Ensure ~/.codex exists
mkdir -p "$CODEX_HOME"

# ── 3. API Keys ──────────────────────────────────────────────
head1 "3/5  API Keys"

# DeepSeek
if [ -z "${DEEPSEEK_API_KEY:-}" ]; then
  echo "DEEPSEEK_API_KEY not set."
  read -r -p "Enter your DeepSeek API key (sk-...): " DS_KEY
  case "$DS_KEY" in
    sk-*) export DEEPSEEK_API_KEY="$DS_KEY" ;;
    *) die "API key must start with sk-" ;;
  esac
else
  ok "DEEPSEEK_API_KEY found in environment"
fi

# Brave Search
if [ -z "${BRAVE_API_KEY:-}" ]; then
  warn "BRAVE_API_KEY not set. Brave Search MCP will be installed but may not work."
  echo "  Get one at: https://brave.com/search/api/"
  BRAVE_API_KEY_PLACEHOLDER=""
else
  ok "BRAVE_API_KEY found in environment"
  BRAVE_API_KEY_PLACEHOLDER="$BRAVE_API_KEY"
fi

# ── 4. Install Configs ────────────────────────────────────────
head1 "4/5  Configuration"

# config.toml
echo "Writing config.toml..."
sed -e "s|{DEEPSEEK_API_KEY}|${DEEPSEEK_API_KEY}|g" \
    -e "s|{BRAVE_API_KEY}|${BRAVE_API_KEY:-}|g" \
    "$CODEX_DIR/config.toml" > "$CODEX_HOME/config.toml"
ok "config.toml → $CODEX_HOME/config.toml"

# agent-os-instructions.md
cp "$CODEX_DIR/agent-os-instructions.md" "$CODEX_HOME/agent-os-instructions.md"
ok "agent-os-instructions.md → $CODEX_HOME/agent-os-instructions.md"

# models.json (from DeepSeek CDN)
echo "Fetching DeepSeek model catalog..."
bash <(curl -fsSL https://cdn.deepseek.com/api-docs/codex-deepseek-setup-en.sh) <<< "1" 2>&1 | tail -3
ok "models.json configured"

# ── 5. MCP Dependencies ───────────────────────────────────────
head1 "5/5  MCP Servers"

# Brave Search MCP
if npm list -g @modelcontextprotocol/server-brave-search &>/dev/null; then
  ok "Brave Search MCP already installed"
else
  echo "Installing Brave Search MCP..."
  npm install -g @modelcontextprotocol/server-brave-search
  ok "Brave Search MCP installed"
fi

# Register with Codex (idempotent)
codex mcp remove brave-search 2>/dev/null || true
codex mcp add brave-search --env BRAVE_API_KEY="${BRAVE_API_KEY:-}" -- npx -y @modelcontextprotocol/server-brave-search
ok "Brave Search MCP registered"

# Playwright MCP
if npm list -g @playwright/mcp &>/dev/null; then
  ok "Playwright MCP already installed"
else
  echo "Installing Playwright MCP..."
  npm install -g @playwright/mcp
  ok "Playwright MCP installed"
fi

codex mcp remove playwright 2>/dev/null || true
codex mcp add playwright -- npx @playwright/mcp --cdp-endpoint http://localhost:9222 --browser chrome --caps vision
ok "Playwright MCP registered (browser at localhost:9222)"

# ── Shell Setup ───────────────────────────────────────────────
head1 "Shell Integration"

BASHRC_LINE='source ~/my-agent-os/codex/aliases.sh 2>/dev/null'
if ! grep -qF "codex/aliases.sh" ~/.bashrc 2>/dev/null; then
  echo "$BASHRC_LINE" >> ~/.bashrc
  ok "Added aliases loader to ~/.bashrc"
else
  ok "Aliases already in ~/.bashrc"
fi

# ── Verify ─────────────────────────────────────────────────────
head1 "Verification"

echo ""
codex doctor --summary 2>&1 | grep -E "ok|fail|warn"
echo ""

# ── Done ───────────────────────────────────────────────────────
printf "\n${GREEN}${BOLD}╔══════════════════════════════════════════╗${RST}\n"
printf "${GREEN}${BOLD}║   Agent OS on Codex — Ready!             ║${RST}\n"
printf "${GREEN}${BOLD}╚══════════════════════════════════════════╝${RST}\n\n"
echo "  Run:    codex          → full ecosystem"
echo "  Quick:  cq             → code-only mode"
echo "  Resume: cr             → last session"
echo "  MCPs:   cmcp           → list servers"
echo ""
echo "  Source ~/.bashrc or open a new terminal for aliases."
echo ""
