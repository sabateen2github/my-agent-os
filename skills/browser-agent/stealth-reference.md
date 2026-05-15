# Stealth Reference: Bypassing Browser Bot Detection

The 3-key technique that defeats Google OAuth, Cloudflare, and most bot walls.

## The Problem

Headless browsers (Puppeteer, Playwright, Selenium) are detected by:

| Detection Vector | How they catch you | Fix |
|---|---|---|
| `navigator.webdriver === true` | Chrome sets this when launched with `--headless` or automation flags | `--disable-blink-features=AutomationControlled` + `evaluateOnNewDocument` override |
| `User-Agent` contains `HeadlessChrome` | Default headless UA is a dead giveaway | Override with normal Chrome UA |
| Empty `navigator.plugins` | Headless Chrome has no PDF/native plugins | Fake a plugins array |
| `Permissions API` behavior | Headless Chrome handles permissions queries differently | Override the `query()` method |
| WebGL vendor/renderer is empty | Headless has no GPU → no WebGL info | Harder to fix; most services don't check this |

## The 3-Key Fix

### Key 1: Chrome Args (Launch-time)
```bash
--disable-blink-features=AutomationControlled  # kills navigator.webdriver
```

### Key 2: User-Agent Override (Launch-time)
```
# Remove "HeadlessChrome" — use a standard Chrome UA:
Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36
```

### Key 3: Page-Level Overrides (Before any navigation)
```javascript
Object.defineProperty(navigator, 'webdriver', { get: () => false });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
  parameters.name === 'notifications'
    ? Promise.resolve({ state: Notification.permission })
    : originalQuery(parameters)
);
```

## Verification

In the browser console or via evaluate:
```js
({ webdriver: navigator.webdriver, headlessUA: /HeadlessChrome/.test(navigator.userAgent), plugins: navigator.plugins.length })
// Should return: { webdriver: false, headlessUA: false, plugins: 5 }
```

## Puppeteer Implementation (browser-agent)

In `server.js` `ensureBrowser()`:
```javascript
// Chrome args
args: [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--disable-gpu', '--headless=new',
  '--disable-blink-features=AutomationControlled',  // KEY
  '--window-size=1280,800',
],

// After page creation
await page.setUserAgent('Mozilla/5.0 ... Chrome/147.0.0.0 Safari/537.36');

await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  const origQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (p) =>
    p.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : origQuery(p);
});
```

## Playwright Implementation (browser-telemetry)

In `run.py` `launch_browser()`:
```python
# Chrome args
args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
       "--disable-blink-features=AutomationControlled",
       "--disable-features=IsolateOrigins,site-per-process"]

# User agent
context = browser.new_context(
    user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ... Chrome/147.0.0.0 Safari/537.36"
)

# Init script (injected before every page load)
context.add_init_script("""
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  // ... (full script above)
""")
```

## Limitations

- **WebGL fingerprint** — still reveals headless nature if checked. Most services don't go this deep.
- **reCAPTCHA v3** — behavioral analysis, not fingerprint-based. The stealth patch helps but is not a bypass.
- **Cloudflare Turnstile** — can still trigger on behavioral patterns. The stealth patch handles the fingerprint check, but repeated rapid requests may trigger rate limiting.
- **2FA** — Google OAuth still requires real user interaction for 2-step verification. Stealth handles the browser check, not the authentication itself.
