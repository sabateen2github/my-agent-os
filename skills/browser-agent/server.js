const http = require('http');
const puppeteer = require('puppeteer-core');

const CHROMIUM_PATH = '/snap/chromium/current/usr/lib/chromium-browser/chrome';
const PORT = parseInt(process.env.BROWSER_AGENT_PORT || '9222', 10);
const USER_DATA_DIR = '/home/ubuntu/browser-agent/user-data';  // Persist session across restarts
const LOG_MAX_AGE_MS = 60 * 60 * 1000;  // 1 hour — drop older logs to prevent memory bloat
const LOG_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;  // Clean up every 10 minutes
const PAGE_RECYCLE_INTERVAL_MS = 30 * 60 * 1000;  // Close/reopen page every 30 min to flush DOM/JS contexts
const STALE_TAB_AGE_MS = 18 * 60 * 60 * 1000;  // Auto-close tabs older than 18 hours
const TAB_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;  // Check for stale tabs every 30 minutes
const MEMORY_WARN_MB = 500;   // Log warning when RSS exceeds 500MB
const MEMORY_KILL_MB = 800;   // Hard-recycle browser when RSS exceeds 800MB
const MEMORY_CHECK_INTERVAL_MS = 5 * 60 * 1000;  // Check memory every 5 minutes
const MAX_TABS = 20;  // Hard cap — close oldest tabs if exceeded

let browser = null;
let activePage = null;  // Currently active page (most recently created/interacted)
const managedPages = new Map();  // page → { id, createdAt, lastUsed }
const consoleLogs = [];
const networkRequests = [];
const networkResponses = [];
const jsErrors = [];
let connected = false;

// Periodic memory hygiene: drop log entries older than LOG_MAX_AGE_MS
setInterval(() => {
  const cutoff = Date.now() - LOG_MAX_AGE_MS;
  const trim = (arr) => { while (arr.length && arr[0].timestamp < cutoff) arr.shift(); };
  trim(consoleLogs);
  trim(networkRequests);
  trim(networkResponses);
  trim(jsErrors);
}, LOG_CLEANUP_INTERVAL_MS).unref();

// ── Tab / Page Management ────────────────────────────────────────────

function trackPage(p) {
  managedPages.set(p, { id: managedPages.size + 1, createdAt: Date.now(), lastUsed: Date.now() });
  activePage = p;
}

function untrackPage(p) {
  managedPages.delete(p);
  // If the active page was closed, pick the most recently used remaining page
  if (activePage === p) {
    let newest = null;
    let newestTime = 0;
    for (const [pg, meta] of managedPages) {
      if (meta.lastUsed > newestTime) { newest = pg; newestTime = meta.lastUsed; }
    }
    activePage = newest;
  }
}

function touchActivePage() {
  const meta = managedPages.get(activePage);
  if (meta) meta.lastUsed = Date.now();
}

