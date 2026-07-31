import { tool } from "@opencode-ai/plugin"
import { execSync, spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"

const DEFAULT_AGENT_URL = "http://127.0.0.1:9222"
// Backward-compatible alias (kept so external references still resolve)
const AGENT_URL = DEFAULT_AGENT_URL

// ── Per-Owner Browser Windows (Pattern 26) ─────────────────────────────
// Every subagent gets its OWN browser instance (separate port, separate
// user-data-dir, separate Chromium window). `context.agent` from each
// tool.execute() routes the call to that agent's private instance, so:
//   • browser_close() can only ever close the CALLER's own window
//   • browser_closeTab / switchTab / listTabs only see the caller's tabs
//   • cookies / localStorage are isolated per agent (no session leakage)
//   • one agent's OOM/crash/recycle can never kill another agent's window
// Main-session roles share the systemd-managed default instance on 9222.

const SUPERVISOR_DIR = path.join(process.env.HOME || "/home/ubuntu", ".browser-agents")
const REGISTRY_FILE = path.join(SUPERVISOR_DIR, "registry.json")
// Idle TTL before a per-owner window is auto-closed. Short because each
// owner's user-data-dir persists — if the agent calls again, the window
// respawns with cookies/sessions intact. Override: BROWSER_INSTANCE_IDLE_MS
const INSTANCE_IDLE_MS = Number(process.env.BROWSER_INSTANCE_IDLE_MS || 5 * 60 * 1000)
const MAX_INSTANCES = 6
const PORT_START = 9230
const PORT_END = 9289
// Agents that share the default systemd instance (main session roles).
const SHARED_AGENTS = new Set(["orchestrator", "build", "plan", "title", "compaction"])
// Where server.py lives (checked in order; both copies are kept in sync).
const SERVER_SCRIPT_CANDIDATES = [
  path.join(process.env.HOME || "", "browser-agent", "server.py"),
  path.join(process.env.HOME || "", "my-agent-os", "skills", "browser", "server.py"),
  "/home/ubuntu/browser-agent/server.py",
]
function findServerScript(): string {
  for (const p of SERVER_SCRIPT_CANDIDATES) {
    try { if (fs.existsSync(p)) return p } catch {}
  }
  return SERVER_SCRIPT_CANDIDATES[0]
}
const SERVER_SCRIPT = findServerScript()

// owner (sanitized agent name) -> base URL of its private instance
const ownerCache = new Map<string, string>()

function sanitizeOwner(agent?: string): string {
  if (!agent) return ""
  return agent.toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 32)
}

function isSharedAgent(agent?: string): boolean {
  return !agent || SHARED_AGENTS.has(agent)
}

function readRegistry(): Record<string, any> {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"))
  } catch { return {} }
}

function writeRegistry(reg: Record<string, any>): void {
  try {
    fs.mkdirSync(SUPERVISOR_DIR, { recursive: true })
    const tmp = REGISTRY_FILE + ".tmp"
    fs.writeFileSync(tmp, JSON.stringify(reg, null, 2))
    fs.renameSync(tmp, REGISTRY_FILE) // atomic write
  } catch {}
}

function instanceUrl(port: number): string {
  return `http://127.0.0.1:${port}`
}

function isAlive(url: string): boolean {
  try {
    execSync(`curl -s -m 2 ${url}/status`, { encoding: "utf-8" })
    return true
  } catch { return false }
}

function closeInstancePort(port: number): void {
  try {
    execSync(`curl -s -m 4 -X POST ${instanceUrl(port)} -H "Content-Type: application/json" -d '{"action":"close"}'`, { timeout: 10000, encoding: "utf-8" })
  } catch {}
}

// Fully terminate an owner's instance: close browser + kill server process
// + remove registry entry. Idempotent — safe to call multiple times.
function closeOwnerInstance(owner: string): void {
  const reg = readRegistry()
  const info = reg[owner]
  if (info) {
    closeInstancePort(info.port)
    try { if (info.pid && info.pid > 0) process.kill(info.pid, "SIGKILL") } catch {}
    delete reg[owner]
    writeRegistry(reg)
  }
  ownerCache.delete(owner)
}

