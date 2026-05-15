const http = require('http');
const puppeteer = require('puppeteer-core');

const CHROMIUM_PATH = '/snap/chromium/current/usr/lib/chromium-browser/chrome';
const PORT = parseInt(process.env.BROWSER_AGENT_PORT || '9222', 10);
const USER_DATA_DIR = '/home/ubuntu/browser-agent/user-data';  // Persist session across restarts
const LOG_MAX_AGE_MS = 60 * 60 * 1000;  // 1 hour — drop older logs to prevent memory bloat
const LOG_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;  // Clean up every 10 minutes
const PAGE_RECYCLE_INTERVAL_MS = 30 * 60 * 1000;  // Close/reopen page every 30 min to flush DOM/JS contexts
const MEMORY_WARN_MB = 500;   // Log warning when RSS exceeds 500MB
const MEMORY_KILL_MB = 800;   // Hard-recycle browser when RSS exceeds 800MB
const MEMORY_CHECK_INTERVAL_MS = 5 * 60 * 1000;  // Check memory every 5 minutes

let browser = null;
let page = null;
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

// Page recycle: periodically close and reopen the page to flush DOM/JS context bloat
// This does NOT restart the browser — cookies, localStorage, sessionStorage all survive
async function recyclePage() {
  if (!page || !browser || !browser.connected) return;
  try {
    const currentUrl = page.url();
    await page.close().catch(() => {});
    page = await browser.newPage();

    // Re-apply stealth on new page
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
      );
    });
    await page.setViewport({ width: 1280, height: 800 });

    // Re-attach event listeners
    page.on('console', msg => {
      consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
      if (consoleLogs.length > 5000) consoleLogs.splice(0, 1000);
    });
    page.on('pageerror', err => {
      jsErrors.push({ message: err.message, timestamp: Date.now() });
      if (jsErrors.length > 1000) jsErrors.splice(0, 200);
    });
    page.on('request', req => {
      networkRequests.push({ id: req._requestId, method: req.method(), url: req.url(), resourceType: req.resourceType(), headers: req.headers(), postData: req.postData(), timestamp: Date.now() });
      if (networkRequests.length > 5000) networkRequests.splice(0, 1000);
    });
    page.on('response', res => {
      networkResponses.push({ id: res._requestId, url: res.url(), status: res.status(), statusText: res.statusText(), headers: res.headers(), fromCache: res.fromCache(), timestamp: Date.now() });
      if (networkResponses.length > 5000) networkResponses.splice(0, 1000);
    });

    // Navigate back to where we were
    if (currentUrl && currentUrl !== 'about:blank') {
      await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    }
    console.error(`[browser-agent] Page recycled (was at ${currentUrl})`);
  } catch (e) {
    console.error(`[browser-agent] Page recycle failed: ${e.message}`);
  }
}

// Hard recycle: kill and restart the entire browser process (session survives via userDataDir)
async function hardRecycle() {
  console.error(`[browser-agent] Hard recycling browser...`);
  try {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  } catch {}
  browser = null;
  page = null;
  connected = false;
  recycleRequested = false;
  await ensureBrowser();
  console.error(`[browser-agent] Hard recycle complete`);
}

