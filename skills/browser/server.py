#!/usr/bin/env python3
"""
Persistent Playwright browser server — HTTP API on port 9222.

Replaces the Puppeteer browser-agent/server.js with Playwright for:
- Cross-platform support (no snap Chromium dependency)
- Better stealth (Playwright-maintained anti-detection)
- Same Python ecosystem as browser-telemetry/run.py
- Session persistence via launch_persistent_context(user_data_dir=...)

Usage:
    python3 server.py
    BROWSER_AGENT_PORT=9223 python3 server.py

API contract: Same JSON request/response format as the Puppeteer server.
All browser_* tools in tools/browser.ts continue to work unchanged.
"""

import json
import os
import re
import sys
import time
import signal
import threading
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# ── Configuration ────────────────────────────────────────────────────

PORT = int(os.environ.get("BROWSER_AGENT_PORT", "9222"))
USER_DATA_DIR = os.path.expanduser("~/browser-agent/user-data")
SCREENSHOT_DIR = os.path.expanduser("~/browser-agent/screenshots")

# Create directories
Path(USER_DATA_DIR).mkdir(parents=True, exist_ok=True)
Path(SCREENSHOT_DIR).mkdir(parents=True, exist_ok=True)

# Log eviction
LOG_MAX_AGE_MS = 60 * 60 * 1000  # 1 hour
LOG_CLEANUP_INTERVAL_S = 10 * 60  # 10 min

# Page management
PAGE_RECYCLE_INTERVAL_S = 30 * 60  # 30 min
STALE_TAB_AGE_S = 18 * 60 * 60  # 18 hours
TAB_CLEANUP_INTERVAL_S = 30 * 60  # 30 min
MAX_TABS = 20

# Memory
MEMORY_WARN_MB = 500
MEMORY_KILL_MB = 800
MEMORY_CHECK_INTERVAL_S = 5 * 60  # 5 min

# Stealth
STEALTH_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/147.0.0.0 Safari/537.36"
)

STEALTH_INIT_SCRIPT = """
// Override navigator.webdriver (Google OAuth detection)
Object.defineProperty(navigator, 'webdriver', { get: () => false });

// Fake plugins array (fingerprinting)
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5]
});

// Fake languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
});

// Override permissions query to avoid headless detection
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
);
"""

# ── Global state ─────────────────────────────────────────────────────

playwright_api = None  # sync_playwright instance
browser_context = None  # Persistent BrowserContext
console_logs = []  # { type, text, timestamp }
network_requests_list = []  # { id, method, url, resourceType, headers, postData, timestamp }
network_responses_list = []  # { id, url, status, statusText, headers, fromCache, timestamp }
js_errors = []  # { message, timestamp }
managed_pages = {}  # page object → { "id", "created_at", "last_used" }
active_page = None  # Currently active page
_next_tab_id = 0  # Monotonically increasing tab ID counter
connected = False

# Thread safety
page_lock = threading.Lock()
shutting_down = False
recycle_requested = False
last_page_recycle = 0.0

# Track route handlers for intercept/stopIntercept
_intercept_handler_ref = None
_intercept_page_ref = None

# ── Helpers ──────────────────────────────────────────────────────────


def get_rss_mb():
    """Return resident memory in MB by reading /proc/self/status."""
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    # "VmRSS:   123456 kB"
                    parts = line.split()
                    if len(parts) >= 2:
                        return int(parts[1]) // 1024
    except Exception:
        pass
    return 0


def log(msg):
    """Log to stderr with timestamp."""
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print(f"[browser-server] [{ts}] {msg}", file=sys.stderr, flush=True)


def touch_page(page):
    """Update last_used timestamp for a page."""
    meta = managed_pages.get(page)
    if meta:
        meta["last_used"] = time.time()


def track_page(page):
    """Register a new page in managed_pages and set it as active."""
    global active_page, _next_tab_id
    _next_tab_id += 1
    managed_pages[page] = {
        "id": _next_tab_id,
        "created_at": time.time(),
        "last_used": time.time(),
    }
    active_page = page


def untrack_page(page):
    """Remove a page from managed_pages. If it was active, pick the next."""
    global active_page
    managed_pages.pop(page, None)
    if active_page is page:
        newest = None
        newest_time = 0
        for pg, meta in managed_pages.items():
            if meta["last_used"] > newest_time:
                newest = pg
                newest_time = meta["last_used"]
        active_page = newest


# ── Captcha auto-bypass ────────────────────────────────────────────────

CAPTCHA_INDICATORS = [
    "verify you are human",
    "verify you're human",
    "unusual traffic",
    "are you a robot",
    "prove you are human",
    "captcha",
    "one more step",
    "please verify",
]