// Stale tab cleanup: close pages inactive for > STALE_TAB_AGE_MS
setInterval(async () => {
  if (!browser || !browser.connected) return;
  const cutoff = Date.now() - STALE_TAB_AGE_MS;
  const toClose = [];
  for (const [pg, meta] of managedPages) {
    if (meta.lastUsed < cutoff) toClose.push(pg);
  }
  // Keep at least 1 page alive
  if (toClose.length >= managedPages.size) toClose.pop();

  for (const pg of toClose) {
    try {
      const meta = managedPages.get(pg);
      console.error(`[browser-agent] Closing stale tab #${meta?.id} (idle since ${new Date(meta?.lastUsed).toISOString()})`);
      await pg.close().catch(() => {});
      untrackPage(pg);
    } catch {}
  }

  // Hard cap: if we still have too many tabs, close the oldest ones
  while (managedPages.size > MAX_TABS) {
    let oldest = null;
    let oldestTime = Infinity;
    for (const [pg, meta] of managedPages) {
      if (meta.createdAt < oldestTime) { oldest = pg; oldestTime = meta.createdAt; }
    }
    if (oldest && oldest !== activePage) {
      try { await oldest.close().catch(() => {}); } catch {}
      untrackPage(oldest);
    } else if (managedPages.size > 1) {
      // Can't close active page, close next oldest
      const sorted = [...managedPages.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
      const toKill = sorted.find(([pg]) => pg !== activePage);
      if (toKill) {
        try { await toKill[0].close().catch(() => {}); } catch {}
        untrackPage(toKill[0]);
      }
    } else break;
  }
}, TAB_CLEANUP_INTERVAL_MS).unref();

// Memory watchdog: monitor RSS and warn/recycle if thresholds exceeded
let lastPageRecycle = Date.now();
let recycleRequested = false;

setInterval(() => {
  const mem = process.memoryUsage();
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  if (rssMB > MEMORY_WARN_MB) {
    console.error(`[browser-agent] WARNING: Memory ${rssMB}MB > ${MEMORY_WARN_MB}MB threshold`);
  }
  if (rssMB > MEMORY_KILL_MB) {
    console.error(`[browser-agent] CRITICAL: Memory ${rssMB}MB > ${MEMORY_KILL_MB}MB — triggering recycle`);
    recycleRequested = true;
  }
}, MEMORY_CHECK_INTERVAL_MS).unref();

// Page recycle: periodically close and reopen the active page to flush DOM/JS context bloat
// This does NOT restart the browser — cookies, localStorage, sessionStorage all survive
async function recyclePage() {
  if (!activePage || !browser || !browser.connected) return;
  try {
    const oldPage = activePage;
    const currentUrl = oldPage.url();
    untrackPage(oldPage);
    await oldPage.close().catch(() => {});

    const newPage = await browser.newPage();
    trackPage(newPage);

    // Re-apply stealth on new page
    await newPage.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
    await newPage.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
      );
    });
    await newPage.setViewport({ width: 1280, height: 800 });

    // Re-attach event listeners
    newPage.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
      if (consoleLogs.length > 5000) consoleLogs.splice(0, 1000);
    });
    newPage.on('pageerror', err => {
      jsErrors.push({ message: err.message, timestamp: Date.now() });
      if (jsErrors.length > 1000) jsErrors.splice(0, 200);
    });
    newPage.on('request', req => {
      networkRequests.push({ id: req._requestId, method: req.method(), url: req.url(), resourceType: req.resourceType(), headers: req.headers(), postData: req.postData(), timestamp: Date.now() });
      if (networkRequests.length > 5000) networkRequests.splice(0, 1000);
    });
    newPage.on('response', res => {
      networkResponses.push({ id: res._requestId, url: res.url(), status: res.status(), statusText: res.statusText(), headers: res.headers(), fromCache: res.fromCache(), timestamp: Date.now() });
      if (networkResponses.length > 5000) networkResponses.splice(0, 1000);
    });

    // Navigate back to where we were
    if (currentUrl && currentUrl !== 'about:blank') {
      await newPage.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
    console.error(`[browser-agent] Page recycled (was at ${currentUrl}), ${managedPages.size} tabs active`);
  } catch (e) {
    console.error(`[browser-agent] Page recycle failed: ${e.message}`);
  }
}

// Hard recycle: kill and restart the entire browser process (session survives via userDataDir)
async function hardRecycle() {
  console.error(`[browser-agent] Hard recycling browser (${managedPages.size} tabs)...`);
  try {
    for (const [pg] of managedPages) {
      await pg.close().catch(() => {});
    }
    managedPages.clear();
    activePage = null;
    if (browser) await browser.close().catch(() => {});
  } catch {}
  browser = null;
  connected = false;
  recycleRequested = false;
  await ensureBrowser();
  console.error(`[browser-agent] Hard recycle complete`);
}

// Apply stealth + listeners to a page (used for both initial page and popups)
async function setupPage(pg) {
  await pg.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
  await pg.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  await pg.setViewport({ width: 1280, height: 800 });

  pg.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
    if (consoleLogs.length > 5000) consoleLogs.splice(0, 1000);
  });
  pg.on('pageerror', err => {
    jsErrors.push({ message: err.message, timestamp: Date.now() });
    if (jsErrors.length > 1000) jsErrors.splice(0, 200);
  });
  pg.on('request', req => {
    networkRequests.push({ id: req._requestId, method: req.method(), url: req.url(), resourceType: req.resourceType(), headers: req.headers(), postData: req.postData(), timestamp: Date.now() });
    if (networkRequests.length > 5000) networkRequests.splice(0, 1000);
  });
  pg.on('response', res => {
    networkResponses.push({ id: res._requestId, url: res.url(), status: res.status(), statusText: res.statusText(), headers: res.headers(), fromCache: res.fromCache(), timestamp: Date.now() });
    if (networkResponses.length > 5000) networkResponses.splice(0, 1000);
  });
}

