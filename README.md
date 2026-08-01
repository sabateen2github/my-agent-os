# Agent OS

A version-controlled, global Agent OS toolkit for [OpenCode](https://opencode.ai). Consolidates AI configurations from OpenCode and Gemini CLI into a 3-tier deep reasoning architecture backed by **DeepSeek V4 Flash** (orchestrator/agents) and **Gemini 2.5 Flash-Lite** (vision, 3-6x cheaper).

## Quick Start

```bash
# 1. Clone
git clone https://github.com/sabateen2github/my-agent-os.git ~/my-agent-os

# 2. Set API keys
export DEEPSEEK_API_KEY="sk-..."      # https://platform.deepseek.com/api_keys
export GEMINI_API_KEY="AIza..."        # https://aistudio.google.com/apikey


# 3. Install Playwright (needed for browser-agent server)
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
│   ├── orchestrator.md        # Tier 1: Primary terminal manager (DeepSeek V4 Flash)
│   ├── discovery.md           # Tier 2: UI exploration thinker (DeepSeek V4 Flash)
│   ├── vision.md              # Tier 3: Headless vision parser (Gemini 2.5 Flash-Lite)
│   ├── deep-moat-auditor.md   # Tier 4: Qualitative tech moat research (patents, papers, physics)
│   └── surge-analyst.md       # Tier 4: Investment analyst (quant+qual reconciliation)
├── skills/
│   ├── browser/                # Playwright HTTP API server (deployed to systemd)
│   │   ├── server.py           # Persistent browser backend
│   │   ├── router.py           # Single-entry multiplexer (browser-router.service)
│   │   └── reaper.py           # Idle-instance reaper (systemd timer)
│   ├── browser-agent/           # Browser skill documentation
│   │   └── SKILL.md            # Agent-facing browser documentation
│   ├── catalyst-detector/       # Single source of truth for stock scoring (v3.2)
│   │   └── SKILL.md            # 10 categories, 140 pts, quant+qual reconciliation
│   └── self-enhance/           # Ecosystem self-evolution skill
├── tools/
│   └── browser.ts             # Browser tool definitions (thin client → :9290 router)
└── mcp/
    └── settings.json          # MCP server configurations (empty — browser-only search)
```

## Components & How They Work Together

### The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                        YOU (User)                           │
│                 opencode run "your task"                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 TIER 1: orchestator                         │
│              Model: DeepSeek V4 Flash                    │
│  Routes tasks, manages terminal, delegates complex work      │
│                                                             │
│  Tools: bash, browser_navigate, browser_click, read, edit,  │
│         webfetch, glob, grep, browser search (only)              │
│                                                             │
│  --- When task needs UI exploration ---                     │
│  spawns ──────────► @discovery                              │
│                                                             │
│  --- When it needs to see an image ---                      │
│  spawns ──────────► @vision                                │
└─────────────────────────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌────────────────────┐  ┌──────────────────┐
│  TIER 2: discovery │  │  TIER 3: vision  │
│  DeepSeek V4 Flash │  │  Gemini 2.5 Flash-Lite│
│  (thinking mode)   │  │  (image analysis)│
│                    │  │                  │
│  Maps complex UIs  │  │  Reads screenshots│
│  Finds selectors   │  │  Returns spatial  │
│  Plans interactions│  │  text maps        │
│                    │  │                  │
│  Uses:             │  │  Uses:           │
│  browser-agent API │  │  Read tool       │
│  @vision           │  │                  │
└────────┬───────────┘  └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BROWSER LAYER                              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  browser-agent (Playwright, persistent, HTTP API)     │  │
│  │                                                       │  │
│  │  • HTTP API on :9222 (orchestrator default)           │  │
│  │  • Per-owner windows :9230-9289 for subagents         │  │
│  │    (routed by context.agent, registry:                │  │
│  │     ~/.browser-agents/registry.json)                  │  │
│  │  • Stays alive between calls (persistent Chromium)    │  │
│  │  • systemd service (auto-starts on boot)              │  │
│  │  • userDataDir persists cookies/sessions per owner    │  │
│  │  • Tab management (listTabs, switchTab)               │  │
│  │  • Aggregated telemetry endpoint                      │  │
│  │  • Auto-close: browser-instance-reaper.timer closes   │  │
│  │    idle per-agent windows every minute                │  │
│  │                                                       │  │
│  │  ✓ Stealth mode (always on)                           │  │
│  │  ✓ Session persistence                                │  │
│  │  ✓ Per-agent isolation (cookies/tabs/state)           │  │
│  │  ✓ Network/console log capture                        │  │
│  │  ✓ Memory hygiene (auto-recycle at 800MB)             │  │
│  │  ✓ Tab switching & popup tracking                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Both include STEALTH MODE (enabled by default):             │
│  • --disable-blink-features=AutomationControlled            │
│  • User-Agent without "HeadlessChrome"                      │
│  • navigator.webdriver → false                              │
│  • navigator.plugins → faked                                │
│  • Permissions API → overridden                             │
│  → Bypasses Google OAuth, Cloudflare, bot walls             │
└─────────────────────────────────────────────────────────────┘
```

### Component Glossary

| Component | Runtime | Model | Persistence | Stealth | Purpose |
|-----------|---------|-------|-------------|---------|---------|
| **orchestrator** | OpenCode agent | DeepSeek V4 Flash | — | — | Task routing, terminal ops, delegation |
| **discovery** | OpenCode subagent | DeepSeek V4 Flash | — | Inherited | UI mapping, selector discovery |
| **vision** | OpenCode subagent | Gemini 2.5 Flash-Lite | — | — | Screenshot → spatial text report |
| **browser-agent** | systemd service (:9222) + per-owner (:9230-9289) | Playwright + Chromium | ✅ per-owner userDataDir | ✅ built-in | Interactive browsing, persistent session, per-agent isolation, tab management, aggregated telemetry |


### Data Flow: A Real Example

```
User: "Login to DeepSeek Platform via Google and check my usage"

1. orchestrator loads skill({ name: "browser-agent" })
2. browser_navigate → platform.deepseek.com/sign_in
3. browser_click → Google OAuth button (.ds-sign-in-form__social-button)
4. Redirected to accounts.google.com (stealth bypasses bot detection)
5. browser_type → email, browser_click → Next
6. browser_type → password, browser_click → Next
7. Google 2FA → user taps phone (manual interaction required)
8. browser_evaluate → click Continue on consent screen
9. Redirected to platform.deepseek.com/usage ✅
10. browser_text + browser_screenshot → Extract usage data

Result: Balance $2.62, Monthly $2.37, 1,223 API requests
All session cookies + localStorage persisted to userDataDir
```

### When to Use Which Browser Tool

| Scenario | Use | Why |
|----------|-----|-----|
| Multi-step login / form fill | `browser-agent` tools | Persistent session, no re-auth |
| Quick page snapshot | `browser_telemetry` | Aggregated DOM+network+screenshot in one call |
| OAuth / Google sign-in | `browser-agent` tools | Stealth + persistent cookies |
| SaaS dashboard mapping | `@discovery` (uses browser-agent telemetry) | Structured exploration + vision |
| Extract API responses | Either → `browser_networkLogs` | Capture XHR/fetch calls |
| Localhost dev testing | Either → `"stealth": false` | Skip anti-detection overhead |

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

### Browser Telemetry

Aggregated DOM + network + console + screenshot in a single call:

```bash
# From any agent via curl:
curl -s -X POST http://127.0.0.1:9222 -H 'Content-Type: application/json' \
  -d '{"action":"telemetry","inner":{"action":"navigate","url":"https://example.com"}}'

# From orchestrator via browser_telemetry tool:
browser_telemetry({ inner: { action: "navigate", url: "https://example.com" } })
```


Supported actions: `navigate`, `click`, `type`, `scroll`, `press`, `hover`, `select`, `wait`, `evaluate`, `screenshot`

Output: JSON with `screenshot`, `dom`, `network` (requests + responses), `console` (logs), `url`, `title`, `errors`

## API Keys

| Key | Provider | Get it from |
|-----|----------|-------------|
| `DEEPSEEK_API_KEY` | DeepSeek | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| `GEMINI_API_KEY` | Google | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |


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
| Google OAuth / sign-in blocked | Verify stealth is active: `browser_evaluate({ script: "navigator.webdriver" })` → should be `false`. Restart with `systemctl --user restart browser-agent.service` |
| Browser session lost after restart | `userDataDir` persistence was added in stealth update. First restart after upgrade wipes session; subsequent restarts preserve it |

| `Subagent depth limit reached (N)` | OpenCode ≥1.18 blocks subagents from launching subagents by default (`subagent_depth` defaults to 1). The ecosystem nests up to 4 levels (orchestrator → surge-analyst → deep-moat-auditor → vision), so `opencode.json` sets `"subagent_depth": 4` at the top level. If the limit regresses (e.g., stale config merge), re-add it and sync the fallback. |
| Config loads from wrong location | Ensure `OPENCODE_CONFIG_DIR=~/my-agent-os` is in `.bashrc`. Without it, OpenCode falls back to `~/.config/opencode/opencode.json` which may be stale. |
| Stale config divergence detected | Run `diff ~/my-agent-os/opencode.json ~/.config/opencode/opencode.json`. If they differ, canonical config is at `my-agent-os/`. Sync: `cp ~/my-agent-os/opencode.json ~/.config/opencode/opencode.json` |

## Harvested Configs

This repo was built by scanning and migrating existing configurations:

| Source | → Destination |
|--------|--------------|
| `~/.config/opencode/skills/browser-agent/` | `skills/browser-agent/` |
| `~/.config/opencode/tools/browser.ts` | `tools/browser.ts` |
| `~/.config/opencode/mcp.json` | `mcp/settings.json` |
| `~/.config/opencode/opencode.json` (providers) | merged into `opencode.json` |
| `~/.local/share/opencode/auth.json` (credentials) | DeepSeek key stays in credential store |

## License

MIT