async function ensureBrowser() {
  // Check if hard recycle was requested by memory watchdog
  if (recycleRequested) {
    await hardRecycle();
  }

  // Periodic page recycle (soft — keeps browser + session alive)
  if (page && browser && browser.connected && (Date.now() - lastPageRecycle > PAGE_RECYCLE_INTERVAL_MS)) {
    await recyclePage();
    lastPageRecycle = Date.now();
  }

  if (browser && browser.connected) {
    try { await browser.version(); return; } catch {}
  }
  browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    userDataDir: USER_DATA_DIR,  // Persist cookies, localStorage, sessionStorage across restarts
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless=new',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });
  connected = true;
  page = await browser.newPage();

  // Stealth: remove HeadlessChrome from user agent
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');

  // Stealth: override navigator.webdriver and other detection flags
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });

  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    consoleLogs.push({ type: msg.type(), text: msg.text(), timestamp: Date.now() });
    if (consoleLogs.length > 5000) consoleLogs.splice(0, 1000);
  });
  page.on('pageerror', err => {
    jsErrors.push({ message: err.message, timestamp: Date.now() });
    if (jsErrors.length > 1000) jsErrors.splice(0, 200);
  });
  page.on('request', req => {
    networkRequests.push({ id: req._requestId, method: req.method(), url: req.url(), resourceType: req.resourceType(), headers: req.headers(), postData: req.postData(), timestamp: Date.now() });
    if (networkRequests.length > 5000) networkRequests.splice(0, 1000);
  });
  page.on('response', res => {
    networkResponses.push({ id: res._requestId, url: res.url(), status: res.status(), statusText: res.statusText(), headers: res.headers(), fromCache: res.fromCache(), timestamp: Date.now() });
    if (networkResponses.length > 5000) networkResponses.splice(0, 1000);
  });

  lastPageRecycle = Date.now();  // Reset recycle timer on fresh launch
}

