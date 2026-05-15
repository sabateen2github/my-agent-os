import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"

const AGENT_URL = "http://127.0.0.1:9222"

function ensureServer(): void {
  try {
    execSync(`curl -s -m 2 ${AGENT_URL}/status`, { encoding: "utf-8" })
  } catch {
    execSync("systemctl --user start browser-agent.service", { encoding: "utf-8", timeout: 10000 })
    let retries = 0
    while (retries < 15) {
      try {
        execSync(`curl -s -m 2 ${AGENT_URL}/status`, { encoding: "utf-8" })
        return
      } catch {
        retries++
        execSync("sleep 1", { encoding: "utf-8" })
      }
    }
    throw new Error("Browser agent server failed to start after 15 seconds")
  }
}

function call(command: Record<string, unknown>): string {
  const body = JSON.stringify(command)
  try {
    const result = execSync(`curl -s -X POST ${AGENT_URL} -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, { timeout: 120000, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 })
    return result
  } catch (e: any) {
    if (e.stderr && e.stderr.includes("Failed to connect")) {
      ensureServer()
      try {
        const retry = execSync(`curl -s -X POST ${AGENT_URL} -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`, { timeout: 120000, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024 })
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

function callWithCheck(command: Record<string, unknown>): Record<string, any> {
  const raw = call(command)
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
  },
  async execute(args) {
    return call({ action: "navigate", url: args.url, waitUntil: args.waitUntil, timeout: args.timeout })
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
  },
  async execute(args) {
    return call({ action: "click", selector: args.selector, waitFor: args.waitFor, clickCount: args.clickCount, delay: args.delay, waitAfter: args.waitAfter })
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
  },
  async execute(args) {
    return call({ action: "type", selector: args.selector, text: args.text, clear: args.clear, pressEnter: args.pressEnter, delay: args.delay, waitFor: args.waitFor, waitAfter: args.waitAfter })
  },
})

export const browser_press = tool({
  description: "Press a keyboard key (e.g. Enter, Tab, Escape, ArrowDown).",
  args: {
    key: tool.schema.string().describe("Key to press (e.g. 'Enter', 'Tab', 'Escape', 'ArrowDown', 'Control+a')"),
    waitAfter: tool.schema.number().optional().default(200).describe("Wait ms after pressing"),
  },
  async execute(args) {
    return call({ action: "press", key: args.key, waitAfter: args.waitAfter })
  },
})

export const browser_scroll = tool({
  description: "Scroll the page or a specific element by a number of pixels.",
  args: {
    delta: tool.schema.number().optional().default(300).describe("Pixels to scroll (positive=down, negative=up)"),
    selector: tool.schema.string().optional().describe("CSS selector of element to scroll within (default: whole page)"),
    waitAfter: tool.schema.number().optional().default(300).describe("Wait ms after scrolling"),
  },
  async execute(args) {
    return call({ action: "scroll", delta: args.delta, selector: args.selector, waitAfter: args.waitAfter })
  },
})

export const browser_screenshot = tool({
  description: "Take a screenshot of the current page. Optionally target a specific element or capture full page.",
  args: {
    fullPage: tool.schema.boolean().optional().default(false).describe("Capture the full scrollable page"),
    selector: tool.schema.string().optional().describe("CSS selector to screenshot a specific element"),
    output: tool.schema.string().optional().describe("Output file path"),
  },
  async execute(args) {
    return call({ action: "screenshot", fullPage: args.fullPage, selector: args.selector, output: args.output })
  },
})

export const browser_evaluate = tool({
  description: "Run arbitrary JavaScript on the current page and return the result. Full access to the DOM and page context.",
  args: {
    script: tool.schema.string().describe("JavaScript expression or code to evaluate on the page"),
  },
  async execute(args) {
    return call({ action: "evaluate", script: args.script })
  },
})

export const browser_text = tool({
  description: "Get the visible text content of the current page or a specific element.",
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to extract text from (default: body)"),
    maxLength: tool.schema.number().optional().default(100000).describe("Max characters to return"),
  },
  async execute(args) {
    return call({ action: "text", selector: args.selector, maxLength: args.maxLength })
  },
})

export const browser_html = tool({
  description: "Get the full HTML source of the current page.",
  args: {
    maxLength: tool.schema.number().optional().default(500000).describe("Max characters to return"),
  },
  async execute(args) {
    return call({ action: "html", maxLength: args.maxLength })
  },
})

export const browser_waitFor = tool({
  description: "Wait for a condition on the page: a CSS selector to appear, navigation to complete, or network to go idle.",
  args: {
    selector: tool.schema.string().optional().describe("CSS selector to wait for"),
    navigation: tool.schema.boolean().optional().describe("Wait for navigation to complete"),
    networkIdle: tool.schema.boolean().optional().describe("Wait for network to go idle"),
    timeout: tool.schema.number().optional().default(10000).describe("Timeout in ms"),
  },
  async execute(args) {
    return call({ action: "waitFor", selector: args.selector, navigation: args.navigation, networkIdle: args.networkIdle, timeout: args.timeout })
  },
})

export const browser_networkLogs = tool({
  description: "Get all captured network requests and responses since the last clear. Shows method, URL, headers, status codes, and post data. Use 'since' timestamp to get only new entries.",
  args: {
    since: tool.schema.number().optional().default(0).describe("Unix timestamp in ms to get logs after (0=all)"),
  },
  async execute(args) {
    return call({ action: "networkLogs", since: args.since })
  },
})

export const browser_consoleLogs = tool({
  description: "Get all captured console logs and JavaScript errors from the page. Use 'since' timestamp to get only new entries.",
  args: {
    since: tool.schema.number().optional().default(0).describe("Unix timestamp in ms to get logs after (0=all)"),
  },
  async execute(args) {
    return call({ action: "consoleLogs", since: args.since })
  },
})

export const browser_clearLogs = tool({
  description: "Clear all captured network requests, responses, console logs, and JS errors. frees memory. Do this after checking logs to avoid re-reading old data.",
  args: {},
  async execute() {
    return call({ action: "clearLogs" })
  },
})

export const browser_cookies = tool({
  description: "Get, set, or delete cookies for the current page. Without args, returns all cookies.",
  args: {
    get: tool.schema.union([tool.schema.boolean(), tool.schema.string()]).optional().describe("True=get all, or a URL string to get cookies for"),
    set: tool.schema.object({ name: tool.schema.string(), value: tool.schema.string(), domain: tool.schema.string().optional(), path: tool.schema.string().optional() }).optional().describe("Cookie to set"),
    delete: tool.schema.union([tool.schema.string(), tool.schema.array(tool.schema.string())]).optional().describe("Cookie name(s) to delete"),
  },
  async execute(args) {
    return call({ action: "cookies", get: args.get, set: args.set, delete: args.delete })
  },
})

export const browser_localStorage = tool({
  description: "Get, set, delete, or list items in the page's localStorage.",
  args: {
    op: tool.schema.enum(["get", "set", "delete", "keys", "all", "clear"]).describe("Operation: get, set, delete, keys, all, or clear"),
    key: tool.schema.string().optional().describe("Key for get/set/delete"),
    value: tool.schema.string().optional().describe("Value for set"),
  },
  async execute(args) {
    return call({ action: "localStorage", op: args.op, key: args.key, value: args.value })
  },
})

export const browser_sessionStorage = tool({
  description: "Get, set, delete, or list items in the page's sessionStorage.",
  args: {
    op: tool.schema.enum(["get", "set", "delete", "keys", "all", "clear"]).describe("Operation: get, set, delete, keys, all, or clear"),
    key: tool.schema.string().optional().describe("Key for get/set/delete"),
    value: tool.schema.string().optional().describe("Value for set"),
  },
  async execute(args) {
    return call({ action: "sessionStorage", op: args.op, key: args.key, value: args.value })
  },
})

export const browser_intercept = tool({
  description: "Enable request interception to block URLs matching regex patterns. All non-blocked requests pass through normally.",
  args: {
    blockPatterns: tool.schema.array(tool.schema.string()).describe("Regex patterns of URLs to block (e.g. ['ads', 'doubleclick', 'tracker'])"),
  },
  async execute(args) {
    return call({ action: "intercept", blockPatterns: args.blockPatterns })
  },
})

export const browser_hover = tool({
  description: "Hover over an element by CSS selector. Useful for triggering dropdowns or tooltips.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the element to hover over"),
    waitAfter: tool.schema.number().optional().default(300).describe("Wait ms after hovering"),
  },
  async execute(args) {
    return call({ action: "hover", selector: args.selector, waitAfter: args.waitAfter })
  },
})

export const browser_select = tool({
  description: "Select option(s) in a <select> element by value.",
  args: {
    selector: tool.schema.string().describe("CSS selector of the select element"),
    values: tool.schema.array(tool.schema.string()).describe("Option values to select"),
  },
  async execute(args) {
    return call({ action: "select", selector: args.selector, values: args.values })
  },
})

export const browser_goBack = tool({
  description: "Navigate back in browser history.",
  args: {},
  async execute() {
    return call({ action: "goBack" })
  },
})

export const browser_goForward = tool({
  description: "Navigate forward in browser history.",
  args: {},
  async execute() {
    return call({ action: "goForward" })
  },
})

export const browser_reload = tool({
  description: "Reload the current page.",
  args: {},
  async execute() {
    return call({ action: "reload" })
  },
})

export const browser_url = tool({
  description: "Get the current page URL and title.",
  args: {},
  async execute() {
    return call({ action: "url" })
  },
})

export const browser_status = tool({
  description: "Get the current status of the browser agent: connection state, current URL, and log counts.",
  args: {},
  async execute() {
    return call({ action: "status" })
  },
})

export const browser_close = tool({
  description: "Close the browser and clear all captured logs. The browser will restart on the next navigation.",
  args: {},
  async execute() {
    return call({ action: "close" })
  },
})

export const browser_viewport = tool({
  description: "Change the browser viewport size. Useful for testing responsive designs.",
  args: {
    width: tool.schema.number().describe("Viewport width in pixels"),
    height: tool.schema.number().describe("Viewport height in pixels"),
  },
  async execute(args) {
    return call({ action: "viewport", width: args.width, height: args.height })
  },
})