def _auto_dismiss_captcha(page):
    """Try to auto-dismiss common captcha challenges (Bing checkbox, Cloudflare, etc).
    Runs after every navigation — fast no-op if no captcha is present."""
    try:
        body_text = page.evaluate("() => document.body?.innerText?.toLowerCase() || ''")
        has_captcha = any(indicator in body_text for indicator in CAPTCHA_INDICATORS)
        if not has_captcha:
            return

        log("Captcha detected — attempting auto-bypass")

        # Strategy 1: Click the reCAPTCHA iframe checkbox
        recaptcha_frame = page.locator(
            'iframe[title*="reCAPTCHA"], iframe[src*="recaptcha"], iframe[src*="captcha"]'
        ).first
        if recaptcha_frame.count() > 0:
            try:
                box = recaptcha_frame.bounding_box()
                if box:
                    # Click center of the iframe (typical 28x28px checkbox area)
                    page.mouse.click(box["x"] + 28, box["y"] + 28)
                    page.wait_for_timeout(3000)
                    log("  → Clicked reCAPTCHA iframe checkbox")
            except Exception:
                pass

        # Strategy 2: Click any checkbox near "verify you are human" text
        try:
            checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]')
            for i in range(checkboxes.count()):
                cb = checkboxes.nth(i)
                if cb.is_visible():
                    cb.click(timeout=2000)
                    page.wait_for_timeout(2000)
                    log("  → Clicked captcha checkbox")
                    break
        except Exception:
            pass

        # Strategy 3: Press Enter (some captchas submit on Enter)
        try:
            page.keyboard.press("Enter")
            page.wait_for_timeout(1500)
        except Exception:
            pass

    except Exception as e:
        log(f"Captcha bypass attempt failed (non-fatal): {e}")


# ── Log eviction thread ──────────────────────────────────────────────


def evict_old_logs():
    """Drop log entries older than LOG_MAX_AGE_MS."""
    cutoff = time.time() - (LOG_MAX_AGE_MS / 1000)
    for arr in (console_logs, network_requests_list, network_responses_list, js_errors):
        while arr and arr[0].get("timestamp", 0) < cutoff * 1000:
            arr.pop(0)


def log_cleanup_loop():
    """Periodically evict old logs."""
    while not shutting_down:
        time.sleep(LOG_CLEANUP_INTERVAL_S)
        if shutting_down:
            break
        try:
            evict_old_logs()
        except Exception as e:
            log(f"Log cleanup error: {e}")


# ── Tab cleanup thread ───────────────────────────────────────────────


def cleanup_stale_tabs():
    """Close pages idle for > STALE_TAB_AGE_S and enforce MAX_TABS cap.
    Must be called from the main Playwright thread (request handler)."""
    global active_page
    if not browser_context:
        return

    cutoff = time.time() - STALE_TAB_AGE_S
    to_close = []
    for pg, meta in list(managed_pages.items()):
        if meta["last_used"] < cutoff:
            to_close.append(pg)

    # Keep at least 1 page alive
    if len(to_close) >= len(managed_pages) and to_close:
        to_close.pop()

    for pg in to_close:
        try:
            meta = managed_pages.get(pg)
            log(
                f"Closing stale tab #{meta['id'] if meta else '?'} (idle since {time.ctime(meta['last_used']) if meta else '?'})"
            )
            pg.close()
            untrack_page(pg)
        except Exception:
            pass

    # Enforce MAX_TABS
    while len(managed_pages) > MAX_TABS:
        oldest = None
        oldest_time = float("inf")
        for pg, meta in managed_pages.items():
            if meta["created_at"] < oldest_time:
                oldest = pg
                oldest_time = meta["created_at"]
        if oldest and oldest is not active_page:
            try:
                oldest.close()
            except Exception:
                pass
            untrack_page(oldest)
        elif len(managed_pages) > 1:
            sorted_pages = sorted(
                managed_pages.items(), key=lambda x: x[1]["created_at"]
            )
            for pg, _ in sorted_pages:
                if pg is not active_page:
                    try:
                        pg.close()
                    except Exception:
                        pass
                    untrack_page(pg)
                    break
        else:
            break


_last_tab_cleanup = time.time()


def maybe_cleanup_tabs():
    """Run tab cleanup if enough time has passed. Called from request handler thread."""
    global _last_tab_cleanup
    if time.time() - _last_tab_cleanup > TAB_CLEANUP_INTERVAL_S:
        cleanup_stale_tabs()
        _last_tab_cleanup = time.time()


# ── Memory watchdog thread ───────────────────────────────────────────


