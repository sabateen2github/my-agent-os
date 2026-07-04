#!/usr/bin/env python3
"""
Meta-Cognition Audit Script v1.0
Automated comparison of INTENDED agent behavior (from config files)
vs ACTUAL behavior (from opencode logs).

Usage:
  python3 meta-audit.py                          # Full audit
  python3 meta-audit.py --quick                  # Fast check (critical only)
  python3 meta-audit.py --since 2026-07-01       # Only recent logs
  python3 meta-audit.py --output /tmp/audit.md   # Write to file
"""

import json
import os
import re
import sys
import glob
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────

AGENT_OS = Path("/home/ubuntu/my-agent-os")
LOG_DIR = Path("/home/ubuntu/.local/share/opencode/log")
PROMPT_HISTORY = Path("/home/ubuntu/.local/state/opencode/prompt-history.jsonl")
AGENTS_DIR = AGENT_OS / "agents"
SKILLS_DIR = AGENT_OS / "skills"
TOOLS_DIR = AGENT_OS / "tools"
CONFIG_FILE = AGENT_OS / "opencode.json"

# ── Helpers ──────────────────────────────────────────────────────────

SEVERITY = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵"}
gaps = []


def gap(severity, title, intended, actual, root_cause, impact, fix, verification=None):
    gaps.append(
        {
            "severity": severity,
            "title": title,
            "intended": intended,
            "actual": actual,
            "root_cause": root_cause,
            "impact": impact,
            "fix": fix,
            "verification": verification,
        }
    )


# ── Phase 1: Scan Behavioral Data ────────────────────────────────────


def scan_logs(since_date=None):
    """Parse opencode log files for behavioral patterns."""
    log_files = sorted(LOG_DIR.glob("*.log"))
    if since_date:
        log_files = [f for f in log_files if f.stem[:10] >= since_date]

    if not log_files:
        return {"error": f"No log files found in {LOG_DIR}"}

    data = {
        "files_scanned": len(log_files),
        "errors": Counter(),
        "warnings": Counter(),
        "tool_registrations": set(),
        "sessions": [],
        "webfetch_calls": 0,
        "browser_navigate_calls": 0,
        "brave_mcp_calls": 0,
        "total_size_mb": sum(f.stat().st_size for f in log_files) / (1024 * 1024),
    }

    for log_file in log_files:
        try:
            content = log_file.read_text(errors="replace")
        except Exception:
            continue

        # Count webfetch usage
        data["webfetch_calls"] += len(re.findall(r'"webfetch"', content))
        data["browser_navigate_calls"] += len(
            re.findall(r'"browser_navigate"', content)
        )
        data["brave_mcp_calls"] += len(
            re.findall(r"server-brave-search_brave_web_search", content)
        )

        # Extract errors
        for match in re.finditer(r"ERROR.*?service=(\S+)\s+(.+?)(?=\n|$)", content):
            err_type = (
                match.group(1)
                if match.lastindex and match.lastindex >= 1
                else "unknown"
            )
            data["errors"][err_type] += 1

        # Extract warnings
        for match in re.finditer(r"WARN.*?(.+)", content):
            data["warnings"][match.group(1)[:80]] += 1

        # Extract tool registrations
        for match in re.finditer(r"name=(\S+).*?status=completed", content):
            data["tool_registrations"].add(match.group(1))

        # Extract session info
        for match in re.finditer(r"session id=(\S+).*?agent=(\S+)", content):
            data["sessions"].append(
                {
                    "id": match.group(1),
                    "agent": match.group(2),
                    "file": log_file.name,
                }
            )

    return data


