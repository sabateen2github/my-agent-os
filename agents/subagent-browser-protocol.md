---
# Shared Browser-First Subagent Protocol (v1.0 — 2026-08-01)
# Canonical rules that EVERY spawner (surge-analyst, deep-moat-auditor, orchestrator)
# MUST include when spawning built-in agents (@general, @explore, @discovery) —
# built-in agents get NO orchestrator patterns, so the spawner is the only way
# they learn browser-first behavior. Keep this file in sync with:
#   - skills/browser-agent/SKILL.md (operational detail)
#   - agents/orchestrator.md (Pattern 20 / Pattern 2 / Pattern 25)
---

# SUBAGENT TASK PROMPT RULES — BAKED INTO EVERY TASK PROMPT

When writing a task prompt for ANY built-in subagent, paste the following block
VERBATIM at the top of the prompt. Do not summarize it — built-in agents only
know what you tell them.

```
⚠️ BROWSER-FIRST PROTOCOL (MANDATORY — applies to all your research):

1. The BROWSER is your PRIMARY research tool. Normal interaction order:
   browser_navigate → browser_screenshot → browser_text → browser_click → read.
   Use browser_text on the page for content; use browser_screenshot + @vision for
   anything visual. (If YOU cannot read images, spawn @vision — never guess.)

2. NEVER reverse-engineer the page. No browser_evaluate DOM hacking to extract
   data (no internal XHR/JSON APIs like patents.google.com/xhr/query, no shadow
   DOM walking, no React fiber inspection, no querySelectorAll('*') scans) UNLESS
   normal interaction has failed 3+ times. browser_evaluate is inspection-only.

3. NEVER give up after one failed attempt. If a site blocks or times out, cascade:
   Google → Bing → DuckDuckGo → direct URL (finance.yahoo.com, wikipedia.org,
   sec.gov, patents.google.com). Solve captchas (PX/DataDome → bypassPx; reCAPTCHA
   → @vision + clickFrame). A captcha or timeout is NOT a reason to abandon the
   browser — it is a reason to try another route.

4. webfetch is EMERGENCY-ONLY. Use it only after ALL browser paths above have
   failed (3+ distinct attempts). If you have used webfetch more than 30% of your
   web calls, you are violating this protocol.

5. NEVER write waitUntil: "networkidle2" or "networkidle0". Valid values:
   load | domcontentloaded | networkidle | commit. Omit it to default to networkidle.

6. NEVER mention Brave Search. There is no Brave MCP — it was removed. Do not
   reference server-brave-search or brave_web_search in any prompt or tool call.

7. Verify every key data point against 2-3 independent sources before reporting
   it. Cite each source in your output: [site name, browser|direct URL].
   If sources disagree, report the disagreement and use the conservative value.

8. @vision rate limit: at most 1 vision spawn; if you get a 429, wait 30-60s and
   retry ONCE; batch multiple screenshots into a single vision call.
```

## Why this file exists (evidence)

Meta-cognition audit 2026-08-01 found that built-in @general agents were told to
"Use Brave Search (server-brave-search_brave_web_search)" by their spawners — a
tool removed in commit 4232533. Agents called the dead API, got 402 Payment
Required, fell back to webfetch (307 calls = 64% of web traffic), got empty
results on JS pages, and reverse-engineered the DOM (84 browser_evaluate hacks).
The user's complaints: "stuck into a technical interaction loop of worthlessness",
"they always try to reverse engineer things", "give up early and go try other data
sources". This protocol is the single canonical fix: one block, baked into every
task prompt, no ambiguity.

## Verification

After spawning built-in agents, verify their task prompt contained this block:
- grep the session's task prompt for "BROWSER-FIRST PROTOCOL" — if missing, the
  spawner violated this rule (meta-cognition Rule 11E flags this).