// Auto-close: when a subagent session is terminated/aborted (user cancel,
// parent interruption, subagent killed), close its browser window at once.
// The AbortSignal is session-scoped — it does NOT fire on normal tool
// completion, so active agents are never affected. Even if it did, the
// owner's user-data-dir persists and the window respawns on the next call.
const abortHookedSignals = new WeakSet<AbortSignal>()

function hookAbortAutoClose(ctx?: { agent?: string; abort?: AbortSignal }): void {
  if (!ctx || !ctx.abort || !ctx.agent) return
  if (isSharedAgent(ctx.agent)) return
  const owner = sanitizeOwner(ctx.agent)
  if (!owner) return
  if (abortHookedSignals.has(ctx.abort)) return
  abortHookedSignals.add(ctx.abort)
  ctx.abort.addEventListener("abort", () => {
    try { closeOwnerInstance(owner) } catch {}
  }, { once: true })
}

function reapIdleInstances(): void {
  const reg = readRegistry()
  const now = Date.now()
  let changed = false
  for (const [owner, info] of Object.entries(reg)) {
    if (!info || typeof info.lastUsed !== "number") continue
    if (now - info.lastUsed > INSTANCE_IDLE_MS) {
      try { closeInstancePort(info.port) } catch {}
      try { if (info.pid && info.pid > 0) process.kill(info.pid, "SIGKILL") } catch {}
      delete reg[owner]
      ownerCache.delete(owner)
      changed = true
    }
  }
  if (changed) writeRegistry(reg)
}

function spawnInstance(owner: string): string {
  const reg = readRegistry()
  const usedPorts = new Set<number>()
  for (const info of Object.values(reg)) {
    if (info && typeof info.port === "number") usedPorts.add(info.port)
  }
  let port = 0
  for (let p = PORT_START; p <= PORT_END; p++) {
    if (!usedPorts.has(p)) { port = p; break }
  }
  if (!port) {
    throw new Error(`Browser instance pool exhausted (${PORT_START}-${PORT_END}). Close idle instances or raise MAX_INSTANCES.`)
  }
  const userDataDir = path.join(SUPERVISOR_DIR, owner, "user-data")
  try { fs.mkdirSync(path.dirname(userDataDir), { recursive: true }) } catch {}
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    BROWSER_AGENT_PORT: String(port),
    BROWSER_AGENT_USER_DATA_DIR: userDataDir,
    BROWSER_AGENT_NAME: owner,
    BROWSER_AGENT_SCREENSHOT_DIR: path.join(SUPERVISOR_DIR, owner, "screenshots"),
    BROWSER_AGENT_EXIT_ON_CLOSE: "1", // `close` action fully exits this instance
    DISPLAY: (process.env.DISPLAY as string) || ":99", // headed mode if Xvfb present
  }
  // Keep per-owner server logs for debugging (~/.browser-agents/<owner>/server.log)
  let logFd = -1
  try { logFd = fs.openSync(path.join(SUPERVISOR_DIR, owner, "server.log"), "a") } catch {}
  const child = spawn("setsid", ["/usr/bin/python3", SERVER_SCRIPT], {
    env, detached: true,
    stdio: logFd >= 0 ? ["ignore", "ignore", logFd] : "ignore",
  })
  child.unref()
  const url = instanceUrl(port)
  for (let i = 0; i < 30; i++) {
    if (isAlive(url)) break
    execSync("sleep 0.5", { encoding: "utf-8" })
  }
  if (!isAlive(url)) {
    try { process.kill(child.pid, "SIGKILL") } catch {}
    throw new Error(`Browser instance for "${owner}" failed to start on port ${port}`)
  }
  reg[owner] = { port, userDataDir, pid: child.pid, lastUsed: Date.now(), createdAt: Date.now() }
  writeRegistry(reg)
  return url
}

