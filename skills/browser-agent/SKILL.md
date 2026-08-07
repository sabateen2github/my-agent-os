---
name: browser-agent
description: Full interactive browser agent with persistent Chromium session. Navigate, click, type, scroll, screenshot, inspect network traffic, console logs, localStorage, cookies, and more. The browser stays alive between calls so you can interact with pages step by step.
license: MIT
compatibility: opencode
metadata:
  runtime: python3
  platform: linux
  service: browser-agent@9222
  backend: playwright
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
24. browser_stopIntercept → stop all URL interception, restore normal requests
25. browser_html      → get full page source
26. browser_clearLogs → reset captured logs
27. browser_close     → shut down the browser
```

React / SPA advanced tools:

```
28. browser_reactSetValue → set react-select/MUI values via React fiber tree
29. browser_triggerForm   → submit React forms (requestSubmit + fiber onSubmit)
```

Tab management:

```
30. browser_listTabs   → list all open tabs/pages (id, url, title, active flag)
31. browser_switchTab  → switch active tab by numeric tabId or 0-based index
32. browser_newTab     → create a new isolated tab (returns tabId) — use for subagent isolation
33. browser_closeTab   → close a tab by tabId or index (keeps last tab alive)
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

## 🔐 Captcha Bypass — 3 Strategies (router-aware)

Captchas are the #1 web-research blocker (Google Patents, Bing, Bloomberg, Google Search all use them). Every browser_* call already goes through the router (`:9290`), so the tools below automatically hit YOUR per-owner window — no manual port handling.

**Strategy 1 — PerimeterX / DataDome (PX): use `browser_bypassPx`**
PX captchas render a "PRESS & HOLD" button inside a hidden iframe (`display:none`) that blocks mouse/keyboard. The bypass calls `window.PX.setChallenge('solved')` which updates the `_px2` cookie — the page reloads past the challenge.
```
browser_bypassPx({})          # sets PX.setChallenge("solved")
browser_navigate({ url: "..." })  # or browser_reload({}) — apply after bypass
```
Verified E2E through the router: `bypassPx` → `{status: ok, bypassPx: "challenge-set"}` → evaluate confirms `window.__pxResult === "solved"`.

**Strategy 2 — reCAPTCHA v2 checkbox (inside iframe):**
```
browser_click({ selector: 'iframe[title="reCAPTCHA"]', waitAfter: 4000 })
```
The server auto-attempts this on every navigation. If a checkbox challenge appears:
```
browser_clickFrame({ selector: 'iframe[title*="reCAPTCHA"]', x: 28, y: 28, waitAfter: 3000 })
```
Verify: `browser_evaluate({ script: "grecaptcha.getResponse(0).length" })` → `> 0` = solved.

**Strategy 3 — reCAPTCHA image challenge (select all traffic lights):**
1. `browser_status({})` → if `captchaInfo.type === "image_challenge"`
2. `browser_screenshot({ output: "/tmp/captcha-challenge.png" })`
3. `@vision Read /tmp/captcha-challenge.png` → which tiles are correct
4. `browser_clickFrame({ selector: 'iframe[title*="reCAPTCHA"]', x: tileX, y: tileY })` for each tile
5. Click Verify via `browser_clickFrame` at the verify button coords
6. Confirm with `grecaptcha.getResponse(0).length > 0`

**Recovery rule:** Never burn more than 2 attempts on one engine. A captcha-locked Google → switch to Bing/DDG or navigate directly to the target URL. Direct URLs rarely captcha.
Detects CloudFront/AWS WAF blocks, helps you know when to clear cookies and re-authenticate.

**For complex E2E test flows (multi-step auth, form sequences, chat interactions, full user journeys), write a standalone Playwright test script and run it with `python3`, instead of using browser-agent tool calls step-by-step.**

The browser-agent HTTP proxy adds significant round-trip overhead per action (each call goes: CLI → HTTP API → spawn shell → Chromium CDP → response). For flows requiring 5+ sequential interactions, this is too slow and timing-sensitive (React re-renders, HMR, state changes can break evaluate contexts between calls).

### Methodology

1. **Backend API tests**: Use `curl` / `fetch` directly — no browser needed for `/health`, `/auth/*`, `/api/*` endpoints.
2. **Frontend rendering smoke test**: Use browser-agent tools for a single `navigate + screenshot + consoleLogs`.
3. **Full E2E user flows** (register → login → chat → widgets): Write a self-contained Playwright script, run it with `python3`, and check the exit code + output.

### Example Playwright E2E test script