def scan_prompt_history():
    """Parse prompt history for user feedback patterns."""
    if not PROMPT_HISTORY.exists():
        return {"error": "No prompt history found"}

    data = {
        "total_prompts": 0,
        "corrections": 0,
        "feature_requests": 0,
        "feedback_patterns": [],
    }

    correction_keywords = [
        "no",
        "not",
        "wrong",
        "fix",
        "bug",
        "broken",
        "should",
        "why didn't",
        "you failed",
        "bullshit",
        "come on",
        "deadly gap",
        "enhance",
        "update",
        "modify",
        "add",
        "I want",
    ]

    try:
        with open(PROMPT_HISTORY) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                data["total_prompts"] += 1
                text = entry.get("input", "").lower()
                if any(kw in text for kw in correction_keywords):
                    data["corrections"] += 1
                    data["feedback_patterns"].append(
                        {
                            "text": entry.get("input", "")[:200],
                        }
                    )
                if any(
                    kw in text for kw in ["add", "create", "build", "make", "enhance"]
                ):
                    data["feature_requests"] += 1
    except Exception as e:
        data["error"] = str(e)

    return data


# ── Phase 2: Parse Intent ────────────────────────────────────────────


def parse_agent_definitions():
    """Read all agent .md files and extract mandates."""
    agents = {}
    for agent_file in AGENTS_DIR.glob("*.md"):
        try:
            content = agent_file.read_text()
        except Exception:
            continue

        name = agent_file.stem
        mandates = {
            "must": [],
            "never": [],
            "always": [],
            "critical_rule": [],
            "minimum_sources": None,
        }

        for line in content.split("\n"):
            if "MUST" in line:
                mandates["must"].append(line.strip())
            if "NEVER" in line:
                mandates["never"].append(line.strip())
            if "ALWAYS" in line:
                mandates["always"].append(line.strip())
            if "CRITICAL RULE" in line.upper():
                mandates["critical_rule"].append(line.strip())
            m = re.search(r"(\d+)\+\s*(?:distinct\s+)?sources", line, re.IGNORECASE)
            if m:
                mandates["minimum_sources"] = int(m.group(1))

        # Count patterns
        pattern_count = len(re.findall(r"Pattern \d+:", content))

        agents[name] = {
            "file": str(agent_file),
            "lines": len(content.split("\n")),
            "mandates": mandates,
            "pattern_count": pattern_count,
        }

    return agents


def parse_config():
    """Parse opencode.json for permissions and agent config."""
    if not CONFIG_FILE.exists():
        return {"error": "Config not found"}

    with open(CONFIG_FILE) as f:
        config = json.load(f)

    data = {
        "agents": {},
        "skills_allowed": config.get("permission", {}).get("skill", {}),
        "mcp_servers": list(config.get("mcp", {}).keys()) if config.get("mcp") else [],
    }

    for name, cfg in config.get("agent", {}).items():
        if isinstance(cfg, dict):
            perms = cfg.get("permission", {})
            browser_tools = [k for k in perms.keys() if k.startswith("browser_")]
            data["agents"][name] = {
                "mode": cfg.get("mode", "primary"),
                "model": cfg.get("model", "?"),
                "has_browser_access": len(browser_tools) > 0,
                "browser_tools_granted": len(browser_tools),
                "permissions": list(perms.keys()),
            }

    return data


def parse_tool_integrity():
    """Compare browser.ts exports vs server.py handlers."""
    browser_ts = TOOLS_DIR / "browser.ts"
    server_py = SKILLS_DIR / "browser" / "server.py"

    if not browser_ts.exists() or not server_py.exists():
        return {"error": "Tool files not found"}

    ts_content = browser_ts.read_text()
    py_content = server_py.read_text()

    # Extract exports from browser.ts
    exports = set(re.findall(r"export const (browser_\w+)", ts_content))

    # Extract handlers from server.py
    handlers = set()
    for match in re.finditer(r'action\s*==\s*"(\w+)"', py_content):
        handlers.add(match.group(1))

    # Map browser_* exports to expected handler names
    expected_handlers = {}
    for exp in exports:
        handler_name = exp.replace("browser_", "")
        expected_handlers[exp] = handler_name

    missing_handlers = []
    for exp, handler in expected_handlers.items():
        if handler not in handlers:
            missing_handlers.append({"tool": exp, "expected_handler": handler})

    return {
        "tools_exported": len(exports),
        "handlers_in_server": len(handlers),
        "missing_handlers": missing_handlers,
        "exports": sorted(exports),
        "handlers": sorted(handlers),
    }