function resolveOwnerUrl(agent?: string): string {
  if (isSharedAgent(agent)) return DEFAULT_AGENT_URL
  const owner = sanitizeOwner(agent)
  if (!owner) return DEFAULT_AGENT_URL
  const cached = ownerCache.get(owner)
  if (cached && isAlive(cached)) {
    const reg = readRegistry()
    if (reg[owner]) { reg[owner].lastUsed = Date.now(); writeRegistry(reg) }
    return cached
  }
  ownerCache.delete(owner)
  reapIdleInstances() // opportunistic cleanup before allocating
  const reg = readRegistry()
  const existing = reg[owner]
  if (existing && isAlive(instanceUrl(existing.port))) {
    existing.lastUsed = Date.now()
    writeRegistry(reg)
    const url = instanceUrl(existing.port)
    ownerCache.set(owner, url)
    return url
  }
  if (existing) { delete reg[owner]; writeRegistry(reg) } // stale entry
  // Enforce MAX_INSTANCES: evict the least-recently-used idle instance
  const entries = Object.entries(readRegistry())
  if (entries.length >= MAX_INSTANCES) {
    entries.sort((a, b) => (a[1].lastUsed || 0) - (b[1].lastUsed || 0))
    const victim = entries[0]
    if (victim && victim[0] !== owner) {
      closeInstancePort(victim[1].port)
      try { if (victim[1].pid && victim[1].pid > 0) process.kill(victim[1].pid, "SIGKILL") } catch {}
      delete reg[victim[0]]
      ownerCache.delete(victim[0])
      writeRegistry(reg)
    }
  }
  const url = spawnInstance(owner)
  ownerCache.set(owner, url)
  return url
}

function agentUrl(ctx?: { agent?: string }): string {
  return resolveOwnerUrl(ctx?.agent)
}

function ensureServer(url: string = DEFAULT_AGENT_URL): void {
  try {
    execSync(`curl -s -m 2 ${url}/status`, { encoding: "utf-8" })
  } catch {
    // Per-owner instances that died: drop cache so the next call respawns them.
    if (url !== DEFAULT_AGENT_URL) {
      for (const [owner, u] of ownerCache) {
        if (u === url) ownerCache.delete(owner)
      }
      return
    }
    execSync("systemctl --user start browser-agent.service", { encoding: "utf-8", timeout: 10000 })
    let retries = 0
    while (retries < 15) {
      try {
        execSync(`curl -s -m 2 ${url}/status`, { encoding: "utf-8" })
        return
      } catch {
        retries++
        execSync("sleep 1", { encoding: "utf-8" })
      }
    }
    throw new Error("Browser agent server failed to start after 15 seconds")
  }
}

function call(command: Record<string, unknown>, ctx?: { agent?: string }): string {
  hookAbortAutoClose(ctx)
  const url = agentUrl(ctx)
  const body = JSON.stringify(command)
  try {
    const result = execSync(`curl -s -X POST ${url} -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, { timeout: 120000, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 })
    return result
  } catch (e: any) {
    if (e.stderr && e.stderr.includes("Failed to connect")) {
      ensureServer(url)
      try {
        const retry = execSync(`curl -s -X POST ${url} -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, { timeout: 120000, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 })
        return retry
      } catch (e2: any) {
        try { return e2.stdout || e2.message } catch { return JSON.stringify({ status: "error", message: e2.message }) }
      }
    }
    try {
      return e.stdout || e.message
    } catch {
      return JSON.stringify({ status: "error", message: e.message })
    }
  }
}

function callWithCheck(command: Record<string, unknown>, ctx?: { agent?: string }): Record<string, any> {
  const raw = call(command, ctx)
  try {
    const parsed = JSON.parse(raw)
    if (parsed.status === "error") throw new Error(parsed.message)
    return parsed
  } catch (e: any) {
    throw new Error(`Browser agent error: ${e.message}\nRaw: ${raw.substring(0, 500)}`)
  }
}

export const browser_navigate = tool({
  description: "Navigate the browser to a URL. Starts the browser if not running. Returns page title and final URL after redirects.",
  args: {
    url: tool.schema.string().describe("URL to navigate to"),
    waitUntil: tool.schema.enum(["load", "domcontentloaded", "networkidle0", "networkidle2"]).optional().default("networkidle2").describe("When to consider navigation complete"),
    timeout: tool.schema.number().optional().default(30000).describe("Navigation timeout in ms"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "navigate", url: args.url, waitUntil: args.waitUntil, timeout: args.timeout  , tabId: args.tabId }, ctx)
  },
})

