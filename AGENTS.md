# my-agent-os — The Single Source of Truth

This package defines ALL agent capabilities, browser actions, and battle-tested patterns. Every project that mounts this package inherits these capabilities. No project-specific AGENTS.md needed.

## Browser Agent (persistent Chromium, port 9222)

All actions available via `browser_<action>()` tool calls:

### Navigation & Inspection
| Action | Parameters | Purpose |
|--------|-----------|---------|
| `navigate` | `url`, `waitUntil`, `timeout` | Go to URL |
| `url` | — | Get current URL + title |
| `status` | — | Browser state, log counts, WAF detection |
| `screenshot` | `output`, `fullPage`, `selector` | Save screenshot to `/tmp/ui-state.png` |
| `text` | `selector`, `maxLength` | Get visible page text |
| `html` | `maxLength` | Get page source |
| `waitFor` | `selector`, `networkIdle`, `navigation`, `timeout` | Wait for condition |
| `goBack`, `goForward`, `reload` | — | Navigation history |

### Interaction
| Action | Parameters | Purpose |
|--------|-----------|---------|
| `click` | `selector`, `waitFor`, `clickCount`, `delay` | Native CSS-selector click |
| **`clickAt`** | `x`, `y`, `clickCount`, `waitAfter` | **OS-level pixel click — bypasses React events** |
| **`clickFrame`** | `selector`, `x`, `y`, `innerSelector` | **Click inside cross-origin iframe** |
| `type` | `selector`, `text`, `clear`, `delay`, `pressEnter` | Type into input |
| `press` | `key` (Enter, Tab, Escape, etc.) | Press keyboard key |
| `scroll` | `delta`, `selector` | Scroll page or element |
| `hover` | `selector` | Hover over element |
| `select` | `selector`, `values` | Select dropdown options |
| **`reactSetValue`** | `selector`, `value` | **Set react-select values via React fiber tree** |
| **`triggerForm`** | `buttonSelector` | **Multi-strategy form submit for React SPAs** |

### Data & State
| Action | Parameters | Purpose |
|--------|-----------|---------|
| `evaluate` | `script` | Run JS on page |
| `cookies` | `get`, `set`, `delete` | Cookie management |
| `localStorage` | `op`, `key`, `value` | localStorage access |
| `sessionStorage` | `op`, `key`, `value` | sessionStorage access |
| `networkLogs` | `since`, **`filter: {method, urlPattern, urlContains}`** | Network requests with filtering |
| `consoleLogs` | `since` | Console output + JS errors |
| `clearLogs` | — | Reset captured logs |
| `intercept` | `blockPatterns` (regex array) | Block URLs (ads, trackers) |
| `viewport` | `width`, `height` | Change screen size |
| `emulate` | `device`, `userAgent` | Device emulation |
| `close` | — | Shut down browser |

## Battle-Tested Patterns

### Pattern 1: Vision → ClickAt pipeline
When CSS selectors can't reach an element (dynamic React UIs, iframes, shadow DOM):
```
1. browser_screenshot({ output: "/tmp/ui-state.png" })
2. @vision Read /tmp/ui-state.png. What are the exact pixel coordinates of [element]?
3. browser_clickAt({ x: 640, y: 389, waitAfter: 500 })
```
This sends `Input.dispatchMouseEvent` at the OS level — indistinguishable from a human click.

### Pattern 2: Cross-origin iframe clicking (reCAPTCHA, Google OAuth)
```
browser_click({ selector: 'iframe[title="reCAPTCHA"]', waitAfter: 4000 })
// or for precision:
browser_clickFrame({ selector: 'iframe[title="reCAPTCHA"]', x: 28, y: 28 })
```
After clicking, verify the token:
```
browser_evaluate({ script: "grecaptcha.getResponse(0).length" })
```

### Pattern 3: React select (react-select, MUI Autocomplete)
DOM manipulation and click events don't update React's internal state. Use:
```
// Set the value in React's component tree
browser_reactSetValue({ 
  selector: '.css-1jlacyh-container', 
  value: { value: 'business', label: 'Business or developer' } 
})
```
This walks the React fiber tree, finds `stateNode.setValue()`, and calls it directly.

### Pattern 4: React form submission
React SPAs intercept native form submits. Use multi-strategy approach:
```
browser_triggerForm({ buttonSelector: 'button' })
```
Tries in order:
1. `form.requestSubmit(button)` — React-compatible
2. Walk React fiber to find and call `onSubmit` handler directly

### Pattern 5: Network spy with filtering
```
browser_clearLogs({})
// ... do some actions ...
browser_networkLogs({ filter: { method: 'POST', urlPattern: 'api\\.dashboard\\.plaid' } })
```
Filters out tracking pixels, analytics, and other noise.

### Pattern 6: WAF detection & recovery
```
const status = browser_status({})
if (status.wafBlocked) {
  console.log('CloudFront blocked us:', status.wafMessage)
  browser_cookies({ delete: ['*'] })
  // ... re-authenticate ...
}
```

## Stealth / Anti-Detection

Enabled by default. Defeats Google OAuth, Cloudflare, and bot walls:
- Disables `AutomationControlled` blink feature
- Removes "HeadlessChrome" from User-Agent
- Overrides `navigator.webdriver` → `false`
- Fakes `navigator.plugins` (5 entries)
- Overrides Permissions API for headless detection

Verify stealth:
```
browser_evaluate({ script: "({ webdriver: navigator.webdriver, plugins: navigator.plugins.length })" })
// Expect: { webdriver: false, plugins: 5 }
```

## Vision Agent (`@vision`)

Spawns Gemini 2.5 Flash to analyze screenshots. Use it to:
- Map complex UIs (dashboards, SaaS platforms)
- Find exact pixel coordinates of elements
- Read text that the DOM doesn't expose (canvas, iframes, images)
- Verify visual state (checked/unchecked, visible/hidden, colors)

```
@vision Read /tmp/ui-state.png. What is the reCAPTCHA showing? Green checkmark or challenge?
```

## Discovery Agent (`@discovery`)

Spawns DeepSeek V4 Pro Thinker for UI exploration. Uses browser-telemetry + vision.
```
@discovery Map the UI of https://dashboard.plaid.com to find the API keys page
```

## Skills

Available skills in this package:
- `browser-agent` — persistent interactive browser (this is your primary tool)
- `browser-telemetry` — one-shot headless Playwright (for quick navigate/screenshot)
- `customize-opencode` — edit opencode's own configuration

## Project Conventions

- **No project-specific AGENTS.md** — this package defines all behavior
- **Credentials never committed** — use `.env` files, never hardcode secrets
- **API-first testing** — use `curl` for backend endpoints before testing UI
- **Session persistence** — browser agent uses `USER_DATA_DIR` so logins survive restarts
- **Screenshots to `/tmp/ui-state.png`** — vision agent reads from this path
- **Network logs filtered** — always use `{ filter: {...} }` to avoid megabyte dumps
