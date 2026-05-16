---
name: browser-agent
description: Full interactive browser agent with persistent Chromium session. Navigate, click, type, scroll, screenshot, inspect network traffic, console logs, localStorage, cookies, and more. The browser stays alive between calls so you can interact with pages step by step.
license: MIT
compatibility: opencode
metadata:
  runtime: node
  platform: linux-arm64
  service: browser-agent@9222
---

## What I do

I provide a **persistent, interactive browser session** backed by headless Chromium. Unlike simple fetch tools, the browser stays alive between calls — so you can navigate, click, type, and inspect the page incrementally, just like a real user.

The browser agent server runs as a systemd user service on port 9222 and auto-starts on boot.

## How to interact with pages

Work with the browser step by step:

```
 1. browser_navigate   → go to a URL
 2. browser_click      → click a button/link
 3. browser_clickAt    → click at exact (x,y) coordinates (OS-level, bypasses React)
 4. browser_clickFrame → click inside cross-origin iframes (reCAPTCHA, Plaid, OAuth)
 5. browser_type       → fill a form field
 6. browser_press      → press Enter, Tab, Escape, etc.
 7. browser_scroll     → scroll down/up
 8. browser_screenshot → take a snapshot of the current state
 9. browser_text       → read what's on the page
10. browser_evaluate   → run JS on the page
```

Inspect what's happening:

```
11. browser_networkLogs  → see all network requests & responses (supports filter: {method, urlPattern, urlContains})
12. browser_consoleLogs  → see console output & JS errors
13. browser_cookies      → get/set/delete cookies
14. browser_localStorage → read/write localStorage
15. browser_sessionStorage → read/write sessionStorage
```

Control the session:

```
16. browser_waitFor   → wait for an element, navigation, or network idle
17. browser_url       → get current URL & title
18. browser_status    → get browser state & log counts (includes WAF detection)
19. browser_goBack    / browser_goForward / browser_reload
20. browser_viewport  → change screen size
21. browser_hover     → hover over elements
22. browser_select    → choose dropdown options
23. browser_intercept → block URLs by regex (ads, trackers)
24. browser_html      → get full page source
25. browser_clearLogs → reset captured logs
26. browser_close     → shut down the browser
```

React / SPA advanced tools:

```
27. browser_reactSetValue → set react-select/MUI values via React fiber tree
28. browser_triggerForm   → submit React forms (requestSubmit + fiber onSubmit)
```

## Typical workflows

### Quick inspection (single-step)
Use the browser-agent tools directly for simple one-off checks:
```
browser_navigate({ url: "http://localhost:3000" })
browser_consoleLogs({})
browser_screenshot({})
```

### Fill a form and submit
```
browser_navigate({ url: "http://localhost:3000" })
browser_type({ selector: "#email", text: "user@example.com" })
browser_type({ selector: "#password", text: "secret", pressEnter: true })
browser_waitFor({ selector: ".dashboard" })
browser_screenshot({})
```

### Spy on API calls
```
browser_navigate({ url: "http://localhost:3000" })
browser_click({ selector: "#load-data-btn", clickCount: 1, delay: 50, waitAfter: 3000 })
browser_networkLogs({})
```

## React / SPA Advanced Usage

These tools bypass React synthetic events, cross-origin iframes, and dynamic class names — hardened against real-world React SPAs:

### clickAt — coordinate-based clicking
```
browser_clickAt({ x: 640, y: 389, waitAfter: 500 })
```
Use when CSS selectors don't work (dynamic React UIs, iframes, shadow DOM). Sends `Input.dispatchMouseEvent` at the OS level — the page sees a real human click.

### clickFrame — click inside iframes
```
browser_clickFrame({ selector: 'iframe[title="reCAPTCHA"]', x: 28, y: 28, waitAfter: 3000 })
```
Use for cross-origin iframes (reCAPTCHA, hCaptcha, Google OAuth). Clicks at (x,y) inside the iframe's content document.

### reactSetValue — set react-select values
```
browser_reactSetValue({ selector: '.css-1jlacyh-container', value: { value: 'business', label: 'Business or developer' } })
```
Walks React fiber tree to find `stateNode.setValue()` and calls it directly. This is the ONLY reliable way to set react-select values — DOM manipulation and click events don't update React's internal state.

### triggerForm — submit React forms
```
browser_triggerForm({ buttonSelector: 'button' })
```
Tries 2 strategies in sequence:
1. `form.requestSubmit(button)` — React-compatible submission
2. Walk React fiber to find and call `onSubmit` handler directly

### networkLogs filtering
```
browser_networkLogs({ filter: { method: 'POST', urlPattern: 'api\\.example\\.com' } })
```
Filter by HTTP method, URL regex, or substring. Cuts noise from tracking pixels.

### WAF detection
```
browser_status({})
// → { wafBlocked: true, wafMessage: '403 from ...' }
```
Detects CloudFront/AWS WAF blocks, helps you know when to clear cookies and re-authenticate.

**For complex E2E test flows (multi-step auth, form sequences, chat interactions, full user journeys), ALWAYS write a standalone Puppeteer test script and run it with `node`, instead of using browser-agent tool calls step-by-step.**

The browser-agent HTTP proxy adds significant round-trip overhead per action (each call goes: CLI → HTTP API → spawn shell → Chromium CDP → response). For flows requiring 5+ sequential interactions, this is too slow and timing-sensitive (React re-renders, HMR, state changes can break evaluate contexts between calls).

### Methodology