export const browser_click = tool({
  description: "Click an element on the current page by CSS selector. Optionally wait for the element first.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the element to click"),
    waitFor: tool.schema.number().optional().describe("Timeout in ms to wait for selector to appear before clicking"),
    clickCount: tool.schema.number().optional().default(1).describe("Number of clicks (1=single, 2=double)"),
    delay: tool.schema.number().optional().default(0).describe("Delay between mousedown and mouseup in ms"),
    waitAfter: tool.schema.number().optional().default(500).describe("Wait ms after clicking for page changes"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "click", selector: args.selector, waitFor: args.waitFor, clickCount: args.clickCount, delay: args.delay, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_type = tool({
  description: "Type text into an input field. Can clear the field first and optionally press Enter after typing.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the input element"),
    text: tool.schema.string().describe("Text to type"),
    clear: tool.schema.boolean().optional().default(true).describe("Clear the field before typing"),
    pressEnter: tool.schema.boolean().optional().default(false).describe("Press Enter after typing"),
    delay: tool.schema.number().optional().default(0).describe("Keystroke delay in ms (simulates human typing)"),
    waitFor: tool.schema.number().optional().describe("Timeout to wait for selector to appear"),
    waitAfter: tool.schema.number().optional().default(500).describe("Wait ms after typing for page changes"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "type", selector: args.selector, text: args.text, clear: args.clear, pressEnter: args.pressEnter, delay: args.delay, waitFor: args.waitFor, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_press = tool({
  description: "Press a keyboard key (e.g. Enter, Tab, Escape, ArrowDown).",
  args: {
    key: tool.schema.string().describe("Key to press (e.g. 'Enter', 'Tab', 'Escape', 'ArrowDown', 'Control+a')"),
    waitAfter: tool.schema.number().optional().default(200).describe("Wait ms after pressing"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "press", key: args.key, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_scroll = tool({
  description: "Scroll the page or a specific element by a number of pixels.",
  args: {
    delta: tool.schema.number().optional().default(300).describe("Pixels to scroll (positive=down, negative=up)"),
    selector: tool.schema.string().optional().describe("CSS selector of element to scroll within (default: whole page)"),
    waitAfter: tool.schema.number().optional().default(300).describe("Wait ms after scrolling"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "scroll", delta: args.delta, selector: args.selector, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_screenshot = tool({
  description: "Take a screenshot of the current page. Optionally target a specific element or capture full page.",
  args: {
    fullPage: tool.schema.boolean().optional().default(false).describe("Capture the full scrollable page"),
    selector: tool.schema.string().optional().describe("CSS selector to screenshot a specific element"),
    output: tool.schema.string().optional().describe("Output file path"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "screenshot", fullPage: args.fullPage, selector: args.selector, output: args.output  , tabId: args.tabId }, ctx)
  },
})

export const browser_evaluate = tool({
  description: "Run arbitrary JavaScript on the current page and return the result. Full access to the DOM and page context.",
  args: {
    script: tool.schema.string().describe("JavaScript expression or code to evaluate on the page"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "evaluate", script: args.script  , tabId: args.tabId }, ctx)
  },
})

export const browser_text = tool({
  description: "Get the visible text content of the current page or a specific element.",
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to extract text from (default: body)"),
    maxLength: tool.schema.number().optional().default(100000).describe("Max characters to return"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "text", selector: args.selector, maxLength: args.maxLength  , tabId: args.tabId }, ctx)
  },
})

export const browser_html = tool({
  description: "Get the full HTML source of the current page.",
  args: {
    maxLength: tool.schema.number().optional().default(500000).describe("Max characters to return"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "html", maxLength: args.maxLength  , tabId: args.tabId }, ctx)
  },
})

export const browser_waitFor = tool({
  description: "Wait for a condition on the page: a CSS selector to appear, navigation to complete, or network to go idle.",
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to wait for"),
    navigation: tool.schema.boolean().optional().describe("Wait for navigation to complete"),
    networkIdle: tool.schema.boolean().optional().describe("Wait for network to go idle"),
    timeout: tool.schema.number().optional().default(10000).describe("Timeout in ms"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "waitFor", selector: args.selector, navigation: args.navigation, networkIdle: args.networkIdle, timeout: args.timeout  , tabId: args.tabId }, ctx)
  },
})

export const browser_networkLogs = tool({
  description: "Get all captured network requests and responses since the last clear. Shows method, URL, headers, status codes, and post data. Use 'since' timestamp to get only new entries.",
  args: {
    since: tool.schema.number().optional().default(0).describe("Unix timestamp in ms to get logs after (0=all)"),
    filter: tool.schema.object({
      method: tool.schema.string().optional().describe("HTTP method to filter by (GET, POST, etc.)"),
      urlPattern: tool.schema.string().optional().describe("Regex pattern to match URLs against"),
      urlContains: tool.schema.string().optional().describe("Substring that URLs must contain"),
    }).optional().describe("Filter to reduce noise from tracking pixels"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "networkLogs", since: args.since, filter: args.filter  , tabId: args.tabId }, ctx)
  },
})

export const browser_consoleLogs = tool({
  description: "Get all captured console logs and JavaScript errors from the page. Use 'since' timestamp to get only new entries.",
  args: {
    since: tool.schema.number().optional().default(0).describe("Unix timestamp in ms to get logs after (0=all)"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "consoleLogs", since: args.since  , tabId: args.tabId }, ctx)
  },
})

export const browser_clearLogs = tool({
  description: "Clear all captured network requests, responses, console logs, and JS errors. frees memory. Do this after checking logs to avoid re-reading old data.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "clearLogs"  }, ctx)
  },
})

export const browser_cookies = tool({
  description: "Get, set, or delete cookies for the current page. Without args, returns all cookies.",
  args: {
    get: tool.schema.union([tool.schema.boolean(), tool.schema.string()]).optional().describe("True=get all, or a URL string to get cookies for"),
    set: tool.schema.object({ name: tool.schema.string(), value: tool.schema.string(), domain: tool.schema.string().optional(), path: tool.schema.string().optional() }).optional().describe("Cookie to set"),
    delete: tool.schema.union([tool.schema.string(), tool.schema.array(tool.schema.string())]).optional().describe("Cookie name(s) to delete"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "cookies", get: args.get, set: args.set, delete: args.delete  , tabId: args.tabId }, ctx)
  },
})

export const browser_localStorage = tool({
  description: "Get, set, delete, or list items in the page's localStorage.",
  args: {
    op: tool.schema.enum(["get", "set", "delete", "keys", "all", "clear"]).describe("Operation: get, set, delete, keys, all, or clear"),
    key: tool.schema.string().optional().describe("Key for get/set/delete"),
    value: tool.schema.string().optional().describe("Value for set"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "localStorage", op: args.op, key: args.key, value: args.value  , tabId: args.tabId }, ctx)
  },
})

