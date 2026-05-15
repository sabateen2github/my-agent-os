#!/usr/bin/env python3
"""Browser Telemetry Skill: Executes Playwright actions and returns telemetry data.

Usage:
    python run.py '{"action": "navigate", "url": "https://example.com"}'
    python run.py '{"action": "click", "selector": "#btn"}'
    python run.py '{"action": "type", "selector": "#input", "text": "hello"}'

Stealth mode (enabled by default):
    Anti-detection measures to bypass Google OAuth, Cloudflare, and bot walls:
    - Disables AutomationControlled blink feature
    - Removes "HeadlessChrome" from User-Agent
    - Overrides navigator.webdriver to false
    - Fakes navigator.plugins fingerprint

    Disable with: {"action": "navigate", "url": "...", "stealth": false}

Outputs JSON to stdout with keys: screenshot, dom, network, console, url, title, errors.
Saves screenshot to /tmp/ui-state.png.
"""

import json
import sys
import os
import traceback
from pathlib import Path

SCREENSHOT_PATH = "/tmp/ui-state.png"

# Stealth: non-headless-looking User-Agent
STEALTH_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/147.0.0.0 Safari/537.36"
)

# Stealth: anti-detection JS injected before every page load
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

// Hide Chrome automation extension
Object.defineProperty(document, 'hidden', { get: () => false });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible' });
"""


def launch_browser(stealth=True):
    """Launch a headless Chromium browser via Playwright.
    
    Args:
        stealth: Enable anti-detection measures (default True).
                 Disable for trusted localhost environments.
    """
    from playwright.sync_api import sync_playwright

    playwright = sync_playwright().start()

    chrome_args = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
    ]

    if stealth:
        chrome_args.extend([
            "--disable-blink-features=AutomationControlled",
            "--disable-features=IsolateOrigins,site-per-process",
        ])

    browser = playwright.chromium.launch(
        headless=True,
        args=chrome_args,
    )

    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        ignore_https_errors=True,
        user_agent=STEALTH_USER_AGENT if stealth else None,
    )

    if stealth:
        context.add_init_script(STEALTH_INIT_SCRIPT)

    page = context.new_page()

    # Collect network requests
    network_requests = []
    network_responses = []

    def on_request(request):
        network_requests.append({
            "method": request.method,
            "url": request.url,
            "headers": dict(request.headers),
            "postData": request.post_data,
        })

    def on_response(response):
        network_responses.append({
            "url": response.url,
            "status": response.status,
            "headers": dict(response.headers),
        })

    page.on("request", on_request)
    page.on("response", on_response)

    # Collect console logs
    console_logs = []
    page.on("console", lambda msg: console_logs.append({
        "type": msg.type,
        "text": msg.text,
    }))

    # Collect page errors
    page_errors = []
    page.on("pageerror", lambda err: page_errors.append(str(err)))

    return playwright, browser, context, page, network_requests, network_responses, console_logs, page_errors


def execute_action(page, action):
    """Execute a single Playwright action on the page."""
    action_type = action.get("action", "")

    if action_type == "navigate":
        page.goto(
            action["url"],
            wait_until=action.get("waitUntil", "networkidle"),
            timeout=action.get("timeout", 30000),
        )

    elif action_type == "click":
        selector = action["selector"]
        wait_for = action.get("waitFor")
        if wait_for:
            page.wait_for_selector(selector, timeout=wait_for)
        page.click(
            selector,
            click_count=action.get("clickCount", 1),
            delay=action.get("delay", 0),
        )
        page.wait_for_timeout(action.get("waitAfter", 500))

    elif action_type == "type":
        selector = action["selector"]
        wait_for = action.get("waitFor")
        if wait_for:
            page.wait_for_selector(selector, timeout=wait_for)
        if action.get("clear", True):
            page.fill(selector, "")
        page.type(selector, action["text"], delay=action.get("delay", 0))
        if action.get("pressEnter"):
            page.press(selector, "Enter")
        page.wait_for_timeout(action.get("waitAfter", 500))

    elif action_type == "scroll":
        if action.get("selector"):
            page.locator(action["selector"]).evaluate(
                "el => el.scrollBy(0, arguments[0])", action.get("delta", 300)
            )
        else:
            page.evaluate(
                "window.scrollBy(0, arguments[0])", action.get("delta", 300)
            )
        page.wait_for_timeout(action.get("waitAfter", 300))

    elif action_type == "press":
        page.keyboard.press(action["key"])
        page.wait_for_timeout(action.get("waitAfter", 200))

    elif action_type == "hover":
        page.hover(action["selector"])
        page.wait_for_timeout(action.get("waitAfter", 300))

    elif action_type == "select":
        page.select_option(action["selector"], action["values"])

    elif action_type == "wait":
        if action.get("selector"):
            page.wait_for_selector(
                action["selector"],
                timeout=action.get("timeout", 10000),
            )
        if action.get("networkIdle"):
            page.wait_for_load_state("networkidle")
        page.wait_for_timeout(action.get("waitAfter", 0))

    elif action_type == "evaluate":
        result = page.evaluate(action["script"])
        return result

    elif action_type == "screenshot":
        page.screenshot(
            path=action.get("output", SCREENSHOT_PATH),
            full_page=action.get("fullPage", False),
        )

    else:
        raise ValueError(f"Unknown action type: {action_type}")


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action provided. Usage: run.py '<json>'"}))
        sys.exit(1)

    try:
        action = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    stealth = action.get("stealth", True)  # enabled by default

    try:
        (
            playwright,
            browser,
            context,
            page,
            network_requests,
            network_responses,
            console_logs,
            page_errors,
        ) = launch_browser(stealth=stealth)
    except Exception as e:
        print(json.dumps({
            "error": f"Failed to launch browser: {e}\n{traceback.format_exc()}"
        }))
        sys.exit(1)

    try:
        result = execute_action(page, action)

        # Take screenshot unless action already was a screenshot
        if action.get("action") != "screenshot":
            page.screenshot(path=SCREENSHOT_PATH, full_page=False)

        # Get DOM
        dom = page.content()

        # Get current URL and title
        url = page.url
        title = page.title()

        output = {
            "screenshot": SCREENSHOT_PATH if os.path.exists(SCREENSHOT_PATH) else None,
            "dom": dom[:100000],  # truncate very large DOMs
            "network": {
                "requests": network_requests[-100:],
                "responses": network_responses[-100:],
            },
            "console": console_logs[-500:],
            "url": url,
            "title": title,
            "errors": page_errors,
        }

        if result is not None:
            output["result"] = result

        print(json.dumps(output, default=str))

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc(),
            "url": page.url if page else None,
        }))
        sys.exit(1)

    finally:
        try:
            browser.close()
            playwright.stop()
        except Exception:
            pass


if __name__ == "__main__":
    main()