```python
from playwright.sync_api import sync_playwright
import requests

BASE_URL = 'http://localhost:3000'
API_URL = 'http://localhost:8000'

def main():
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        context = browser.new_context()
        page = context.new_page()

        # Capture console errors
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('response', lambda res: errors.append(f'HTTP {res.status} {res.url}') if res.status >= 400 else None)

        # 1. Backend health
        health = requests.get(f'{API_URL}/health').json()
        assert health['status'] == 'healthy', 'Backend unhealthy'

        # 2. Load frontend
        page.goto(BASE_URL, wait_until='networkidle', timeout=30000)
        page.wait_for_selector('input', timeout=10000)

        # 3. Auth via API (faster + more reliable than UI form)
        token_resp = requests.post(f'{API_URL}/auth/token', data={
            'username': 'test@test.com',
            'password': 'pass'
        })
        access_token = token_resp.json()['access_token']

        # Inject token into browser
        page.evaluate("""
            (token) => {
                localStorage.setItem('app_token', token);
                localStorage.setItem('app_thread_id', crypto.randomUUID());
            }
        """, access_token)
        page.reload(wait_until='networkidle')

        # 4. Verify authenticated UI
        has_chat = page.evaluate("""
            () => !!document.querySelector('input[placeholder*="message"]')
        """)
        assert has_chat, 'Chat input not found after auth'

        # 5. Backend auth-protected endpoints
        tx_resp = requests.get(f'{API_URL}/api/data?limit=5', headers={
            'Authorization': f'Bearer {access_token}'
        })
        assert tx_resp.status_code == 200, 'Transactions should return 200 with auth'

        context.close()
        browser.close()

    exit(1 if errors else 0)

if __name__ == '__main__':
    main()
```

### Running the script
```bash
python3 test_e2e.py
```

### Key tips for Playwright on ARM/Cloud
- **No snap dependency** — Playwright bundles its own Chromium. Run `python3 -m playwright install chromium` once.
- **Set generous timeouts** — React hydration on cloud instances is slow. Use `timeout=60000` for page loads.
- **Start Next.js with `setsid`** — without it, `nohup` processes can die after first request. Use:
  ```bash
  cd frontend && setsid node_modules/.bin/next dev --port 3000 > /tmp/frontend.log 2>&1 &
  ```
- **Inject auth tokens via `page.evaluate()` localStorage** — don't rely on clicking through login forms (alert dialogs block the page and break evaluate contexts). Register/login via API, then inject the token.
- **Use `page.evaluate()` instead of CSS selectors for finding dynamic React elements** — they're more resilient to re-renders.
- **Wrap all `page.evaluate()` calls in try/except** — React re-renders can invalidate execution contexts between actions.

## Pro tips

- Use `browser_waitFor({ selector: "...", timeout: 5000 })` after clicking before reading results
- Use `since` parameter on `browser_networkLogs` and `browser_consoleLogs` to only get new entries
- Use `browser_clearLogs()` after checking to avoid re-reading old data on the next check
- **Your browser window is private to you**: `browser_close()`, `browser_listTabs()`, `browser_closeTab()` only affect YOUR instance — never another agent's. Cookies/state do not leak between agents.
- Your window auto-closes ~5 min after you stop using it (or instantly if your session is terminated). Don't rely on it being warm across long pauses — re-navigate if needed.
- The browser persists between calls — closing one session and navigating starts fresh
- If the browser crashes, it auto-restart on the next `browser_navigate` call
- Screenshots save to `/home/ubuntu/browser-agent/screenshots/` (default) or `~/.browser-agents/<owner>/screenshots/` (per-agent)

## Technical details

- **Single-entry router (Pattern 27)**: ALL browser_* calls go to ONE router port (`:9290`, `browser-router.service`). The router owns the per-owner instance pool (registry, spawn, eviction, close) and proxies each command to the right instance based on the `X-Agent` header. `tools/browser.ts` is a thin client — it computes the owner key and POSTs; it never touches ports, processes, or the registry. This eliminated the port-pool race class: exactly ONE process writes the registry (under a cross-process lock shared with the reaper).
- **Per-owner browser windows**: Every subagent gets its OWN browser instance (own port, own user-data-dir, own Chromium window). The orchestrator shares the default `127.0.0.1:9222` instance; every other agent gets a private instance on ports 9230-9289 (registry: `~/.browser-agents/registry.json`).
- Server: Python HTTP API on `127.0.0.1:9222` (default) + per-owner ports (`skills/browser/server.py`); router: `skills/browser/router.py` on `:9290`
- Systemd services (user scope): `browser-router.service` (router), `browser-agent.service` (default :9222 instance), `browser-instance-reaper.timer` (auto-closes idle per-agent windows every minute)
- Browser: Playwright Chromium with `launch_persistent_context` for session persistence
- User data dir: `~/browser-agent/user-data` (default), `~/.browser-agents/<owner>/user-data` (per-agent)
- Stealth: Anti-detection enabled by default (webdriver=false, faked plugins, clean UA)
- Page logs are buffered (up to 5000 network, 5000 console entries)
- Migration: Replaced Puppeteer (server.js) with Playwright (server.py) — same API contract