export const browser_sessionStorage = tool({
  description: "Get, set, delete, or list items in the page's sessionStorage.",
  args: {
    op: tool.schema.enum(["get", "set", "delete", "keys", "all", "clear"]).describe("Operation: get, set, delete, keys, all, or clear"),
    key: tool.schema.string().optional().describe("Key for get/set/delete"),
    value: tool.schema.string().optional().describe("Value for set"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "sessionStorage", op: args.op, key: args.key, value: args.value  , tabId: args.tabId }, ctx)
  },
})

export const browser_intercept = tool({
  description: "Enable request interception to block URLs matching regex patterns. All non-blocked requests pass through normally.",
  args: {
    blockPatterns: tool.schema.array(tool.schema.string()).describe("Regex patterns of URLs to block (e.g. ['ads', 'doubleclick', 'tracker'])"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "intercept", blockPatterns: args.blockPatterns  , tabId: args.tabId }, ctx)
  },
})

export const browser_stopIntercept = tool({
  description: "Stop all request interception previously enabled with browser_intercept. Restores normal request handling.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "stopIntercept"  }, ctx)
  },
})

export const browser_hover = tool({
  description: "Hover over an element by CSS selector. Useful for triggering dropdowns or tooltips.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the element to hover over"),
    waitAfter: tool.schema.number().optional().default(300).describe("Wait ms after hovering"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "hover", selector: args.selector, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_select = tool({
  description: "Select option(s) in a <select> element by value.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the select element"),
    values: tool.schema.array(tool.schema.string()).describe("Option values to select"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "select", selector: args.selector, values: args.values  , tabId: args.tabId }, ctx)
  },
})