def memory_watchdog_loop():
    """Monitor RSS and trigger recycle if threshold exceeded."""
    global recycle_requested
    while not shutting_down:
        time.sleep(MEMORY_CHECK_INTERVAL_S)
        if shutting_down:
            break
        try:
            rss = get_rss_mb()
            if rss > MEMORY_WARN_MB:
                log(f"WARNING: Memory {rss}MB > {MEMORY_WARN_MB}MB threshold")
            if rss > MEMORY_KILL_MB:
                log(
                    f"CRITICAL: Memory {rss}MB > {MEMORY_KILL_MB}MB — triggering recycle"
                )
                recycle_requested = True
        except Exception as e:
            log(f"Memory watchdog error: {e}")


# ── Page / Browser lifecycle ─────────────────────────────────────────


def setup_page(page):
    """Apply stealth, listeners, and viewport to a new page."""
    # Stealth: user agent (context-level, but set per-page for safety)
    # Note: evaluateOnNewDocument is handled by context.add_init_script()
    page.set_viewport_size({"width": 1280, "height": 800})

    # Network logging
    def on_request(request):
        try:
            post_data = request.post_data
        except Exception:
            post_data = None  # gzipped or binary body
        network_requests_list.append(
            {
                "id": id(request),
                "method": request.method,
                "url": request.url,
                "resourceType": request.resource_type,
                "headers": dict(request.headers),
                "postData": post_data,
                "timestamp": int(time.time() * 1000),
            }
        )
        if len(network_requests_list) > 5000:
            del network_requests_list[:1000]

    def on_response(response):
        network_responses_list.append(
            {
                "id": id(response.request),
                "url": response.url,
                "status": response.status,
                "statusText": response.status_text,
                "headers": dict(response.headers),
                "fromCache": response.from_service_worker
                if hasattr(response, "from_service_worker")
                else False,
                "timestamp": int(time.time() * 1000),
            }
        )
        if len(network_responses_list) > 5000:
            del network_responses_list[:1000]

    def on_console(msg):
        console_logs.append(
            {
                "type": msg.type,
                "text": msg.text,
                "timestamp": int(time.time() * 1000),
            }
        )
        if len(console_logs) > 5000:
            del console_logs[:1000]

    def on_pageerror(err):
        js_errors.append(
            {
                "message": str(err) if not hasattr(err, "message") else err.message,
                "timestamp": int(time.time() * 1000),
            }
        )
        if len(js_errors) > 1000:
            del js_errors[:200]

    page.on("request", on_request)
    page.on("response", on_response)
    page.on("console", on_console)
    page.on("pageerror", on_pageerror)


def recycle_page():
    """Soft recycle: close and reopen the active page (browser + session survive)."""
    global active_page, last_page_recycle
    if not active_page or not browser_context:
        return
    try:
        old_page = active_page
        current_url = old_page.url
        untrack_page(old_page)
        try:
            old_page.close()
        except Exception:
            pass

        new_page = browser_context.new_page()
        setup_page(new_page)
        track_page(new_page)

        if current_url and current_url != "about:blank":
            try:
                new_page.goto(current_url, wait_until="domcontentloaded", timeout=15000)
            except Exception:
                pass
        log(f"Page recycled (was at {current_url}), {len(managed_pages)} tabs active")
        last_page_recycle = time.time()
    except Exception as e:
        log(f"Page recycle failed: {e}")


def hard_recycle():
    """Hard recycle: close the entire browser context and re-launch (session survives via user_data_dir)."""
    global browser_context, active_page, connected, recycle_requested, _next_tab_id
    log(f"Hard recycling browser ({len(managed_pages)} tabs)...")
    try:
        for pg in list(managed_pages.keys()):
            try:
                pg.close()
            except Exception:
                pass
        managed_pages.clear()
        active_page = None
        if browser_context:
            try:
                # Close the persistent context's browser
                browser_context.close()
            except Exception:
                pass
    except Exception:
        pass

    browser_context = None
    connected = False
    recycle_requested = False
    _next_tab_id = 0
    ensure_browser()
    log("Hard recycle complete")


