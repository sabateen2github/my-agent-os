# Agent OS

Version-controlled, global **Agent OS** repository built on the **OpenCode 2026 specification**. Migrated configurations from OpenCode and Gemini CLI with a 3-tier deep reasoning architecture using **DeepSeek V4 Pro** and **Gemini 3.1 Pro**.

## Architecture

```
my-agent-os/
├── opencode.json          # Central configuration (providers, models, MCP, permissions)
├── agents/
│   ├── orchestrator.md    # Primary terminal manager (DeepSeek V4 Pro)
│   ├── discovery.md       # UI exploration thinker (DeepSeek V4 Pro Think)
│   └── vision.md          # Headless vision parser (Gemini 3.1 Pro)
├── skills/
│   ├── browser-agent/     # Persistent Chromium browser agent
│   └── browser-telemetry/ # Playwright-based headless telemetry
├── tools/
│   └── browser.ts         # Browser tool definitions
└── mcp/
    └── settings.json      # MCP server configurations (Brave Search, etc.)
```

## 3-Tier Reasoning Pipeline

| Tier | Agent | Model | Role |
|------|-------|-------|------|
| 1 | `orchestrator` | deepseek-v4-pro | Task routing & terminal management |
| 2 | `discovery` | deepseek-v4-pro-think | Deep UI exploration & selector mapping |
| 3 | `vision` | gemini-3.1-pro | Visual parsing of screenshots to text |

## Global Setup

No manual file copying required. Add this to your `~/.zshrc` or `~/.bashrc` to activate the Agent OS globally:

```bash
export OPENCODE_CONFIG_DIR="$HOME/my-agent-os"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## API Keys

Set the following environment variables before use:

```bash
export DEEPSEEK_API_KEY="sk-..."
export GEMINI_API_KEY="..."
export BRAVE_API_KEY="BSA..."
```

## Usage

```bash
# Default (orchestrator agent)
opencode run "Deploy the app"

# UI exploration
opencode run "Map the UI of https://example.com" --agent discovery

# Vision analysis
opencode run "Analyze /tmp/ui-state.png" --agent vision
```

## Harvested Configs

| Source | Destination |
|--------|-------------|
| `~/.gemini/GEMINI.md` | `agents/gemini-instructions.md` |
| `~/.config/opencode/skills/browser-agent/` | `skills/browser-agent/` |
| `~/.config/opencode/tools/browser.ts` | `tools/browser.ts` |
| `~/.config/opencode/mcp.json` | `mcp/settings.json` |
| `~/.config/opencode/opencode.json` → merged providers | `opencode.json` |