async function ensureBrowser() {
  // Check if hard recycle was requested by memory watchdog
  if (recycleRequested) {
    await hardRecycle();
  }

  // Periodic page recycle (soft — keeps browser + session alive)
  if (activePage && browser && browser.connected && (Date.now() - lastPageRecycle > PAGE_RECYCLE_INTERVAL_MS)) {
    await recyclePage();
    lastPageRecycle = Date.now();
  }

  if (browser && browser.connected) {
    // Verify active page is still alive; if not, pick another or create new
    if (activePage) {
      try { await activePage.evaluate(() => 1); touchActivePage(); return; } catch {}
    }
    // Active page died — pick another tracked page or create new
    for (const [pg] of managedPages) {
      try { await pg.evaluate(() => 1); activePage = pg; touchActivePage(); return; } catch { untrackPage(pg); }
    }
    // All pages dead — create new
    try {
      activePage = await browser.newPage();
      trackPage(activePage);
      await setupPage(activePage);
      lastPageRecycle = Date.now();
      return;
    } catch {}
    // Browser itself dead — fall through to relaunch
  }

  // Fresh browser launch
  browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--headless=new', '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });
  connected = true;

  // Track popup/new-tab creation (Google OAuth, target="_blank", window.open)
  browser.on('targetcreated', async (target) => {
    if (target.type() !== 'page') return;
    try {
      const popup = await target.page();
      if (!popup || managedPages.has(popup)) return;
      trackPage(popup);
      await setupPage(popup);
      console.error(`[browser-agent] Popup/tab tracked (#${managedPages.get(popup).id}), total: ${managedPages.size}`);
    } catch (e) {
      console.error(`[browser-agent] Failed to track popup: ${e.message}`);
    }
  });

  // Track target destruction (popup closed itself)
  browser.on('targetdestroyed', async (target) => {
    if (target.type() !== 'page') return;
    try {
      const deadPage = await target.page().catch(() => null);
      if (deadPage && managedPages.has(deadPage)) {
        untrackPage(deadPage);
        console.error(`[browser-agent] Popup/tab closed, ${managedPages.size} remaining`);
      }
    } catch {}
  });

  managedPages.clear();
  activePage = await browser.newPage();
  trackPage(activePage);
  await setupPage(activePage);
  lastPageRecycle = Date.now();
}