def ensure_browser():
    """Ensure the browser is running and the active page is usable."""
    global browser_context, active_page, connected, last_page_recycle, playwright_api

    # Run periodic tab cleanup (needs to be in main Playwright thread)
    maybe_cleanup_tabs()

    # Handle hard recycle request from memory watchdog
    if recycle_requested:
        hard_recycle()
        return

    # Periodic soft page recycle
    if (
        active_page
        and browser_context
        and (time.time() - last_page_recycle > PAGE_RECYCLE_INTERVAL_S)
    ):
        recycle_page()
        last_page_recycle = time.time()

    # Verify existing browser is still alive
    if browser_context:
        try:
            # Check if browser is still connected
            browser = browser_context.browser
            if not browser or not browser.is_connected():
                browser_context = None
                connected = False
        except Exception:
            browser_context = None
            connected = False

    if browser_context and connected:
        # Verify active page is still alive
        if active_page:
            try:
                active_page.evaluate("() => 1")
                touch_page(active_page)
                return
            except Exception:
                pass

        # Active page died — pick another tracked page
        for pg in list(managed_pages.keys()):
            try:
                pg.evaluate("() => 1")
                active_page = pg
                touch_page(active_page)
                return
            except Exception:
                untrack_page(pg)

        # All pages dead — create new one
        try:
            active_page = browser_context.new_page()
            setup_page(active_page)
            track_page(active_page)
            last_page_recycle = time.time()
            return
        except Exception:
            pass

        # Fall through to relaunch
        browser_context = None
        connected = False

    # ── Fresh browser launch ─────────────────────────────────────────
    if playwright_api is None:
        from playwright.sync_api import sync_playwright

        playwright_api = sync_playwright().start()

    chrome_args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
    ]

    browser_context = playwright_api.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        args=chrome_args,
        viewport={"width": 1280, "height": 800},
        user_agent=STEALTH_USER_AGENT,
        ignore_https_errors=True,
        bypass_csp=True,
    )

    # Stealth init script (runs before every new page load)
    browser_context.add_init_script(STEALTH_INIT_SCRIPT)

    connected = True
    managed_pages.clear()
    _next_tab_id = 0

    # Track popup/new-page creation (Google OAuth, target="_blank", window.open)
    def on_page(new_page):
        if new_page in managed_pages:
            return
        setup_page(new_page)
        track_page(new_page)
        log(
            f"Popup/page tracked (#{managed_pages[new_page]['id']}), total: {len(managed_pages)}"
        )

    browser_context.on("page", on_page)

    # Create initial page
    active_page = browser_context.new_page()
    setup_page(active_page)
    track_page(active_page)
    last_page_recycle = time.time()
    log(f"Browser launched, page #{managed_pages[active_page]['id']} ready")


# ── Command handler ──────────────────────────────────────────────────


