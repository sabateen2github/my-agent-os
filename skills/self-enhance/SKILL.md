---
name: self-enhance
description: Evolves the agent ecosystem by auditing agents, skills, and tools — then editing them directly to bake in discoveries, fix gaps, and harden patterns. No external database. The files ARE the knowledge base.
license: MIT
compatibility: opencode
metadata:
  runtime: meta
  location: ~/my-agent-os
  targets: agents, skills, tools, opencode.json
---

## What I Do

I make the agent ecosystem **self-evolving**. When the orchestrator or discovery agent discovers a pattern, gap, or better approach during real work, those learnings get baked directly into the relevant agent, skill, or tool file. No database — the system prompt files themselves accumulate wisdom over time.

## Workflow

When invoked, I audit and improve the entire ecosystem:

### Phase 1: Audit
Read every file and cross-reference:
- Does every action in `server.js` have a tool export in `browser.ts`?
- Does every tool in `browser.ts` appear in `SKILL.md` documentation?
- Do `orchestrator.md` patterns reference tools that actually exist?
- Does `browser-telemetry/run.py` match what `SKILL.md` documents?
- Is stealth config consistent across server.js, run.py, and docs?
- Does `opencode.json` permission block cover all skills, agents, and directories?

### Phase 2: Fix
For every gap found:
- Add missing tool exports to `browser.ts`
- Update SKILL.md to document newly exported tools
- Fix orchestrator.md patterns to match available tools
- Ensure all file references use absolute paths

### Phase 3: Harden
- Add any new patterns discovered since last run
- Update battle-tested sections with recent wins
- Prune dead references to removed components

## Target Files

| Component | Path |
|---|---|
| Tool exports | `/home/ubuntu/my-agent-os/tools/browser.ts` |
| Browser server | `/home/ubuntu/my-agent-os/skills/browser-agent/server.js` |
| Browser docs | `/home/ubuntu/my-agent-os/skills/browser-agent/SKILL.md` |
| Stealth ref | `/home/ubuntu/my-agent-os/skills/browser-agent/stealth-reference.md` |
| Telemetry impl | `/home/ubuntu/my-agent-os/skills/browser-telemetry/run.py` |
| Telemetry docs | `/home/ubuntu/my-agent-os/skills/browser-telemetry/SKILL.md` |
| Orchesterator | `/home/ubuntu/my-agent-os/agents/orchestrator.md` |
| Discovery | `/home/ubuntu/my-agent-os/agents/discovery.md` |
| Vision | `/home/ubuntu/my-agent-os/agents/vision.md` |
| Config | `/home/ubuntu/my-agent-os/opencode.json` |
| MCP | `/home/ubuntu/my-agent-os/mcp/settings.json` |
| README | `/home/ubuntu/my-agent-os/README.md` |

## Critical Rules

1. **Edit first, create last.** The primary job is improving existing system prompts, scripts, and tool definitions. Only create a new file when no existing file can hold the improvement.
2. **Never break existing functionality.** When adding tool exports, preserve exact parameter names and types.
3. **Match server.js exactly.** Tool parameter names in `browser.ts` must match what `server.js` expects.
4. **Documentation must match reality.** If `orchestrator.md` documents a pattern, the tools must exist.
5. **Keep it general.** No project-specific knowledge (no "Plaid", no "Oracle", no specific API endpoints). Use abstract examples.
6. **Accumulate in prompts.** Every improvement goes into the agent `.md` files or skill documentation — that's where the wisdom lives.

## Ecosystem Evolution Rule

Every agent in this ecosystem has an "Ecosystem Evolution" section in its instructions. When any agent discovers something worth keeping — a better pattern, a tool gap, a reliability trick — it updates the relevant file. The orchestrator coordinates this, but any agent can trigger an improvement by updating the file and telling the orchestrator what changed.

**The files ARE the knowledge base. They get better every session.**
