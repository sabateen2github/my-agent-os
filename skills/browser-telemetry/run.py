#!/usr/bin/env python3
"""Browser Telemetry Skill: proxies actions to the persistent browser-agent server.

Usage:
    python run.py '{"action": "navigate", "url": "https://example.com"}'
    python run.py '{"action": "click", "selector": "#btn"}'
    python run.py '{"action": "type", "selector": "#input", "text": "hello"}'

Requires the browser-agent systemd service to be running on 127.0.0.1:9222.
Stealth anti-detection is handled by the persistent server (always enabled).

Outputs JSON to stdout with keys: screenshot, dom, network, console, url, title, errors.
Saves screenshot to /tmp/ui-state.png.
"""

import json
import sys
import os
import urllib.request
import urllib.error

SCREENSHOT_PATH = "/tmp/ui-state.png"
AGENT_URL = "http://127.0.0.1:9222"

# ── Action name mapping (browser-telemetry → browser-agent) ───────────
ACTION_MAP = {
    "wait": "waitFor",
}


def proxy(action):
    """POST an action to the persistent browser-agent server, return parsed JSON."""
    body = json.dumps(action).encode("utf-8")
    req = urllib.request.Request(
        AGENT_URL,
        data=body,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read())


def run(action):
    """Execute a browser-telemetry action via the persistent browser-agent server.
    Collects the same telemetry output (screenshot, DOM, network, console)."""

    action_type = action.get("action", "")

    # Remap action names where they differ
    if action_type in ACTION_MAP:
        action["action"] = ACTION_MAP[action_type]

    # Execute the action
    result = proxy(action)

    # Collect telemetry
    url_info = proxy({"action": "url"})
    dom_info = proxy({"action": "html"})
    network_info = proxy({"action": "networkLogs"})
    console_info = proxy({"action": "consoleLogs"})

    # Screenshot
    proxy({"action": "screenshot", "output": SCREENSHOT_PATH})

    output = {
        "screenshot": SCREENSHOT_PATH if os.path.exists(SCREENSHOT_PATH) else None,
        "dom": dom_info.get("html", "")[:100000],
        "network": {
            "requests": network_info.get("requests", [])[-100:],
            "responses": network_info.get("responses", [])[-100:],
        },
        "console": [
            {"type": c.get("type"), "text": c.get("text")}
            for c in console_info.get("console", [])[-500:]
        ],
        "url": url_info.get("url"),
        "title": url_info.get("title"),
        "errors": [
            e.get("message", str(e))
            for e in console_info.get("errors", [])
        ],
    }

    if result.get("status") == "ok":
        output["result"] = result

    print(json.dumps(output, default=str))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No action provided. Usage: run.py '<json>'"}))
        sys.exit(1)

    try:
        action = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    # Verify the persistent server is reachable
    try:
        status = proxy({"action": "status"})
        if status.get("status") != "ok":
            raise ConnectionError("browser-agent server returned non-ok status")
    except Exception as e:
        print(json.dumps({
            "error": (
                f"Browser-agent server not reachable at {AGENT_URL}. "
                f"Start it with: systemctl --user start browser-agent.service"
            ),
            "detail": str(e),
        }))
        sys.exit(1)

    try:
        run(action)
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "detail": getattr(e, "read", lambda: b"")()[:500].decode("utf-8", errors="replace"),
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