def handle_command(cmd):
    """Process a single command. Must be called with page_lock held."""
    global active_page, browser_context, connected, last_page_recycle
    global _intercept_handler_ref, _intercept_page_ref

    action = cmd.get("action", "")

    # ── Actions that do NOT trigger a browser restart ──
    if action == "status":
        waf_blocked = False
        waf_message = None
        page = active_page
        if page:
            try:
                result = page.evaluate("""() => {
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
                }""")
                if result and result.get("blocked"):
                    waf_blocked = True
                    waf_message = result.get("reason")
            except Exception:
                pass

        current_url = None
        current_title = None
        if page:
            try:
                current_url = page.url
                current_title = page.title()
            except Exception:
                pass

        return {
            "status": "ok",
            "connected": connected,
            "url": current_url,
            "title": current_title,
            "tabCount": len(managed_pages),
            "consoleLogCount": len(console_logs),
            "networkRequestCount": len(network_requests_list),
            "networkResponseCount": len(network_responses_list),
            "jsErrorCount": len(js_errors),
            "wafBlocked": waf_blocked,
            "wafMessage": waf_message,
        }

    if action == "listTabs":
        tabs = []
        for pg, meta in list(managed_pages.items()):
            try:
                tabs.append(
                    {
                        "id": meta["id"],
                        "url": pg.url,
                        "title": pg.title(),
                        "active": pg is active_page,
                        "createdAt": meta["created_at"],
                        "lastUsed": meta["last_used"],
                    }
                )
            except Exception:
                pass
        return {
            "status": "ok",
            "tabs": tabs,
            "tabCount": len(tabs),
            "activeTabId": managed_pages.get(active_page, {}).get("id")
            if active_page
            else None,
        }

    if action == "close":
        try:
            for pg in list(managed_pages.keys()):
                try:
                    pg.close()
                except Exception:
                    pass
            managed_pages.clear()
            active_page = None
            if browser_context:
                browser_context.close()
        except Exception:
            pass
        browser_context = None
        connected = False
        _next_tab_id = 0
        console_logs.clear()
        network_requests_list.clear()
        network_responses_list.clear()
        js_errors.clear()
        _intercept_handler_ref = None
        _intercept_page_ref = None
        return {"status": "ok", "closed": True}

    # ── All other actions need a browser ──
    ensure_browser()
    page = active_page
    if not page:
        return {"status": "error", "message": "No active page"}

    try:
        # ── navigate ──
        if action == "navigate":
            # "domcontentloaded" fires as soon as HTML is parsed — never hangs
            # on tracking pixels OR heavy JS. For SPAs that need full render,
            # pass waitUntil: "networkidle" explicitly.
            wait_strategy = cmd.get("waitUntil") or "domcontentloaded"
            timeout = cmd.get("timeout", 30000)
            page.goto(
                cmd["url"],
                wait_until=wait_strategy,
                timeout=timeout,
            )
            # Auto-dismiss common captcha obstacles after navigation
            _auto_dismiss_captcha(page)
            touch_page(page)
            return {"status": "ok", "title": page.title(), "url": page.url}

        # ── click ──
        elif action == "click":
            selector = cmd["selector"]
            if cmd.get("waitFor"):
                page.wait_for_selector(selector, timeout=cmd["waitFor"])
            page.click(
                selector,
                click_count=cmd.get("clickCount", 1),
                delay=cmd.get("delay", 0),
            )
            touch_page(page)
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {"status": "ok", "clicked": selector}

        # ── clickAt ──
        elif action == "clickAt":
            x = int(cmd["x"])
            y = int(cmd["y"])
            click_count = cmd.get("clickCount", 1)
            page.mouse.click(x, y, click_count=click_count)
            touch_page(page)
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {
                "status": "ok",
                "clickedAt": {"x": x, "y": y},
                "clickCount": click_count,
            }

        # ── clickFrame ──
        elif action == "clickFrame":
            iframe_selector = cmd["selector"]
            x = int(cmd.get("x", 0))
            y = int(cmd.get("y", 0))
            inner_selector = cmd.get("innerSelector", "body")
            wait_after = cmd.get("waitAfter", 500)

            # Use Playwright's frame_locator for cross-origin iframe targeting
            frame = page.frame_locator(iframe_selector)
            # Check if the iframe is accessible
            frame_count = len(page.frames)
            # Try to locate and click inside the iframe
            frame.locator(inner_selector).click(position={"x": x, "y": y})
            touch_page(page)
            if wait_after:
                page.wait_for_timeout(wait_after)
            return {
                "status": "ok",
                "clickedFrame": iframe_selector,
                "at": {"x": x, "y": y},
            }

        # ── type ──
        elif action == "type":
            selector = cmd["selector"]
            if cmd.get("waitFor"):
                page.wait_for_selector(selector, timeout=cmd["waitFor"])
            if cmd.get("clear", True):
                page.fill(selector, "")
            page.type(selector, cmd["text"], delay=cmd.get("delay", 0))
            touch_page(page)
            if cmd.get("pressEnter"):
                page.keyboard.press("Enter")
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {"status": "ok", "typed": cmd["text"], "selector": selector}

        # ── press ──
        elif action == "press":
            page.keyboard.press(cmd["key"])
            touch_page(page)
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {"status": "ok", "pressed": cmd["key"]}

        # ── scroll ──
        elif action == "scroll":
            delta = cmd.get("delta", 300)
            if cmd.get("selector"):
                page.evaluate(
                    "(selector, delta) => { const el = document.querySelector(selector); if (el) el.scrollBy({ top: delta, behavior: 'smooth' }); }",
                    [cmd["selector"], delta],
                )
            else:
                page.evaluate("delta => window.scrollBy(0, delta)", delta)
            touch_page(page)
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {"status": "ok", "scrolled": delta}

        # ── screenshot ──
        elif action == "screenshot":
            output_path = cmd.get("output") or os.path.join(
                SCREENSHOT_DIR, f"screenshot-{int(time.time() * 1000)}.png"
            )
            opts = {"path": output_path, "full_page": cmd.get("fullPage", False)}
            if cmd.get("selector"):
                try:
                    el = page.locator(cmd["selector"])
                    el.screenshot(**opts)
                except Exception:
                    page.screenshot(**opts)
            else:
                page.screenshot(**opts)
            return {"status": "ok", "file": output_path}

        # ── evaluate ──
        elif action == "evaluate":
            result = page.evaluate(cmd["script"])
            touch_page(page)
            return {"status": "ok", "result": result}

        # ── html ──
        elif action == "html":
            html = page.content()
            max_len = int(cmd.get("maxLength", 500000))
            return {"status": "ok", "html": html[:max_len]}

        # ── text ──
        elif action == "text":
            if cmd.get("selector"):
                elements = page.locator(cmd["selector"]).all()
                text = "\n".join(el.inner_text() for el in elements)
            else:
                text = page.evaluate("() => document.body?.innerText || ''")
            max_len = int(cmd.get("maxLength", 100000))
            return {"status": "ok", "text": text[:max_len]}

        # ── url ──
        elif action == "url":
            return {"status": "ok", "url": page.url, "title": page.title()}

        # ── waitFor ──
        elif action == "waitFor":
            timeout = cmd.get("timeout", 10000)
            if cmd.get("selector"):
                page.wait_for_selector(cmd["selector"], timeout=timeout)
            elif cmd.get("navigation"):
                page.wait_for_load_state("load", timeout=timeout)
            elif cmd.get("networkIdle"):
                page.wait_for_load_state("networkidle", timeout=timeout)
            return {"status": "ok"}

        # ── goBack ──
        elif action == "goBack":
            page.go_back(timeout=cmd.get("timeout", 10000))
            touch_page(page)
            return {"status": "ok", "url": page.url}

        # ── goForward ──
        elif action == "goForward":
            page.go_forward(timeout=cmd.get("timeout", 10000))
            touch_page(page)
            return {"status": "ok", "url": page.url}

        # ── reload ──
        elif action == "reload":
            page.reload(timeout=cmd.get("timeout", 10000))
            touch_page(page)
            return {"status": "ok", "url": page.url}

        # ── cookies ──
        elif action == "cookies":
            if cmd.get("get"):
                url = None if cmd["get"] is True else cmd["get"]
                cookies = browser_context.cookies(url)
                return {"status": "ok", "cookies": cookies}
            if cmd.get("set"):
                cookie = dict(cmd["set"])
                # Playwright requires either 'url' OR 'domain'+'path' pair
                if "url" not in cookie:
                    if "domain" in cookie:
                        # Use current page URL as base, or construct from domain
                        base_url = (
                            page.url
                            if page
                            else f"https://{cookie['domain'].lstrip('.')}"
                        )
                        cookie["url"] = base_url
                    elif page:
                        cookie["url"] = page.url
                    else:
                        cookie["url"] = "https://example.com"
                # Remove domain/path when url is present (Playwright extracts from url)
                if "url" in cookie:
                    cookie.pop("domain", None)
                    cookie.pop("path", None)
                browser_context.add_cookies([cookie])
                return {"status": "ok", "set": True}
            if cmd.get("delete"):
                names = (
                    cmd["delete"]
                    if isinstance(cmd["delete"], list)
                    else [cmd["delete"]]
                )
                for name in names:
                    # Get all cookies with this name and clear them
                    all_cookies = browser_context.cookies()
                    matching = [c for c in all_cookies if c.get("name") == name]
                    if matching:
                        browser_context.clear_cookies(name=name)
                    else:
                        # Try clearing by name directly
                        browser_context.clear_cookies(name=name)
                return {"status": "ok", "deleted": names}
            # Default: return all cookies
            cookies = browser_context.cookies()
            return {"status": "ok", "cookies": cookies}

        # ── localStorage ──
        elif action == "localStorage":
            result = page.evaluate(
                """([action, key, value]) => {
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
                }""",
                [cmd["op"], cmd.get("key"), cmd.get("value")],
            )
            return {"status": "ok", "result": result}

        # ── sessionStorage ──
        elif action == "sessionStorage":
            result = page.evaluate(
                """([action, key, value]) => {
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
                }""",
                [cmd["op"], cmd.get("key"), cmd.get("value")],
            )
            return {"status": "ok", "result": result}

        # ── networkLogs ──
        elif action == "networkLogs":
            since = cmd.get("since", 0)
            reqs = [r for r in network_requests_list if r.get("timestamp", 0) >= since]
            ress = [r for r in network_responses_list if r.get("timestamp", 0) >= since]

            # Apply filters
            f = cmd.get("filter")
            if f:
                if f.get("method"):
                    method = f["method"].upper()
                    reqs = [r for r in reqs if r.get("method") == method]
                if f.get("urlPattern"):
                    pattern = re.compile(f["urlPattern"], re.IGNORECASE)
                    reqs = [r for r in reqs if pattern.search(r.get("url", ""))]
                    ress = [r for r in ress if pattern.search(r.get("url", ""))]
                if f.get("urlContains"):
                    substring = f["urlContains"]
                    reqs = [r for r in reqs if substring in r.get("url", "")]
                    ress = [r for r in ress if substring in r.get("url", "")]
            return {
                "status": "ok",
                "requests": reqs,
                "responses": ress,
                "count": {"requests": len(reqs), "responses": len(ress)},
            }

        # ── consoleLogs ──
        elif action == "consoleLogs":
            since = cmd.get("since", 0)
            logs = [l for l in console_logs if l.get("timestamp", 0) >= since]
            errors = [e for e in js_errors if e.get("timestamp", 0) >= since]
            return {
                "status": "ok",
                "console": logs,
                "errors": errors,
                "count": {"logs": len(logs), "errors": len(errors)},
            }

        # ── clearLogs ──
        elif action == "clearLogs":
            console_logs.clear()
            network_requests_list.clear()
            network_responses_list.clear()
            js_errors.clear()
            return {"status": "ok"}

        # ── hover ──
        elif action == "hover":
            page.hover(cmd["selector"])
            touch_page(page)
            if cmd.get("waitAfter"):
                page.wait_for_timeout(cmd["waitAfter"])
            return {"status": "ok", "hovered": cmd["selector"]}

        # ── select ──
        elif action == "select":
            page.select_option(cmd["selector"], cmd["values"])
            return {"status": "ok", "selected": cmd["values"]}

        # ── viewport ──
        elif action == "viewport":
            page.set_viewport_size({"width": cmd["width"], "height": cmd["height"]})
            return {"status": "ok", "width": cmd["width"], "height": cmd["height"]}

        # ── intercept ──
        elif action == "intercept":
            patterns = cmd.get("blockPatterns", [])

            # Remove old handler if exists
            if _intercept_handler_ref and _intercept_page_ref:
                try:
                    _intercept_page_ref.unroute("**/*", _intercept_handler_ref)
                except Exception:
                    pass

            def route_handler(route):
                url = route.request.url
                blocked = any(re.search(p, url) for p in patterns)
                if blocked:
                    route.abort()
                else:
                    route.continue_()

            page.route("**/*", route_handler)
            _intercept_handler_ref = route_handler
            _intercept_page_ref = page
            return {"status": "ok", "intercepting": True, "blockPatterns": patterns}

        # ── stopIntercept ──
        elif action == "stopIntercept":
            try:
                if _intercept_handler_ref and _intercept_page_ref:
                    _intercept_page_ref.unroute("**/*", _intercept_handler_ref)
            except Exception:
                pass
            _intercept_handler_ref = None
            _intercept_page_ref = None
            return {"status": "ok", "intercepting": False}

        # ── triggerForm ──
        elif action == "triggerForm":
            result = page.evaluate(
                """([sel, opt]) => {
                    const container = document.querySelector(sel);
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
                }""",
                [cmd["selector"], cmd["value"]],
            )
            touch_page(page)
            return {"status": "ok", "result": result}

        # ── switchTab ──
        elif action == "switchTab":
            tab_id = cmd.get("tabId")
            index = cmd.get("index")
            target = None

            if tab_id is not None:
                for pg, meta in managed_pages.items():
                    if meta["id"] == tab_id:
                        target = pg
                        break
            elif index is not None:
                sorted_pages = sorted(managed_pages.items(), key=lambda x: x[1]["id"])
                if 0 <= index < len(sorted_pages):
                    target = sorted_pages[index][0]

            if target is None:
                return {
                    "status": "error",
                    "message": f"Tab not found (tabId={tab_id}, index={index}). Use browser_listTabs to see available tabs.",
                }

            try:
                target.evaluate("() => 1")
            except Exception:
                return {"status": "error", "message": "Tab is no longer alive"}

            active_page = target
            touch_page(active_page)
            meta = managed_pages[target]
            return {
                "status": "ok",
                "switchedTo": {
                    "id": meta["id"],
                    "url": target.url,
                    "title": target.title(),
                },
                "tabCount": len(managed_pages),
            }

        # ── triggerForm ──
        elif action == "triggerForm":
            methods = []

            # Strategy 1: form.requestSubmit (React-compatible)
            try:
                result = page.evaluate(
                    """(btnSelector) => {
                        let btn;
                        if (btnSelector) {
                            btn = document.querySelector(btnSelector);
                        } else {
                            btn = document.querySelector('button[type="submit"]') || 
                                  document.querySelector('button');
                        }
                        if (btn) {
                            const form = btn.closest('form');
                            if (form) {
                                form.requestSubmit(btn);
                                return 'requestSubmit';
                            }
                            btn.click();
                            return 'click';
                        }
                        return null;
                    }""",
                    cmd.get("buttonSelector"),
                )
                if result:
                    methods.append(result)
            except Exception as e:
                methods.append(f"submit error: {e}")

            # Strategy 2: Walk React fiber to find onSubmit
            try:
                page.evaluate("""() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(
                        b => b.textContent.includes('ubmit') || 
                             b.textContent.includes('Create') || 
                             b.type === 'submit'
                    );
                    if (!btn) return;
                    let fiber = btn, d = 0;
                    while (fiber && d < 30) {
                        const k = Object.keys(fiber).find(kk => kk.startsWith('__reactFiber'));
                        if (k) { fiber = fiber[k]; break; }
                        fiber = fiber.parentElement; d++;
                    }
                    if (!fiber || !fiber.return) return;
                    let node = fiber.return, s = 0;
                    while (node && s < 80) {
                        const props = node.memoizedProps || {};
                        if (props.onSubmit) {
                            props.onSubmit({
                                preventDefault: () => {},
                                stopPropagation: () => {},
                                nativeEvent: { submitter: btn }
                            });
                            return;
                        }
                        node = node.return; s++;
                    }
                }""")
                methods.append("fiberOnSubmit")
            except Exception as e:
                methods.append(f"fiber error: {e}")

            touch_page(page)
            return {"status": "ok", "methods": methods}

        # ── telemetry ──
        elif action == "telemetry":
            # Execute an inner action and return aggregated telemetry.
            # Replaces browser-telemetry/run.py — single call gets DOM,
            # network, console, and screenshot alongside the action result.
            inner = cmd.get("inner", {})
            inner_action = inner.get("action", "")
            inner_result = None

            if inner_action:
                # Remap action names from old browser-telemetry conventions
                if inner_action == "wait":
                    inner["action"] = "waitFor"
                inner_result = handle_command(inner)

            # Collect telemetry
            url_info = handle_command({"action": "url"})
            dom_info = handle_command({"action": "html"})
            network_info = handle_command({"action": "networkLogs"})
            console_info = handle_command({"action": "consoleLogs"})
            screenshot_info = handle_command(
                {
                    "action": "screenshot",
                    "output": cmd.get("screenshotOutput", "/tmp/ui-state.png"),
                }
            )

            return {
                "status": "ok",
                "result": inner_result,
                "screenshot": screenshot_info.get("file"),
                "dom": dom_info.get("html", "")[:100000],
                "url": url_info.get("url"),
                "title": url_info.get("title"),
                "network": {
                    "requests": network_info.get("requests", [])[-100:],
                    "responses": network_info.get("responses", [])[-100:],
                },
                "console": console_info.get("console", [])[-500:],
                "errors": console_info.get("errors", []),
            }

        else:
            return {"status": "error", "message": f"Unknown action: {action}"}

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc(),
        }