## 🔒 Per-Owner Window Isolation (Pattern 26 → Pattern 27 Router)

**Problem:** With a single shared browser, subagents interfered with each other — `browser_close()` from one agent nuked everyone's tabs, `active_page` globals were clobbered, the MAX_TABS reaper and memory-watchdog recycle killed other agents' pages, and cookies leaked between sessions.

**Solution (v3.3 → v3.4):** Each agent session is routed to its own dedicated browser instance, now through a single router entry:

```
opencode process (tools/browser.ts — thin client)
  │  context.agent + context.sessionID  →  ownerKey(ctx)
  ▼
POST http://127.0.0.1:9290   (browser-router.service)
  header: X-Agent: "<agent>-<sha1(sessionID)[:8]>"   (shared agents → no header)
  │  router: registry lookup → spawn if needed (atomic, under lock) → proxy
  ▼
http://127.0.0.1:9230  ← surge-analyst's window (session-scoped)
http://127.0.0.1:9231  ← deep-moat-auditor's window (session-scoped)
http://127.0.0.1:9222  ← orchestrator (shared default, systemd)
```

> **v3.3 fix (hijack regression):** Ownership is keyed on **agent type + sessionID hash**, NOT agent type alone. Older v3.x orchestration spawned many *parallel* same-type subagents (e.g. 10-30x `general` at once). Keying only on the type made them all resolve to one shared window → mutual page hijacking + abort-hook churn (each finishing subagent closed the window for everyone else). Including the session hash gives every subagent invocation its own isolated window. v4.0 runs surge-analyst sequentially (at most ONE subagent at a time), but session-keyed isolation remains — it also protects deep-moat-auditor's occasional @general spawns and any future parallel usage. Same session across calls keeps the same key (session continuity); parallel same-type sessions get distinct windows.

> **v3.4 fix (port-pool race → router):** Previously every agent resolved its own port directly (`ownerCache` in browser.ts) while the reaper wrote the same registry — concurrent spawners all picked port 9230, and the reaper deleted live entries. Now the router is the ONLY registry writer (under a cross-process mkdir lock shared with reaper.py), reserves ports in the registry BEFORE spawning, and skips OS-bound ports (`ss -tln`). The port pool is invisible to agents: they just POST to `:9290` with an `X-Agent` header.

**Guarantees:**
- `browser_close()` closes ONLY the caller's own session window — impossible to affect another agent (router handles close locally per X-Agent)
- `browser_listTabs()` / `browser_closeTab()` / `browser_switchTab()` only see the caller's tabs
- Cookies, localStorage, and profile data are isolated per session (no leakage between parallel same-type agents)
- One agent's OOM/crash/recycle can never kill another agent's window
- Each session's user-data-dir persists — a closed window respawns with sessions intact

**Auto-close lifecycle (3 tiers):**
1. **Termination** — if a subagent session is aborted/killed, `context.abort` fires and the window closes immediately
2. **Idle reap** — the `browser-instance-reaper.timer` (every minute) closes windows whose owner hasn't used them for 5 min (covers normal completion; override: `BROWSER_INSTANCE_IDLE_MS`)
3. **Explicit** — agents can call `browser_close()` to close their own window early