// ── Advanced React/SPA Tools (battle-tested against Plaid, Stripe, MUI) ──

export const browser_clickAt = tool({
  description: "Click at exact pixel (x,y) coordinates using OS-level Input.dispatchMouseEvent. Bypasses React synthetic events, canvas elements, and CSS selector failures. Use with @vision for coordinate discovery.",
  args: {
    x: tool.schema.number().describe("X pixel coordinate"),
    y: tool.schema.number().describe("Y pixel coordinate"),
    waitAfter: tool.schema.number().optional().default(500).describe("Wait ms after clicking"),
    clickCount: tool.schema.number().optional().default(1).describe("Number of clicks"),
    delay: tool.schema.number().optional().default(0).describe("Delay between mousedown and mouseup in ms (for press-and-hold captchas)"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "clickAt", x: args.x, y: args.y, waitAfter: args.waitAfter, clickCount: args.clickCount, delay: args.delay  , tabId: args.tabId }, ctx)
  },
})

export const browser_clickFrame = tool({
  description: "Click inside a cross-origin iframe at (x,y) coordinates. Use for reCAPTCHA, Google OAuth, Stripe Elements, Plaid Link. Requires the iframe's CSS selector.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the iframe element (e.g. 'iframe[title=\"reCAPTCHA\"]')"),
    x: tool.schema.number().optional().default(0).describe("X offset inside the iframe content"),
    y: tool.schema.number().optional().default(0).describe("Y offset inside the iframe content"),
    innerSelector: tool.schema.string().optional().describe("CSS selector inside the iframe to click (defaults to body)"),
    waitAfter: tool.schema.number().optional().default(500).describe("Wait ms after clicking"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "clickFrame", selector: args.selector, x: args.x, y: args.y, innerSelector: args.innerSelector, waitAfter: args.waitAfter  , tabId: args.tabId }, ctx)
  },
})

export const browser_reactSetValue = tool({
  description: "Set react-select / MUI Autocomplete values by walking React fiber tree to find stateNode.setValue(). The ONLY reliable way to set React-controlled selects — DOM manipulation and click events don't update React internal state.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the React select container (e.g. '.css-1jlacyh-container')"),
    value: tool.schema.object({
      value: tool.schema.string().describe("Option value"),
      label: tool.schema.string().describe("Option label"),
    }).describe("Value object to set"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "reactSetValue", selector: args.selector, value: args.value  , tabId: args.tabId }, ctx)
  },
})

export const browser_triggerForm = tool({
  description: "Submit a React SPA form using multi-strategy approach (requestSubmit → fiber onSubmit → click). React SPAs intercept native form.submit() — this handles all cases.",
  args: {
    buttonSelector: tool.schema.string().describe("CSS selector of the submit button inside the form"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "triggerForm", buttonSelector: args.buttonSelector  , tabId: args.tabId }, ctx)
  },
})

export const browser_telemetry = tool({
  description: "Execute a browser action and return aggregated telemetry in a single response: DOM, network requests/responses, console logs, JS errors, and screenshot path. Replaces browser-telemetry/run.py. The inner action uses the same format as other browser_* tools (e.g. {action:'navigate',url:'...'}). Screenshot saved to /tmp/ui-state.png by default.",
  args: {
    inner: tool.schema.object({
      action: tool.schema.string().describe("The action to execute: navigate, click, clickAt, clickFrame, type, press, scroll, hover, select, waitFor, evaluate, screenshot"),
    }).passthrough().describe("Inner action object — same format as other browser_* tool args. E.g. {action:'navigate',url:'https://...'} or {action:'click',selector:'#btn'}"),
    screenshotOutput: tool.schema.string().optional().describe("Custom screenshot output path (default: /tmp/ui-state.png)"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "telemetry", inner: args.inner, screenshotOutput: args.screenshotOutput  , tabId: args.tabId }, ctx)
  },
})