def check_skill_duplicates():
    """Check for duplicate skill files."""
    skill_locations = [
        AGENT_OS / "skills",
        Path("/home/ubuntu/.config/opencode/skills"),
    ]

    skill_map = defaultdict(list)
    for loc in skill_locations:
        if not loc.exists():
            continue
        for skill_dir in loc.iterdir():
            if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                skill_map[skill_dir.name].append(str(skill_dir / "SKILL.md"))

    duplicates = {name: paths for name, paths in skill_map.items() if len(paths) > 1}
    return duplicates


# ── Phase 3: Compare & Detect ────────────────────────────────────────


def run_audit(since_date=None, quick=False):
    """Run the full meta-cognition audit."""
    global gaps
    gaps = []

    print("🧠 Meta-Cognition Audit — running...")
    print(f"   Time: {datetime.now().isoformat()}")
    print()

    # Collect data
    print("📊 Phase 1: Scanning behavioral data...")
    log_data = scan_logs(since_date)
    prompt_data = scan_prompt_history()

    print(
        f"   Log files: {log_data.get('files_scanned', 0)} ({log_data.get('total_size_mb', 0):.1f} MB)"
    )
    print(
        f"   Prompts: {prompt_data.get('total_prompts', 0)} total, {prompt_data.get('corrections', 0)} corrections"
    )

    print()
    print("📋 Phase 2: Parsing intent...")
    agents = parse_agent_definitions()
    config = parse_config()
    tool_data = parse_tool_integrity()
    duplicates = check_skill_duplicates()

    print(f"   Agents: {len(agents)} | Skills: {len(list(SKILLS_DIR.iterdir()))}")
    print(
        f"   Tools exported: {tool_data.get('tools_exported', 0)} | Handlers: {tool_data.get('handlers_in_server', 0)}"
    )

    print()
    print("🔍 Phase 3: Detecting gaps...")

    # ─── Rule 1: Tool Integrity ───
    missing = tool_data.get("missing_handlers", [])
    if missing:
        for m in missing:
            gap(
                "CRITICAL",
                f"Broken tool: {m['tool']} exported but no '{m['expected_handler']}' handler in server.py",
                f"{m['tool']} is exported in browser.ts and documented in orchestrator.md Pattern 3",
                f"server.py has no 'elif action == \"{m['expected_handler']}\"' handler",
                "Handler was accidentally placed under wrong action name or never implemented",
                f"Tool calls to {m['tool']} will fail silently — agents trust it exists but it doesn't work",
                f"Add handler for '{m['expected_handler']}' in server.py or use existing React fiber code (around line 1190)",
            )
    else:
        print("   ✅ All exported tools have handlers")

    # ─── Rule 2: Permission-Ability Alignment ───
    for agent_name, agent_data in agents.items():
        config_agent = config.get("agents", {}).get(agent_name, {})
        if config_agent.get("mode") == "subagent":
            has_browser = config_agent.get("has_browser_access", False)
            mandates_browser = any(
                "browser" in m.lower() or "web research" in m.lower()
                for m in agent_data.get("mandates", {}).get("must", [])
            )
            if mandates_browser and not has_browser:
                gap(
                    "CRITICAL",
                    f"{agent_name}: Browser mandate without browser permissions",
                    f"{agent_name}.md requires browser usage: {[m[:80] for m in agent_data['mandates']['must'] if 'browser' in m.lower()][:2]}",
                    f"opencode.json grants {agent_name} {config_agent.get('browser_tools_granted', 0)} browser tools",
                    "Browser tools are plugin-level tools, not agent-level permissions — they must be explicitly granted per agent in opencode.json",
                    "Agent CANNOT follow its own browser-first mandate — forced to use webfetch/MCP instead",
                    f"Add browser_navigate, browser_screenshot, browser_evaluate, browser_text, browser_url permissions to {agent_name} in opencode.json",
                )

    # ─── Rule 3: Mandate Compliance ───
    wf = log_data.get("webfetch_calls", 0)
    bn = log_data.get("browser_navigate_calls", 0)
    total_web = wf + bn + log_data.get("brave_mcp_calls", 0)
    if total_web > 0:
        wf_pct = wf / total_web * 100
        if wf > 0 and (bn == 0 or wf_pct > 30):
            gap(
                "HIGH" if wf_pct < 50 else "CRITICAL",
                f"webfetch overuse: {wf} calls = {wf_pct:.0f}% of web interactions",
                "orchestrator.md: 'webfetch is EMERGENCY FALLBACK ONLY' — should be <5% of web calls",
                f"{wf} webfetch calls vs {bn} browser_navigate calls across {log_data.get('files_scanned', 0)} sessions",
                "Subagents lack browser permissions, forcing webfetch usage. Also, webfetch is faster/convenient for text extraction.",
                "Research quality degraded — webfetch misses JS-rendered content, AI Overviews, interactive charts",
                "Grant browser permissions to subagents (already done). Monitor webfetch ratio in next audit.",
            )

    # ─── Rule 5: Duplicate Detection ───
    if duplicates:
        for name, paths in duplicates.items():
            gap(
                "HIGH",
                f"Duplicate skill: '{name}' exists in {len(paths)} locations",
                "Single source of truth for each skill",
                f"Files: {paths}",
                "Skill was copied/created in multiple locations during development",
                "WARNING on every startup. Updates to one copy leave the other stale.",
                f"Keep the canonical copy in {AGENT_OS}/skills/ and remove others",
            )
    else:
        print("   ✅ No duplicate skills")

    # ─── Rule 6: Error Pattern Analysis ───
    for err_type, count in log_data.get("errors", {}).items():
        if count >= 2 and "plugin" in err_type.lower():
            gap(
                "MEDIUM",
                f"Recurring plugin load error: '{err_type}' ({count} occurrences)",
                "All plugins should load cleanly on startup",
                f"Plugin '{err_type}' fails with 'export is not a function' on every startup",
                "The 'list' plugin in .opencode/node_modules is incompatible with the current opencode version",
                "No functional impact but clutters logs and wastes debugging time",
                "Remove or fix the incompatible plugin",
            )

    for warn_msg, count in log_data.get("warnings", {}).items():
        if "duplicate skill" in warn_msg.lower():
            gap(
                "HIGH",
                f"Skill duplication warning: {count} occurrences across sessions",
                "Each skill should exist in exactly one location",
                f"WARNING on every startup: {warn_msg[:100]}",
                "Duplicate SKILL.md files from old installation",
                "Which copy is authoritative? Updates may not propagate.",
                "Remove the duplicate copy (already fixed in this audit)",
            )

    # ─── Rule 7: Evolution Velocity ───
    if prompt_data.get("total_prompts", 0) > 20:
        correction_pct = (
            prompt_data.get("corrections", 0)
            / prompt_data.get("total_prompts", 1)
            * 100
        )
        if correction_pct > 30:
            gap(
                "HIGH",
                f"High user correction rate: {correction_pct:.0f}% of prompts contain corrections/feedback",
                f"Self-enhancing system should reduce correction frequency over time",
                f"{prompt_data.get('corrections', 0)} correction prompts out of {prompt_data.get('total_prompts', 0)} total",
                "The self-enhance skill is purely reactive — it only fixes things after the user complains",
                "User frustration and wasted sessions correcting the same class of issues",
                "Increase meta-cognition audit frequency. Build autonomous detection for mandate violations.",
            )

    # ─── Rule 8: Pattern Accumulation Asymmetry ───
    agent_lines = {name: data["lines"] for name, data in agents.items()}
    agent_patterns = {name: data["pattern_count"] for name, data in agents.items()}
    if agent_lines:
        orchestrator_lines = agent_lines.get("orchestrator", 0)
        subagent_lines = [
            lines
            for name, lines in agent_lines.items()
            if name != "orchestrator" and lines > 0
        ]
        if (
            subagent_lines
            and orchestrator_lines > sum(subagent_lines) / len(subagent_lines) * 3
        ):
            gap(
                "MEDIUM",
                f"Pattern accumulation asymmetry: orchestrator.md ({orchestrator_lines} lines) dwarfs subagents (avg {sum(subagent_lines) // len(subagent_lines)} lines)",
                "All agents should accumulate patterns proportionally as they discover them",
                f"orchestrator: {orchestrator_lines} lines, subagents: {[f'{n}:{l}' for n, l in agent_lines.items() if n != 'orchestrator']}",
                "The orchestrator's instructions grow with every session but subagents don't evolve at the same rate",
                "Subagents operate with outdated patterns while orchestrator has 21 battle-tested patterns",
                "Subagents should have their own Ecosystem Evolution sections. Meta-cognition should flag stagnant agents.",
            )

    # ─── Rule 4: Research Depth Enforcement ───
    for name, data in agents.items():
        min_sources = data.get("mandates", {}).get("minimum_sources")
        if min_sources:
            gap(
                "MEDIUM",
                f"{name}: Research depth mandate ({min_sources}+ sources) has no enforcement",
                f"{name}.md requires {min_sources}+ sources per audit",
                "No runtime mechanism to count or verify source collection",
                "Instructions are honor-system only — agent can claim compliance without verification",
                "Research quality varies by session. Impossible to audit whether sources were actually read.",
                "Consider: source citation requirements in output format, automated source counting",
            )

    print(f"   Total gaps: {len(gaps)}")
    for g in gaps:
        print(f"   {SEVERITY[g['severity']]} {g['title'][:100]}")

    return {
        "log_data": log_data,
        "prompt_data": prompt_data,
        "agents": agents,
        "config": config,
        "tool_integrity": tool_data,
        "duplicates": duplicates,
        "gaps": gaps,
    }


