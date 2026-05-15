# Agent OS

Version-controlled Agent OS repository for OpenCode. Consolidated AI configurations from OpenCode and Gemini CLI with a 3-tier deep reasoning architecture using **DeepSeek V4 Pro** (via OpenCode credential store) and **Gemini 3.1 Pro Preview** (via API key).

## Architecture

```
my-agent-os/
├── opencode.json              # Central configuration (providers, MCP, permissions)
├── agents/
│   ├── orchestrator.md        # Tier 1: Primary terminal manager (DeepSeek V4 Pro)
│   ├── discovery.md           # Tier 2: UI exploration thinker (DeepSeek V4 Pro + thinking)
│   ├── vision.md              # Tier 3: Headless vision parser (Gemini 3.1 Pro)
│   └── gemini-instructions.md # Migrated Gemini CLI async execution protocol
├── skills/
│   ├── browser-agent/         # Persistent Chromium browser agent (migrated)
│   └── browser-telemetry/     # Playwright-based headless telemetry
├── tools/
│   └── browser.ts             # Browser tool definitions (migrated)
└── mcp/
    └── settings.json          # MCP server configurations
```

## 3-Tier Reasoning Pipeline

| Tier | Agent | Model | Role |
|------|-------|-------|------|
| 1 | `orchestrator` | deepseek/deepseek-v4-pro | Task routing & terminal management |
| 2 | `discovery` | deepseek/deepseek-v4-pro (thinking) | Deep UI exploration & selector mapping |
| 3 | `vision` | google/gemini-3.1-pro-preview | Visual parsing of screenshots to text |

## Global Setup

Add this to your `~/.zshrc` or `~/.bashrc` to activate the Agent OS globally:

```bash
export OPENCODE_CONFIG_DIR="$HOME/my-agent-os"
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Required API Keys

The following environment variables must be set (already configured in this machine's `~/.bashrc`):

```bash
export DEEPSEEK_API_KEY="sk-..."    # DeepSeek API key (also in opencode credential store)
export GEMINI_API_KEY="AIza..."     # Google Gemini API key
export BRAVE_API_KEY="BSA..."       # Brave Search API key
```

**Note:** The DeepSeek provider uses OpenCode's credential store (`~/.local/share/opencode/auth.json`), so the env var is a fallback. The Gemini provider uses `{env:GEMINI_API_KEY}` in the config.

## Usage

```bash
# Default (orchestrator agent)
opencode run "Deploy the app"

# UI exploration
@discovery Map the UI of https://example.com

# Vision analysis
@vision Analyze /tmp/ui-state.png
```

## Verification

```bash
opencode debug config          # View resolved configuration
opencode agent list            # List all agents
opencode models google         # List Gemini models
opencode models deepseek       # List DeepSeek models
```

## Browser Telemetry Skill

The `browser-telemetry` skill provides headless Playwright actions:

```bash
python3 ~/my-agent-os/skills/browser-telemetry/run.py '{"action": "navigate", "url": "https://example.com"}'
```

Supported actions: `navigate`, `click`, `type`, `scroll`, `press`, `hover`, `select`, `wait`, `evaluate`, `screenshot`.

## Harvested Configs

| Source | Destination |
|--------|-------------|
| `~/.gemini/GEMINI.md` | `agents/gemini-instructions.md` |
| `~/.config/opencode/skills/browser-agent/` | `skills/browser-agent/` |
| `~/.config/opencode/tools/browser.ts` | `tools/browser.ts` |
| `~/.config/opencode/mcp.json` | `mcp/settings.json` |
| `~/.config/opencode/opencode.json` (providers) | merged into `opencode.json` |
| `~/.local/share/opencode/auth.json` (credentials) | DeepSeek key stays in credential store |