function jsonResponse(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleCommand(cmd) {
  await ensureBrowser();

  switch (cmd.action) {

    case 'navigate': {
      await page.goto(cmd.url, { waitUntil: cmd.waitUntil || 'networkidle2', timeout: cmd.timeout || 30000 });
      const title = await page.title();
      const url = page.url();
      return { status: 'ok', title, url };
    }

    case 'click': {
      const selector = cmd.selector;
      if (cmd.waitFor) await page.waitForSelector(selector, { timeout: cmd.waitFor });
      await page.click(selector, { clickCount: cmd.clickCount || 1, delay: cmd.delay || 0 });
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', clicked: selector };
    }

    case 'type': {
      const selector = cmd.selector;
      if (cmd.waitFor) await page.waitForSelector(selector, { timeout: cmd.waitFor });
      if (cmd.clear) await page.evaluate(s => { document.querySelector(s).value = ''; }, selector);
      await page.type(selector, cmd.text, { delay: cmd.delay || 0 });
      if (cmd.pressEnter) await page.keyboard.press('Enter');
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', typed: cmd.text, selector };
    }

    case 'press': {
      await page.keyboard.press(cmd.key);
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', pressed: cmd.key };
    }

    case 'scroll': {
      if (cmd.selector) {
        await page.evaluate((s, d) => { const el = document.querySelector(s); el.scrollBy({ top: d, behavior: 'smooth' }); }, cmd.selector, cmd.delta || 300);
      } else {
        await page.evaluate(d => window.scrollBy(0, d), cmd.delta || 300);
      }
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', scrolled: cmd.delta || 300 };
    }

    case 'screenshot': {
      const outputPath = cmd.output || `/home/ubuntu/browser-agent/screenshots/screenshot-${Date.now()}.png`;
      const opts = { path: outputPath, fullPage: cmd.fullPage || false, type: cmd.type || 'png' };
      if (cmd.selector) {
        const el = await page.$(cmd.selector);
        if (el) { await el.screenshot(opts); }
        else { await page.screenshot(opts); }
      } else {
        await page.screenshot(opts);
      }
      return { status: 'ok', file: outputPath };
    }

    case 'evaluate': {
      const result = await page.evaluate(cmd.script);
      return { status: 'ok', result };
    }

    case 'html': {
      const html = await page.content();
      return { status: 'ok', html: html.substring(0, Number(cmd.maxLength) || 500000) };
    }

    case 'text': {
      let text;
      if (cmd.selector) {
        text = await page.$$eval(cmd.selector, els => els.map(e => e.innerText).join('\n'));
      } else {
        text = await page.evaluate(() => document.body?.innerText || '');
      }
      return { status: 'ok', text: text.substring(0, Number(cmd.maxLength) || 100000) };
    }

    case 'url': {
      return { status: 'ok', url: page.url(), title: await page.title() };
    }

    case 'waitFor': {
      if (cmd.selector) {
        await page.waitForSelector(cmd.selector, { timeout: cmd.timeout || 10000 });
      } else if (cmd.navigation) {
        await page.waitForNavigation({ timeout: cmd.timeout || 10000 });
      } else if (cmd.networkIdle) {
        await page.waitForNetworkIdle({ timeout: cmd.timeout || 10000 });
      }
      return { status: 'ok' };
    }

    case 'goBack': {
      await page.goBack({ timeout: cmd.timeout || 10000 });
      return { status: 'ok', url: page.url() };
    }

    case 'goForward': {
      await page.goForward({ timeout: cmd.timeout || 10000 });
      return { status: 'ok', url: page.url() };
    }

    case 'reload': {
      await page.reload({ timeout: cmd.timeout || 10000 });
      return { status: 'ok', url: page.url() };
    }

    case 'cookies': {
      if (cmd.get) {
        const cookies = await page.cookies(cmd.get === true ? undefined : cmd.get);
        return { status: 'ok', cookies };
      }
      if (cmd.set) {
        await page.setCookie(cmd.set);
        return { status: 'ok', set: true };
      }
      if (cmd.delete) {
        const names = Array.isArray(cmd.delete) ? cmd.delete : [cmd.delete];
        await page.deleteCookie(...names.map(n => ({ name: n })));
        return { status: 'ok', deleted: names };
      }
      const cookies = await page.cookies();
      return { status: 'ok', cookies };
    }

    case 'localStorage': {
      const result = await page.evaluate((action, key, value) => {
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
      const result = await page.evaluate((action, key, value) => {
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
      const reqs = networkRequests.filter(r => r.timestamp >= since);
      const ress = networkResponses.filter(r => r.timestamp >= since);
      return { status: 'ok', requests: reqs, responses: ress, count: { requests: reqs.length, responses: ress.length } };
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
      await page.hover(cmd.selector);
      if (cmd.waitAfter) await new Promise(r => setTimeout(r, cmd.waitAfter));
      return { status: 'ok', hovered: cmd.selector };
    }

    case 'select': {
      await page.select(cmd.selector, ...cmd.values);
      return { status: 'ok', selected: cmd.values };
    }

    case 'upload': {
      const input = await page.$(cmd.selector);
      await input.uploadFile(...cmd.paths);
      return { status: 'ok', uploaded: cmd.paths };
    }

    case 'viewport': {
      await page.setViewport({ width: cmd.width, height: cmd.height });
      return { status: 'ok', width: cmd.width, height: cmd.height };
    }

    case 'intercept': {
      await page.setRequestInterception(true);
      const patterns = cmd.blockPatterns || [];
      const existingHandler = page._interceptHandler;
      if (existingHandler) page.off('request', existingHandler);

      const handler = req => {
        const url = req.url();
        const blocked = patterns.some(p => url.match(new RegExp(p)));
        if (blocked) { req.abort(); return; }
        req.continue();
      };
      page._interceptHandler = handler;
      page.on('request', handler);
      return { status: 'ok', intercepting: true, blockPatterns: patterns };
    }

    case 'stopIntercept': {
      await page.setRequestInterception(false);
      return { status: 'ok', intercepting: false };
    }

    case 'emulate': {
      if (cmd.device) {
        const devices = puppeteer.devices;
        const device = devices[cmd.device];
        if (device) { await page.emulate(device); return { status: 'ok', emulated: cmd.device }; }
      }
      if (cmd.userAgent) {
        await page.setUserAgent(cmd.userAgent);
      }
      return { status: 'ok' };
    }

    case 'close': {
      if (browser) { await browser.close(); browser = null; page = null; connected = false; }
      consoleLogs.length = 0; networkRequests.length = 0; networkResponses.length = 0; jsErrors.length = 0;
      return { status: 'ok', closed: true };
    }

    case 'status': {
      return {
        status: 'ok',
        connected,
        url: page ? page.url() : null,
        title: page ? await page.title().catch(() => null) : null,
        consoleLogCount: consoleLogs.length,
        networkRequestCount: networkRequests.length,
        networkResponseCount: networkResponses.length,
        jsErrorCount: jsErrors.length,
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