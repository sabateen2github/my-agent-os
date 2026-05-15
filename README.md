# Agent OS

A version-controlled, global Agent OS toolkit for [OpenCode](https://opencode.ai). Consolidates AI configurations from OpenCode and Gemini CLI into a 3-tier deep reasoning architecture backed by **DeepSeek V4 Pro** and **Gemini 3.1 Pro Preview**.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/sabateen2github/my-agent-os.git ~/my-agent-os

# 2. Set API keys
export DEEPSEEK_API_KEY="sk-..."      # https://platform.deepseek.com/api_keys
export GEMINI_API_KEY="AIza..."        # https://aistudio.google.com/apikey
export BRAVE_API_KEY="BSA..."          # https://brave.com/search/api/

# 3. Install Playwright (needed for browser-telemetry skill)
python3 -m pip install --break-system-packages playwright
python3 -m playwright install chromium

# 4. Activate
export OPENCODE_CONFIG_DIR="$HOME/my-agent-os"

# 5. Run
opencode run "Hello"
```

To make it permanent, add to your `~/.bashrc`:

```bash
export DEEPSEEK_API_KEY="sk-..."
export GEMINI_API_KEY="AIza..."
export BRAVE_API_KEY="BSA..."
export OPENCODE_CONFIG_DIR="$HOME/my-agent-os"
```

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| OpenCode CLI | ≥1.15 | `opencode --version` |
| Python 3 | ≥3.10 | `python3 --version` |
| Playwright | latest | `python3 -c "import playwright"` |
| Chromium (Playwright) | — | `python3 -m playwright install chromium` |
| Git | any | `git --version` |

## Architecture

```
my-agent-os/
├── opencode.json              # Central configuration (providers, MCP, permissions)
├── agents/
│   ├── orchestrator.md        # Tier 1: Primary terminal manager (DeepSeek V4 Pro)
│   ├── discovery.md           # Tier 2: UI exploration thinker (DeepSeek V4 Pro + reasoning)
│   ├── vision.md              # Tier 3: Headless vision parser (Gemini 3.1 Pro)
│   └── gemini-instructions.md # Migrated Gemini CLI async execution protocol
├── skills/
│   ├── browser-agent/         # Persistent Chromium browser agent (migrated from OpenCode)
│   └── browser-telemetry/     # Playwright-based headless telemetry
├── tools/
│   └── browser.ts             # Browser tool definitions (migrated from OpenCode)
└── mcp/
    └── settings.json          # MCP server configurations (Brave Search)
```

## 3-Tier Reasoning Pipeline

| Tier | Agent | Model | Role |
|------|-------|-------|------|
| 1 | `orchestrator` | `deepseek/deepseek-v4-pro` | Task routing & terminal management |
| 2 | `discovery` | `deepseek/deepseek-v4-pro` (thinking) | Deep UI exploration & selector mapping |
| 3 | `vision` | `google/gemini-3.1-pro-preview` | Visual parsing of screenshots to text |

**Flow:** User → Orchestrator (routes task) → Discovery (maps UI via Playwright) → Vision (parses screenshots) → back to Orchestrator

## Usage

```bash
# Default (orchestrator agent)
opencode run "Deploy the app"

# Switch to a specific agent
opencode run --agent discovery "Map the UI of https://example.com"

# Invoke a subagent inline
opencode run "@vision Analyze /tmp/ui-state.png"

# List all agents and models
opencode agent list
opencode models deepseek
opencode models google
```

### Browser Telemetry Skill

Execute headless Playwright actions from any agent:

```bash
# Direct CLI use
python3 ~/my-agent-os/skills/browser-telemetry/run.py '{"action": "navigate", "url": "https://example.com"}'
python3 ~/my-agent-os/skills/browser-telemetry/run.py '{"action": "click", "selector": "#btn"}'
python3 ~/my-agent-os/skills/browser-telemetry/run.py '{"action": "type", "selector": "#input", "text": "hello"}'

# From within an agent (orchestrator/discovery)
skill({ name: "browser-telemetry" })
```

Supported actions: `navigate`, `click`, `type`, `scroll`, `press`, `hover`, `select`, `wait`, `evaluate`, `screenshot`

Output: JSON with `screenshot`, `dom`, `network` (requests + responses), `console` (logs), `url`, `title`, `errors`

## API Keys

| Key | Provider | Get it from |
|-----|----------|-------------|
| `DEEPSEEK_API_KEY` | DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| `GEMINI_API_KEY` | Google | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `BRAVE_API_KEY` | Brave Search | [brave.com/search/api](https://brave.com/search/api/) |

> **Note:** The DeepSeek provider also works through OpenCode's built-in credential store (`opencode providers` → `/connect`). The env var is a fallback.

## Verification

```bash
# Confirm the config loads correctly
opencode debug config | python3 -c "import sys,json; d=json.load(sys.stdin); print('model:', d.get('model')); print('agents:', list(d.get('agent',{}).keys()))"

# Confirm agents are discovered
opencode agent list | grep -E '(orchestrator|discovery|vision)'

# Confirm Gemini models are available
opencode models google | head -5
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `opencode` not found | Install from [opencode.ai](https://opencode.ai) or `npm install -g opencode` |
| `permission requested ... auto-rejecting` | Set API keys and add `permission:` block to agent markdown |
| `ModuleNotFoundError: playwright` | Run `python3 -m pip install --break-system-packages playwright` |
| `Chrome not found` | Run `python3 -m playwright install chromium` |
| Vision agent returns empty | Try `google/gemini-2.5-flash` or check GEMINI_API_KEY validity |
| `npx` prompts or hangs | Ensure Node.js ≥18 is installed and `npx` is on PATH |

## Harvested Configs

This repo was built by scanning and migrating existing configurations:

| Source | → Destination |
|--------|--------------|
| `~/.gemini/GEMINI.md` | `agents/gemini-instructions.md` |
| `~/.config/opencode/skills/browser-agent/` | `skills/browser-agent/` |
| `~/.config/opencode/tools/browser.ts` | `tools/browser.ts` |
| `~/.config/opencode/mcp.json` | `mcp/settings.json` |
| `~/.config/opencode/opencode.json` (providers) | merged into `opencode.json` |
| `~/.local/share/opencode/auth.json` (credentials) | DeepSeek key stays in credential store |

## License

MIT