1. **Backend API tests**: Use `curl` / `fetch` directly — no browser needed for `/health`, `/auth/*`, `/api/*` endpoints.
2. **Frontend rendering smoke test**: Use browser-agent tools for a single `navigate + screenshot + consoleLogs`.
3. **Full E2E user flows** (register → login → chat → widgets): Write a self-contained Puppeteer script, run it with `node`, and check the exit code + output.

### Example Puppeteer E2E test script

```javascript
const puppeteer = require('puppeteer');

const CHROMIUM_PATH = '/snap/bin/chromium';  // Use system Chromium on ARM/Cloud
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:8000';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 60000,  // Essential for slow cloud hydration
  });

  const page = await browser.newPage();
  const errors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('response', res => {
    if (res.status() >= 400) errors.push(`HTTP ${res.status()} ${res.url()}`);
  });

  // 1. Backend health
  const health = await fetch(`${API_URL}/health`).then(r => r.json());
  assert(health.status === 'healthy', 'Backend unhealthy');

  // 2. Load frontend
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });

  // 3. Auth via API (faster + more reliable than UI form)
  const { access_token } = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=test@test.com&password=pass'
  }).then(r => r.json());

  // Inject token into browser
  await page.evaluate((t) => {
    localStorage.setItem('app_token', t);
    localStorage.setItem('app_thread_id', crypto.randomUUID());
  }, access_token);
  await page.reload({ waitUntil: 'networkidle2' });

  // 4. Verify authenticated UI
  const hasChat = await page.evaluate(() =>
    !!document.querySelector('input[placeholder*="message"]')
  );
  assert(hasChat, 'Chat input not found after auth');

  // 5. Backend auth-protected endpoints
  const txRes = await fetch(`${API_URL}/api/data?limit=5`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  assert(txRes.status === 200, 'Transactions should return 200 with auth');

  // Source code checks (no hardcoded secrets, correct imports, etc.)
  const fs = require('fs');
  const componentSource = fs.readFileSync('src/components/SomeComponent.tsx', 'utf8');
  assert(!componentSource.includes('localhost:8000'), 'Component should not hardcode localhost');

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
```

### Running the script
```bash
node test_e2e.js
```

### Key tips for Puppeteer on ARM/Cloud
- **Always use `executablePath: '/snap/bin/chromium'`** — bundled Puppeteer binaries fail on ARM64.
- **Set `protocolTimeout: 60000`** — React hydration on cloud instances is slow.
- **Start Next.js with `setsid`** — without it, `nohup` processes can die after first request. Use:
  ```bash
  cd frontend && setsid node_modules/.bin/next dev --port 3000 > /tmp/frontend.log 2>&1 &
  ```
- **Inject auth tokens via `page.evaluate()` localStorage** — don't rely on clicking through login forms in Puppeteer (alert dialogs block the page and break evaluate contexts). Register/login via API, then inject the token.
- **Use `page.evaluate()` instead of `page.$()` selectors for finding dynamic React elements** — they're more resilient to re-renders.
- **Wrap all `page.evaluate()` calls in try/catch** — React re-renders can invalidate execution contexts between actions.

## Pro tips

- Use `browser_waitFor({ selector: "...", timeout: 5000 })` after clicking before reading results
- Use `since` parameter on `browser_networkLogs` and `browser_consoleLogs` to only get new entries
- Use `browser_clearLogs()` after checking to avoid re-reading old data on the next check
- The browser persists between calls — closing one session and navigating starts fresh
- If the browser crashes, it auto-restart on the next `browser_navigate` call
- Screenshots save to `/home/ubuntu/browser-agent/screenshots/`

## Technical details

- Server: Node.js HTTP API on `127.0.0.1:9222`
- Systemd service: `browser-agent.service` (user scope, auto-starts on boot)
- Chromium: snap v147 at `/snap/chromium/current/usr/lib/chromium-browser/chrome`
- Puppeteer-core with headless Chrome via DevTools Protocol
- Page logs are buffered (up to 5000 network, 5000 console entries)

## Stealth / Anti-Detection

The browser-agent server includes built-in anti-detection (stealth mode) to bypass services that block headless browsers:

| Measure | What it does | Defeats |
|---|---|---|
| `--disable-blink-features=AutomationControlled` | Removes `navigator.webdriver` flag from Chrome | Google OAuth, Cloudflare |
| User-Agent override | Strips "HeadlessChrome" from UA string | Google, most bot detectors |
| `evaluateOnNewDocument` hook | Overrides `navigator.webdriver`, `navigator.plugins`, `Permissions` API | Advanced fingerprinting |
| `navigator.plugins` fake | Returns fake plugins array (5 entries) | Plugin-based detection |

### How to verify stealth is active:
```js
browser_evaluate({
  script: `(() => ({
    webdriver: navigator.webdriver,
    headlessChrome: navigator.userAgent.includes('HeadlessChrome'),
    plugins: navigator.plugins.length
  }))()`
})
// Expect: { webdriver: false, headlessChrome: false, plugins: 5 }
```

### If stealth is ever lost (e.g., restart wiped it):
The server.js at `/home/ubuntu/browser-agent/server.js` must have the stealth patches
applied. See the reference server.js in this skill directory for the canonical version.
Apply with: `systemctl --user restart browser-agent.service`

## Ecosystem

This skill is part of a self-evolving agent ecosystem. When new browser patterns are discovered during real work, they get baked into `orchestrator.md` and this SKILL.md. The tools in `browser.ts` are kept in sync with what `server.js` actually supports via the `self-enhance` skill.