**Tuning:** `MAX_INSTANCES` (default 12 — per-session isolation headroom for any remaining multi-window workloads, e.g. deep-moat-auditor's occasional @general spawn or user-initiated parallel discovery sessions; surge-analyst v4.0 is sequential so needs few) evicts the least-recently-used idle instance when the pool is full. All instance settings live at the top of `skills/browser/router.py` (env-overridable: `BROWSER_POOL_START/END`, `BROWSER_MAX_INSTANCES`, `BROWSER_INSTANCE_IDLE_MS`).

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

### If stealth is ever lost:
Restart the service: `systemctl --user restart browser-agent.service`
The server.py applies stealth on every new page automatically.

## Web Search Resilience

Search engines may captcha-lock headless browsers. Google blocks? Switch to Bing (`https://www.bing.com/search?q=[query]`), DuckDuckGo, or navigate directly to known-good URLs (finance.yahoo.com, wikipedia.org, sec.gov/edgar). See `orchestrator.md` Pattern 20 for the full fallback cascade, captcha detection checklist, and recovery protocol.

### 🔥 NEVER-GIVE-UP BROWSER MANDATE (v3.5 — from meta-cognition audit 2026-08-01)

**The browser is your PRIMARY tool. Never abandon it after one failure.** When the browser fails:

1. **Do NOT switch to webfetch/curl/yfinance immediately.** webfetch is an EMERGENCY fallback, not the second attempt.
2. **Retry with the fallback cascade in order:** Google → Bing → DuckDuckGo → direct URL.
3. **If a navigation times out:** retry with a longer timeout or `waitUntil: "domcontentloaded"` (not `networkidle` on slow pages) — do NOT give up.
4. **If captcha appears:** use `browser_bypassPx` (PX/DataDome), `browser_clickFrame` (reCAPTCHA), or switch engines. Pattern 2 strategy list.
5. **Only after ALL of these fail** (3+ distinct attempts across engines) may you consider webfetch.

**Giving up after 1 failed attempt = research failure.** The user explicitly requires exhaustive multi-engine triangulation.

### 🔥 NO-REVERSE-ENGINEERING MANDATE (v3.5)

**Use normal browser interaction FIRST.** The documented order is:
```
navigate → screenshot (@vision for reading) → text → click → read → evaluate (LAST)
```
`browser_evaluate` is for INSPECTION, not a substitute for normal interaction:
- ❌ DO NOT walk React fiber trees or inspect shadow DOM to "extract data" when `browser_text` or a screenshot would work.
- ❌ DO NOT call internal XHR/JSON APIs (e.g. `patents.google.com/xhr/query`, internal GraphQL) before trying normal page interaction.
- ✅ Use `browser_text` / `browser_screenshot` → @vision to read rendered content.
- ✅ Use `browser_evaluate` only when the page is truly opaque to normal tools AND you've confirmed the DOM has no readable rendered content (3+ failed attempts).

**If you cannot read a screenshot (no vision model): spawn @vision — never hack the DOM to compensate.**

### waitUntil parameter — VALID VALUES ONLY

The Playwright server accepts ONLY: `load` | `domcontentloaded` | `networkidle` | `commit`.
`networkidle2` and `networkidle0` are PUPPETEER values and WILL FAIL. The server now auto-maps them (defensive), but do not rely on it — omit `waitUntil` or use a valid value.

### Search Engines via Browser (Brave MCP removed — browser-only)

Search engines are accessed via the browser ONLY (Brave MCP was removed). Use `browser_navigate({ url: "https://www.bing.com/search?q=[query]" })` (or Google/DDG), then screenshot + vision extraction, or `browser_text` on `li.b_algo`.

## Ecosystem

This skill is part of a self-evolving agent ecosystem. When new browser patterns are discovered during real work, they get baked into `orchestrator.md` and this SKILL.md. The tools in `browser.ts` are kept in sync with what `server.py` actually supports via the `self-enhance` skill.

## 🔥 v3.2 Research Depth — Browser Research is Exhaustive

**The browser is not a quick-look tool. It is a deep research instrument. Every browser session should open 10+ distinct pages, read full content, and cross-verify across sources.**

### Research Depth Checklist (for every research task):

Before concluding any research task, verify you have:
- [ ] Opened 10+ distinct URLs (not just search result pages — actual content pages)
- [ ] Read 3+ full articles/papers (not just abstracts or snippets)
- [ ] Screenshotted 5+ key findings for @vision extraction
- [ ] Searched 2+ different search engines (Google + Bing or DDG) for the same query
- [ ] Accessed 2+ independent source types (e.g., company filing + trade journal + analyst report)
- [ ] Found and read at least 1 contrarian/opposing view
- [ ] Cross-checked quantitative claims against original source documents (not summaries)

### Multi-Engine Research Pattern:

For every research query, run variants across engines:
```
1. browser_navigate({ url: "https://www.google.com/search?q=[query]" })
   → screenshot → @vision extract
2. browser_navigate({ url: "https://www.bing.com/search?q=[query]" })
   → screenshot → @vision extract (different results, different ranking)
3. browser_navigate({ url: "https://duckduckgo.com/?q=[query]" })
   → screenshot → @vision extract (no personalization bubble)
4. Compare: did all 3 engines return the same top results? If not, dig into the differences.
```

### Deep Page Reading Protocol:

When you land on an article/paper/filing:
```
1. browser_screenshot({ fullPage: true }) → @vision: "Read entire page. Extract ALL data points."
2. browser_text({ selector: "article, .content, #main" }) → read full text
3. browser_evaluate({ script: "document.querySelectorAll('a[href]').length" }) → how many links?
4. Follow 3+ internal links to related content within the same domain
5. browser_url() → save the URL for citation
6. If behind paywall: try textise dot iitty, text version, or archive.org
```

### Source Quality Hierarchy:

When researching financial/technical topics, prefer sources in this order:
1. **Original:** Company SEC filings, government databases, patent claims, arXiv full papers
2. **Industry-validated:** IEEE Spectrum, SemiEngineering, trade journals, Gartner/IDC reports
3. **Financial media:** Reuters, Bloomberg, WSJ, Financial Times (full articles)
4. **Aggregators:** Yahoo Finance, MarketWatch, Seeking Alpha (cross-check against higher-tier sources)
5. **Social/forums:** Reddit, Twitter, StockTwits (use ONLY for sentiment, never for facts)