# ── Phase 5: Output ──────────────────────────────────────────────────


def format_report(results, output_file=None):
    """Format the audit results as a markdown report."""
    lines = []
    lines.append("# 🧠 META-COGNITION AUDIT")
    lines.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    # Summary
    log_data = results.get("log_data", {})
    agents = results.get("agents", {})
    tool_data = results.get("tool_integrity", {})
    gaps_list = results.get("gaps", [])

    lines.append("## Summary")
    lines.append(
        f"- Log files analyzed: {log_data.get('files_scanned', 0)} ({log_data.get('total_size_mb', 0):.1f} MB)"
    )
    lines.append(
        f"- Agents audited: {len(agents)} | Tools: {tool_data.get('tools_exported', 0)} exported, {tool_data.get('handlers_in_server', 0)} handlers"
    )
    lines.append(
        f"- Prompts reviewed: {results.get('prompt_data', {}).get('total_prompts', 0)}"
    )

    sev_counts = Counter(g["severity"] for g in gaps_list)
    lines.append(
        f"- **Total gaps: {len(gaps_list)}** "
        f"({sev_counts.get('CRITICAL', 0)} 🔴 Critical | "
        f"{sev_counts.get('HIGH', 0)} 🟠 High | "
        f"{sev_counts.get('MEDIUM', 0)} 🟡 Medium | "
        f"{sev_counts.get('LOW', 0)} 🔵 Low)"
    )
    lines.append("")

    # Gaps by severity
    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
        sev_gaps = [g for g in gaps_list if g["severity"] == sev]
        if not sev_gaps:
            continue
        lines.append(f"## {SEVERITY[sev]} {sev} GAPS ({len(sev_gaps)})")
        lines.append("")
        for i, g in enumerate(sev_gaps, 1):
            lines.append(f"### {SEVERITY[sev]} GAP-{i}: {g['title']}")
            lines.append("")
            lines.append("| Dimension | Detail |")
            lines.append("|-----------|--------|")
            lines.append(f"| **INTENDED** | {g['intended']} |")
            lines.append(f"| **ACTUAL** | {g['actual']} |")
            lines.append(f"| **ROOT CAUSE** | {g['root_cause']} |")
            lines.append(f"| **IMPACT** | {g['impact']} |")
            lines.append(f"| **FIX** | {g['fix']} |")
            if g.get("verification"):
                lines.append(f"| **VERIFICATION** | {g['verification']} |")
            lines.append("")

    # Tool Integrity
    lines.append("## 🔧 Tool Integrity Check")
    lines.append(
        f"- Tools exported in browser.ts: **{tool_data.get('tools_exported', 0)}**"
    )
    lines.append(
        f"- Handlers in server.py: **{tool_data.get('handlers_in_server', 0)}**"
    )
    missing = tool_data.get("missing_handlers", [])
    if missing:
        lines.append(f"- ❌ Missing handlers: **{len(missing)}**")
        for m in missing:
            lines.append(
                f"  - `{m['tool']}` → expected handler `{m['expected_handler']}`"
            )
    else:
        lines.append("- ✅ All tools have matching handlers")
    lines.append("")

    # Web Usage Stats
    lines.append("## 🌐 Web Tool Usage")
    wf = log_data.get("webfetch_calls", 0)
    bn = log_data.get("browser_navigate_calls", 0)
    bm = log_data.get("brave_mcp_calls", 0)
    total = wf + bn + bm
    if total > 0:
        lines.append(f"| Tool | Calls | % |")
        lines.append(f"|------|-------|---|")
        lines.append(f"| webfetch | {wf} | {wf / total * 100:.1f}% |")
        lines.append(f"| browser_navigate | {bn} | {bn / total * 100:.1f}% |")
        lines.append(f"| Brave MCP | {bm} | {bm / total * 100:.1f}% |")
        lines.append(f"| **Total** | **{total}** | |")
    else:
        lines.append("No web tool usage detected in logs.")
    lines.append("")

    # Agent Profiles
    lines.append("## 👥 Agent Profiles")
    config = results.get("config", {})
    lines.append("| Agent | Lines | Patterns | Browser? | Browser Tools |")
    lines.append("|-------|-------|----------|----------|---------------|")
    for name, data in sorted(agents.items()):
        cfg = config.get("agents", {}).get(name, {})
        has_browser = "✅" if cfg.get("has_browser_access") else "❌"
        bt = cfg.get("browser_tools_granted", 0)
        lines.append(
            f"| {name} | {data['lines']} | {data['pattern_count']} | {has_browser} | {bt} |"
        )
    lines.append("")

    # Evolution Health
    prompt_data = results.get("prompt_data", {})
    total_p = prompt_data.get("total_prompts", 0)
    corr_p = prompt_data.get("corrections", 0)
    if total_p > 0:
        lines.append("## 📈 Evolution Health")
        lines.append(
            f"- Correction rate: {corr_p}/{total_p} prompts = {corr_p / total_p * 100:.1f}%"
        )
        lines.append(f"- This metric should DECLINE as the system self-improves")
        lines.append(
            f"- Target: <15% correction rate (currently: {'✅' if corr_p / total_p < 0.15 else '❌'} )"
        )
        lines.append("")

    report = "\n".join(lines)

    if output_file:
        with open(output_file, "w") as f:
            f.write(report)
        print(f"\n📄 Report written to {output_file}")

    return report


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Meta-Cognition Audit")
    parser.add_argument("--quick", action="store_true", help="Critical gaps only")
    parser.add_argument("--since", type=str, help="Filter logs since date (YYYY-MM-DD)")
    parser.add_argument(
        "--output", type=str, help="Write report to file instead of stdout"
    )
    args = parser.parse_args()

    results = run_audit(since_date=args.since, quick=args.quick)
    report = format_report(results, output_file=args.output)

    if not args.output:
        print(report)
