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
1. browser_navigate  → go to a URL
2. browser_click     → click a button/link
3. browser_type      → fill a form field
4. browser_press     → press Enter, Tab, Escape, etc.
5. browser_scroll    → scroll down/up
6. browser_screenshot → take a snapshot of the current state
7. browser_text      → read what's on the page
8. browser_evaluate  → run JS on the page
```

Inspect what's happening:

```
9.  browser_networkLogs  → see all network requests & responses
10. browser_consoleLogs  → see console output & JS errors
11. browser_cookies      → get/set/delete cookies
12. browser_localStorage → read/write localStorage
13. browser_sessionStorage → read/write sessionStorage
```

Control the session:

```
14. browser_waitFor   → wait for an element, navigation, or network idle
15. browser_url       → get current URL & title
16. browser_status    → get browser state & log counts
17. browser_goBack    / browser_goForward / browser_reload
18. browser_viewport  → change screen size
19. browser_hover     → hover over elements
20. browser_select    → choose dropdown options
21. browser_intercept → block URLs by regex (ads, trackers)
22. browser_html       → get full page source
23. browser_clearLogs  → reset captured logs
24. browser_close      → shut down the browser
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

## CRITICAL: When to use Puppeteer scripts instead of browser-agent tools

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
    localStorage.setItem('oracle_token', t);
    localStorage.setItem('oracle_thread_id', crypto.randomUUID());
  }, access_token);
  await page.reload({ waitUntil: 'networkidle2' });

  // 4. Verify authenticated UI
  const hasChat = await page.evaluate(() =>
    !!document.querySelector('input[placeholder*="Oracle"]')
  );
  assert(hasChat, 'Chat input not found after auth');

  // 5. Backend auth-protected endpoints
  const txRes = await fetch(`${API_URL}/api/finance/transactions?limit=5`, {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  assert(txRes.status === 200, 'Transactions should return 200 with auth');

  // Source code checks (no hardcoded secrets, correct imports, etc.)
  const fs = require('fs');
  const alertCard = fs.readFileSync('path/to/WealthAlertCard.tsx', 'utf8');
  assert(!alertCard.includes('localhost:8000'), 'WealthAlertCard should not hardcode localhost');

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