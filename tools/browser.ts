import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"
import * as crypto from "crypto"

// ── Browser Router — single-entry multiplexer (Pattern 27) ─────────────
// ALL browser_* calls go to ONE router port (:9290). The router owns the
// per-owner instance pool (registry, spawn, eviction, close) and proxies
// each call to the correct instance based on the X-Agent header. browser.ts
// is a THIN CLIENT — it never touches ports, processes, or the registry.
//   • Subagents get their own window: X-Agent = '<agent>-<session-hash>'
//   • Shared roles (orchestrator/build/plan/title/compaction) → router
//     proxies to the systemd default instance on 9222.
// The router uses the same mkdir registry lock as reaper.py, so there is
// exactly ONE writer of the port pool (no more "failed to start on port"
// storms from concurrent spawners racing on the registry).
const ROUTER_URL = process.env.BROWSER_ROUTER_URL || "http://127.0.0.1:9290"

// Agents that share the default systemd instance (main session roles).
const SHARED_AGENTS = new Set(["orchestrator", "build", "plan", "title", "compaction"])

function sanitizeOwner(agent?: string): string {
  if (!agent) return ""
  return agent.toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 32)
}

// Session-scoped owner key. The agent name alone is NOT enough — the
// surge-analyst methodology spawns dozens of PARALLEL subagents of the same
// type (e.g. 30x `general` at once). Keying only on the agent type made them
// all share one browser window and hijack each other (v3.3 regression).
// Including a short hash of the unique sessionID gives every subagent
// invocation its own isolated window, while still allowing the shared
// systemd instance for main-session roles.
function ownerKey(ctx?: { agent?: string; sessionID?: string }): string {
  const agent = ctx?.agent
  if (isSharedAgent(agent)) return ""
  const base = sanitizeOwner(agent)
  if (!base) return ""
  const sid = ctx?.sessionID || ""
  if (!sid) return base // fallback: no sessionID available (legacy callers)
  const h = crypto.createHash("sha1").update(sid).digest("hex").slice(0, 8)
  return `${base}-${h}`
}

function isSharedAgent(agent?: string): boolean {
  return !agent || SHARED_AGENTS.has(agent)
}

// ── Thin client: POST to the router with an X-Agent header ─────────────
// Everything below is stateless. The router owns the port pool, the
// registry, spawning, eviction, and close. browser.ts only:
//   1. computes the owner key (agent + sessionID hash)
//   2. POSTs the command JSON to the router with `X-Agent: <owner>`
//   3. returns the router's (already JSON) response verbatim
// Shared agents send no X-Agent header → router proxies to :9222.

function curlPost(url: string, body: string, extraHeaders: string[] = []): string {
  const headers = [...extraHeaders, "-H", "Content-Type: application/json"]
    .map((h) => `"${h.replace(/"/g, '\\"')}"`).join(" ")
  return execSync(
    `curl -s -X POST ${url} ${headers} -d '${body.replace(/'/g, "'\\''")}'`,
    { timeout: 120000, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 }
  )
}

function ensureRouter(): void {
  // Router is a systemd user service (browser-router.service). Start it and
  // poll /status until it answers or we time out.
  try {
    execSync("systemctl --user start browser-router.service", { encoding: "utf-8", timeout: 10000 })
  } catch {}
  let retries = 0
  while (retries < 15) {
    try {
      execSync(`curl -s -m 2 ${ROUTER_URL}/status`, { encoding: "utf-8" })
      return
    } catch {
      retries++
      execSync("sleep 1", { encoding: "utf-8" })
    }
  }
  throw new Error("Browser router failed to start after 15 seconds")
}

function call(command: Record<string, unknown>, ctx?: { agent?: string; sessionID?: string }): string {
  const owner = ownerKey(ctx)
  const body = JSON.stringify(command)
  const headers = owner ? ["-H", `X-Agent: ${owner}`] : []
  try {
    return curlPost(ROUTER_URL, body, headers)
  } catch (e: any) {
    if (e.stderr && e.stderr.includes("Failed to connect")) {
      ensureRouter()
      try {
        return curlPost(ROUTER_URL, body, headers)
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
    waitUntil: tool.schema.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional().default("networkidle").describe("When to consider navigation complete. IMPORTANT: the Python server is Playwright-based — ONLY 'load' | 'domcontentloaded' | 'networkidle' | 'commit' are valid. 'networkidle0'/'networkidle2' (Puppeteer values) WILL FAIL."),
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
    // Stateless: POST {action:"close"} to the router. The router reads the
    // X-Agent header and closes ONLY the caller's own instance (per-owner)
    // or the shared :9222 instance (shared roles). Never another agent's.
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