export const browser_goBack = tool({
  description: "Navigate back in browser history.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "goBack"  }, ctx)
  },
})

export const browser_goForward = tool({
  description: "Navigate forward in browser history.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "goForward"  }, ctx)
  },
})

export const browser_reload = tool({
  description: "Reload the current page.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "reload"  }, ctx)
  },
})

export const browser_url = tool({
  description: "Get the current page URL and title.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "url"  }, ctx)
  },
})

export const browser_status = tool({
  description: "Get the current status of the browser agent: connection state, current URL, and log counts.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "status"  }, ctx)
  },
})

export const browser_listTabs = tool({
  description: "List all open browser tabs/pages. Returns tab ID, URL, title, and which one is active. Use before browser_switchTab to find the tab you want.",
  args: {},
  async execute(_args, ctx) {
    return call({ action: "listTabs"  }, ctx)
  },
})

export const browser_switchTab = tool({
  description: "Switch to a different browser tab by its ID (from browser_listTabs) or by 0-based index. All subsequent browser_* actions will operate on this tab.",
  args: {
    index: tool.schema.number().optional().describe("0-based index of the tab in the browser_listTabs results (use either this or tabId)"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "switchTab", tabId: args.tabId, index: args.index }, ctx)
  },
})

export const browser_close = tool({
  description: "Close THIS agent's own browser window and clear its captured logs. Every agent has an isolated window — this can never close another agent's window. The window restarts automatically on the next navigation.",
  args: {},
  async execute(_args, ctx) {
    // Per-owner instances: fully terminate (browser + server process).
    if (ctx && !isSharedAgent(ctx.agent)) {
      const owner = sanitizeOwner(ctx.agent)
      if (owner) {
        closeOwnerInstance(owner)
        return JSON.stringify({
          status: "ok",
          closed: true,
          owner,
          note: "Closed this agent's own browser window (isolated per-agent).",
        })
      }
    }
    // Shared/default instance (orchestrator session): existing behavior.
    return call({ action: "close" }, ctx)
  },
})

export const browser_newTab = tool({
  description: "Create a new browser tab. Returns the tab's ID which can be used with browser_switchTab and browser_closeTab. Each agent has its own private window (Pattern 26) — new tabs only affect YOUR instance.",
  args: {
    url: tool.schema.string().optional().describe("Optional URL to navigate the new tab to (default: about:blank)"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "newTab", url: args.url  , tabId: args.tabId }, ctx)
  },
})

export const browser_closeTab = tool({
  description: "Close a browser tab by its ID or index. Cannot close the last remaining tab (it will be kept alive). Only affects YOUR own window — never another agent's.",
  args: {
    index: tool.schema.number().optional().describe("0-based index of the tab to close"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "closeTab", tabId: args.tabId, index: args.index }, ctx)
  },
})

export const browser_viewport = tool({
  description: "Change the browser viewport size. Useful for testing responsive designs.",
  args: {
    width: tool.schema.number().describe("Viewport width in pixels"),
    height: tool.schema.number().describe("Viewport height in pixels"),
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID (from browser_newTab or browser_listTabs). Parallel-safe — targets a specific tab within your own per-owner window."),
  },  async execute(args, ctx) {
    return call({ action: "viewport", width: args.width, height: args.height  , tabId: args.tabId }, ctx)
  },
})

export const browser_bypassPx = tool({
  description: "Bypass PerimeterX/DataDome captcha by calling window.PX.setChallenge('solved'). Navigate/reload the page after calling this to load the real content.",
  args: {
    tabId: tool.schema.number().optional().describe("Target a specific tab by ID"),
  },  async execute(args, ctx) {
    return call({ action: "bypassPx", tabId: args.tabId }, ctx)
  },
})