# ── HTTP server ──────────────────────────────────────────────────────


class BrowserRequestHandler(BaseHTTPRequestHandler):
    """HTTP request handler for the browser server."""

    def log_message(self, format, *args):
        """Suppress default logging to stdout — we log to stderr."""
        pass

    def _json_response(self, data, status=200):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/status":
            with page_lock:
                try:
                    result = handle_command({"action": "status"})
                    self._json_response(result)
                except Exception as e:
                    self._json_response({"status": "error", "message": str(e)}, 500)
        else:
            self._json_response(
                {
                    "service": "browser-server",
                    "version": "3.0.0",
                    "backend": "playwright",
                    "port": PORT,
                }
            )

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        try:
            cmd = json.loads(body)
        except json.JSONDecodeError as e:
            self._json_response(
                {"status": "error", "message": f"Invalid JSON: {e}"}, 400
            )
            return

        with page_lock:
            result = handle_command(cmd)
            self._json_response(result)


# ── Main ─────────────────────────────────────────────────────────────


def main():
    global shutting_down

    log(f"Starting Playwright browser server on port {PORT}")
    log(f"User data dir: {USER_DATA_DIR}")

    # Start background threads (non-Playwright operations only)
    threads = []

    t = threading.Thread(target=log_cleanup_loop, daemon=True, name="log-cleanup")
    t.start()
    threads.append(t)

    t = threading.Thread(
        target=memory_watchdog_loop, daemon=True, name="memory-watchdog"
    )
    t.start()
    threads.append(t)

    # Signal handler for graceful shutdown
    def shutdown(signum, frame):
        global shutting_down
        log(f"Received signal {signum}, shutting down...")
        shutting_down = True
        try:
            with page_lock:
                handle_command({"action": "close"})
        except Exception:
            pass
        if playwright_api:
            try:
                playwright_api.stop()
            except Exception:
                pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    # Start HTTP server (single-threaded — Playwright sync API requires same thread)
    server = HTTPServer(("127.0.0.1", PORT), BrowserRequestHandler)
    log(f"Server listening on 127.0.0.1:{PORT}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        shutting_down = True
        server.shutdown()
        if playwright_api:
            try:
                playwright_api.stop()
            except Exception:
                pass


if __name__ == "__main__":
    main()
