---
name: browser-telemetry
description: Executes a headless Playwright action; returns DOM, Network, and Screenshot.
compatibility: opencode
---
## Execution
Execute: `python3 ~/my-agent-os/skills/browser-telemetry/run.py '{action_json}'`

## Actions
- **navigate:** `{"action": "navigate", "url": "https://..."}`
- **click:** `{"action": "click", "selector": "#btn", "waitFor": 5000}`
- **type:** `{"action": "type", "selector": "#input", "text": "hello", "pressEnter": true}`
- **scroll:** `{"action": "scroll", "delta": 300}`
- **press:** `{"action": "press", "key": "Enter"}`
- **hover:** `{"action": "hover", "selector": ".menu"}`
- **select:** `{"action": "select", "selector": "select", "values": ["opt1"]}`
- **wait:** `{"action": "wait", "selector": ".loaded", "networkIdle": true}`
- **evaluate:** `{"action": "evaluate", "script": "document.title"}`
- **screenshot:** `{"action": "screenshot", "output": "/tmp/ui-state.png"}`

## Output
Returns JSON with: screenshot (path), dom (HTML), network (requests+responses), console (logs), url, title, errors. Screenshot saved to /tmp/ui-state.png.