function jsonResponse(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleCommand(cmd) {
  await ensureBrowser();

  switch (cmd.action) {

    case 'navigate': {
      await activePage.goto(cmd.url, { waitUntil: cmd.waitUntil || 'networkidle2', timeout: cmd.timeout || 30000 });
      touchActivePage();
      const title = await activePage.title();
      const url = activePage.url();
      return { status: 'ok', title, url };
    }

    case 'click': {
      const selector = cmd.selector;
      if (cmd.waitFor) await activePage.waitForSelector(selector, { timeout: cmd.waitFor });
      await activePage.click(selector, { clickCount: cmd.clickCount || 1, delay: cmd.delay || 0 });
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', clicked: selector };
    }

    case 'clickAt': {
      const x = Number(cmd.x);
      const y = Number(cmd.y);
      const clickCount = cmd.clickCount || 1;
      await activePage.mouse.click(x, y, { clickCount });
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', clickedAt: { x, y }, clickCount };
    }

    case 'type': {
      const selector = cmd.selector;
      if (cmd.waitFor) await activePage.waitForSelector(selector, { timeout: cmd.waitFor });
      if (cmd.clear) await activePage.evaluate(s => { document.querySelector(s).value = ''; }, selector);
      await activePage.type(selector, cmd.text, { delay: cmd.delay || 0 });
      touchActivePage();
      if (cmd.pressEnter) await activePage.keyboard.press('Enter');
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', typed: cmd.text, selector };
    }

    case 'press': {
      await activePage.keyboard.press(cmd.key);
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', pressed: cmd.key };
    }

    case 'scroll': {
      if (cmd.selector) {
        await activePage.evaluate((s, d) => { const el = document.querySelector(s); el.scrollBy({ top: d, behavior: 'smooth' }); }, cmd.selector, cmd.delta || 300);
      } else {
        await activePage.evaluate(d => window.scrollBy(0, d), cmd.delta || 300);
      }
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', scrolled: cmd.delta || 300 };
    }

    case 'screenshot': {
      const outputPath = cmd.output || `/home/ubuntu/browser-agent/screenshots/screenshot-${Date.now()}.png`;
      const opts = { path: outputPath, fullPage: cmd.fullPage || false, type: cmd.type || 'png' };
      if (cmd.selector) {
        const el = await activePage.$(cmd.selector);
        if (el) { await el.screenshot(opts); }
        else { await activePage.screenshot(opts); }
      } else {
        await activePage.screenshot(opts);
      }
      return { status: 'ok', file: outputPath };
    }

    case 'evaluate': {
      const result = await activePage.evaluate(cmd.script);
      touchActivePage();
      return { status: 'ok', result };
    }

    case 'html': {
      const html = await activePage.content();
      return { status: 'ok', html: html.substring(0, Number(cmd.maxLength) || 500000) };
    }

    case 'text': {
      let text;
      if (cmd.selector) {
        text = await activePage.$$eval(cmd.selector, els => els.map(e => e.innerText).join('\n'));
      } else {
        text = await activePage.evaluate(() => document.body?.innerText || '');
      }
      return { status: 'ok', text: text.substring(0, Number(cmd.maxLength) || 100000) };
    }

    case 'url': {
      return { status: 'ok', url: activePage.url(), title: await activePage.title() };
    }

    case 'waitFor': {
      if (cmd.selector) {
        await activePage.waitForSelector(cmd.selector, { timeout: cmd.timeout || 10000 });
      } else if (cmd.navigation) {
        await activePage.waitForNavigation({ timeout: cmd.timeout || 10000 });
      } else if (cmd.networkIdle) {
        await activePage.waitForNetworkIdle({ timeout: cmd.timeout || 10000 });
      }
      return { status: 'ok' };
    }

    case 'goBack': {
      await activePage.goBack({ timeout: cmd.timeout || 10000 });
      touchActivePage();
      return { status: 'ok', url: activePage.url() };
    }

    case 'goForward': {
      await activePage.goForward({ timeout: cmd.timeout || 10000 });
      touchActivePage();
      return { status: 'ok', url: activePage.url() };
    }

    case 'reload': {
      await activePage.reload({ timeout: cmd.timeout || 10000 });
      touchActivePage();
      return { status: 'ok', url: activePage.url() };
    }

    case 'cookies': {
      if (cmd.get) {
        const cookies = await activePage.cookies(cmd.get === true ? undefined : cmd.get);
        return { status: 'ok', cookies };
      }
      if (cmd.set) {
        await activePage.setCookie(cmd.set);
        return { status: 'ok', set: true };
      }
      if (cmd.delete) {
        const names = Array.isArray(cmd.delete) ? cmd.delete : [cmd.delete];
        await activePage.deleteCookie(...names.map(n => ({ name: n })));
        return { status: 'ok', deleted: names };
      }
      const cookies = await activePage.cookies();
      return { status: 'ok', cookies };
    }

    case 'localStorage': {
      const result = await activePage.evaluate((action, key, value) => {
        if (action === 'get') return localStorage.getItem(key);
        if (action === 'set') { localStorage.setItem(key, value); return true; }
        if (action === 'delete') { localStorage.removeItem(key); return true; }
        if (action === 'clear') { localStorage.clear(); return true; }
        if (action === 'keys') return Object.keys(localStorage);
        if (action === 'all') {
          const items = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            items[k] = localStorage.getItem(k);
          }
          return items;
        }
        return null;
      }, cmd.op, cmd.key, cmd.value);
      return { status: 'ok', result };
    }

    case 'sessionStorage': {
      const result = await activePage.evaluate((action, key, value) => {
        if (action === 'get') return sessionStorage.getItem(key);
        if (action === 'set') { sessionStorage.setItem(key, value); return true; }
        if (action === 'delete') { sessionStorage.removeItem(key); return true; }
        if (action === 'clear') { sessionStorage.clear(); return true; }
        if (action === 'keys') return Object.keys(sessionStorage);
        if (action === 'all') {
          const items = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            items[k] = sessionStorage.getItem(k);
          }
          return items;
        }
        return null;
      }, cmd.op, cmd.key, cmd.value);
      return { status: 'ok', result };
    }

    case 'networkLogs': {
      const since = cmd.since || 0;
      let reqs = networkRequests.filter(r => r.timestamp >= since);
      let ress = networkResponses.filter(r => r.timestamp >= since);
      // Apply filters
      if (cmd.filter) {
        const f = cmd.filter;
        if (f.method) { reqs = reqs.filter(r => r.method === f.method.toUpperCase()); ress = ress.filter(r => r.status && String(r.status) === String(f.statusCode)); }
        if (f.urlPattern) { const re = new RegExp(f.urlPattern, 'i'); reqs = reqs.filter(r => re.test(r.url)); ress = ress.filter(r => re.test(r.url)); }
        if (f.urlContains) { reqs = reqs.filter(r => r.url.includes(f.urlContains)); ress = ress.filter(r => r.url.includes(f.urlContains)); }
      }
      return { status: 'ok', requests: reqs, responses: ress, count: { requests: reqs.length, responses: ress.length } };
    }

    case 'clickFrame': {
      // Click at coordinates inside a cross-origin iframe.
      // Uses frame.contentFrame() to target the iframe's document.
      const frameEl = await activePage.$(cmd.selector);
      if (!frameEl) return { status: 'error', message: `iframe not found: ${cmd.selector}` };
      const frame = await frameEl.contentFrame();
      if (!frame) return { status: 'error', message: 'Cannot access iframe content (cross-origin without --disable-features=site-per-process)' };
      const x = Number(cmd.x) || 0;
      const y = Number(cmd.y) || 0;
      await frame.click(cmd.innerSelector || 'body', { offset: { x, y } });
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', clickedFrame: cmd.selector, at: { x, y } };
    }

    case 'reactSetValue': {
      // Set react-select values by walking React fiber tree to find setValue/selectOption.
      // Uses the same technique that worked against Plaid's create-team form.
      const result = await activePage.evaluate((sel, opt) => {
        const container = typeof sel === 'string' ? document.querySelector(sel) : document.querySelectorAll(sel)[0];
        if (!container) return 'no container';
        let fiber = container, d = 0;
        while (fiber && d < 30) {
          const k = Object.keys(fiber).find(kk => kk.startsWith('__reactFiber'));
          if (k) { fiber = fiber[k]; break; }
          fiber = fiber.parentElement; d++;
        }
        if (!fiber || !fiber.return) return 'no fiber';
        let node = fiber.return, s = 0;
        while (node && s < 50) {
          if (node.stateNode && typeof node.stateNode.setValue === 'function') {
            node.stateNode.setValue([opt], 'select-option');
            return 'set:' + (opt.label || opt.value || 'ok');
          }
          node = node.return; s++;
        }
        return 'no setValue in ' + s + ' steps';
      }, cmd.selector, cmd.value);
      touchActivePage();
      return { status: 'ok', result };
    }

    case 'triggerForm': {
      // Multi-strategy form submission for React SPAs.
      // Tries requestSubmit (React), native click, raw event, and fiber onSubmit.
      const methods = [];
      try {
        // Strategy 1: Find button and use form.requestSubmit (React compatible)
        const btn = cmd.buttonSelector 
          ? await activePage.$(cmd.buttonSelector) 
          : (await activePage.$$('button[type="submit"], button')).find(async b => (await activePage.evaluate(el => el.textContent, b)).includes('ubmit') || true);
        if (btn) {
          await activePage.evaluate(b => {
            const form = b.closest('form');
            if (form) { form.requestSubmit(b); return 'requestSubmit'; }
            b.click(); return 'click';
          }, btn);
          methods.push('requestSubmit');
        }
      } catch (e) { methods.push('submit error: ' + e.message); }
      
      // Strategy 2: Walk React fiber to find and call onSubmit directly
      try {
        await activePage.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ubmit') || b.textContent.includes('Create') || b.type === 'submit');
          if (!btn) return;
          let fiber = btn, d = 0;
          while (fiber && d < 30) {
            const k = Object.keys(fiber).find(kk => kk.startsWith('__reactFiber'));
            if (k) { fiber = fiber[k]; break; }
            fiber = fiber.parentElement; d++;
          }
          if (!fiber?.return) return;
          let node = fiber.return, s = 0;
          while (node && s < 80) {
            const props = node.memoizedProps || {};
            if (props.onSubmit) {
              props.onSubmit({ preventDefault: () => {}, stopPropagation: () => {}, nativeEvent: { submitter: btn } });
              return;
            }
            node = node.return; s++;
          }
        });
        methods.push('fiberOnSubmit');
      } catch (e) { methods.push('fiber error: ' + e.message); }
      
      touchActivePage();
      return { status: 'ok', methods };
    }

    case 'consoleLogs': {
      const since = cmd.since || 0;
      const logs = consoleLogs.filter(l => l.timestamp >= since);
      const errors = jsErrors.filter(e => e.timestamp >= since);
      return { status: 'ok', console: logs, errors, count: { logs: logs.length, errors: errors.length } };
    }

    case 'clearLogs': {
      consoleLogs.length = 0;
      networkRequests.length = 0;
      networkResponses.length = 0;
      jsErrors.length = 0;
      return { status: 'ok' };
    }

    case 'hover': {
      await activePage.hover(cmd.selector);
      touchActivePage();
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', hovered: cmd.selector };
    }

    case 'select': {
      await activePage.select(cmd.selector, ...cmd.values);
      return { status: 'ok', selected: cmd.values };
    }

    case 'upload': {
      const input = await activePage.$(cmd.selector);
      await input.uploadFile(...cmd.paths);
      return { status: 'ok', uploaded: cmd.paths };
    }

    case 'viewport': {
      await activePage.setViewport({ width: cmd.width, height: cmd.height });
      return { status: 'ok', width: cmd.width, height: cmd.height };
    }

    case 'intercept': {
      await activePage.setRequestInterception(true);
      const patterns = cmd.blockPatterns || [];
      const existingHandler = activePage._interceptHandler;
      if (existingHandler) activePage.off('request', existingHandler);

      const handler = req => {
        const url = req.url();
        const blocked = patterns.some(p => url.match(new RegExp(p)));
        if (blocked) { req.abort(); return; }
        req.continue();
      };
      activePage._interceptHandler = handler;
      activePage.on('request', handler);
      return { status: 'ok', intercepting: true, blockPatterns: patterns };
    }

    case 'stopIntercept': {
      await activePage.setRequestInterception(false);
      return { status: 'ok', intercepting: false };
    }

    case 'emulate': {
      if (cmd.device) {
        const devices = puppeteer.devices;
        const device = devices[cmd.device];
        if (device) { await activePage.emulate(device); return { status: 'ok', emulated: cmd.device }; }
      }
      if (cmd.userAgent) {
        await activePage.setUserAgent(cmd.userAgent);
      }
      return { status: 'ok' };
    }

    case 'close': {
      if (browser) {
        for (const [pg] of managedPages) { await pg.close().catch(() => {}); }
        managedPages.clear();
        activePage = null;
        await browser.close().catch(() => {});
        browser = null;
        connected = false;
      }
      consoleLogs.length = 0; networkRequests.length = 0; networkResponses.length = 0; jsErrors.length = 0;
      return { status: 'ok', closed: true };
    }

    case 'status': {
      let wafBlocked = false, wafMessage = null;
      if (activePage) {
        try {
          const result = await activePage.evaluate(() => {
            const title = document.title;
            const body = document.body?.innerText?.slice(0, 200) || '';
            if (title.includes('ERROR: The request could not be satisfied') || 
                body.includes('The request could not be satisfied')) {
              return { blocked: true, reason: body.slice(0, 150) };
            }
            if (body.includes('403 ERROR')) {
              return { blocked: true, reason: '403 from ' + window.location.href };
            }
            return { blocked: false };
          });
          if (result?.blocked) {
            wafBlocked = true;
            wafMessage = result.reason;
          }
        } catch {}
      }
      return {
        status: 'ok',
        connected,
        url: activePage ? activePage.url() : null,
        title: activePage ? await activePage.title().catch(() => null) : null,
        tabCount: managedPages.size,
        consoleLogCount: consoleLogs.length,
        networkRequestCount: networkRequests.length,
        networkResponseCount: networkResponses.length,
        jsErrorCount: jsErrors.length,
        wafBlocked,
        wafMessage,
      };
    }

    default:
      return { status: 'error', message: `Unknown action: ${cmd.action}` };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const cmd = JSON.parse(body);
        const result = await handleCommand(cmd);
        jsonResponse(res, result);
      } catch (err) {
        jsonResponse(res, { status: 'error', message: err.message, stack: err.stack });
      }
    });
  } else if (req.method === 'GET') {
    if (req.url === '/status') {
      try {
        const result = await handleCommand({ action: 'status' });
        jsonResponse(res, result);
      } catch (err) {
        jsonResponse(res, { status: 'error', message: err.message });
      }
    } else {
      jsonResponse(res, { service: 'browser-agent', version: '2.0.0', port: PORT });
    }
  } else {
    res.writeHead(405);
    res.end('Method not allowed');
  }
});

server.listen(PORT, () => {
  console.log(`browser-agent server listening on port ${PORT}`);
});