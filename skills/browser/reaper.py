#!/usr/bin/env python3
"""
Browser instance reaper — auto-closes per-owner browser windows whose owner
stopped using them (subagent finished or was terminated).

This runs INDEPENDENTLY of the opencode process (systemd user timer) so it
works even if opencode crashed. It reads the registry written by
tools/browser.ts and closes instances idle for > IDLE_MS.

v2 (race-condition hardening):
  • Takes the SAME cross-process registry lock as tools/browser.ts
    (~/.browser-agents/registry.lock) so this reaper can never clobber a
    registry write in flight from the opencode tool process (the root cause
    of "failed to start on port 9230": reaper deleted an entry while the
    server was still bound, then the next spawn picked the port and failed).
  • Kills the REAL pid listening on the port (setsid may fork, so the
    tracked pid can be a dead wrapper — previously this let the reaper
    "prove" the instance dead and delete the entry while the server kept
    running and holding the port).
  • Deletes stale user-data dirs for owners no longer in the registry
    (the 1.9GB leak: instances were reaped but ~/.browser-agents/<owner>
    was never cleaned up).
"""

import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

IDLE_MS = int(os.environ.get("BROWSER_INSTANCE_IDLE_MS", str(5 * 60 * 1000)))
REGISTRY_FILE = Path(os.path.expanduser("~/.browser-agents/registry.json"))
REGISTRY_LOCK = Path(os.path.expanduser("~/.browser-agents/registry.lock"))
SUPERVISOR_DIR = Path(os.path.expanduser("~/.browser-agents"))
# Dir mtime must be older than this before we rm -rf it (protects a
# directory whose registry entry was JUST created in between our two reads).
STALE_DIR_MS = 10 * 60 * 1000


def log(msg):
    print(f"[browser-reaper] {msg}", file=sys.stderr, flush=True)


def _pid_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except Exception:
        return False


def pid_listening_on(port):
    """Real PID bound to a port via ss, or None. Handles setsid fork case."""
    try:
        out = subprocess.run(
            ["ss", "-tlnp"], capture_output=True, text=True, timeout=5
        ).stdout
        for line in out.splitlines():
            if f":{port}" in line:
                import re

                m = re.search(r"pid=(\d+)", line)
                if m:
                    return int(m.group(1))
    except Exception:
        pass
    return None


def close_instance(port, pid):
    # Close the browser cleanly via the HTTP API
    try:
        subprocess.run(
            [
                "curl",
                "-s",
                "-m",
                "4",
                "-X",
                "POST",
                f"http://127.0.0.1:{port}",
                "-H",
                "Content-Type: application/json",
                "-d",
                '{"action":"close"}',
            ],
            timeout=10,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass
    # Kill BOTH the tracked pid and whatever is really listening (setsid
    # wrapper may fork, so the tracked pid can be a dead shell while the
    # real server keeps the port bound).
    for p in {pid, pid_listening_on(port)}:
        if p and p > 0:
            try:
                os.kill(p, signal.SIGKILL)
            except Exception:
                pass


def acquire_lock(timeout_ms=15000):
    """mkdir-based cross-process lock, identical protocol to browser.ts."""
    deadline = time.time() * 1000 + timeout_ms
    while True:
        try:
            REGISTRY_LOCK.mkdir()
            (REGISTRY_LOCK / "pid").write_text(str(os.getpid()))
            return
        except FileExistsError:
            try:
                age_ms = (time.time() - REGISTRY_LOCK.stat().st_mtime) * 1000
                if age_ms > 30000:
                    shutil.rmtree(REGISTRY_LOCK, ignore_errors=True)
                    continue
            except FileNotFoundError:
                continue
            except Exception:
                pass
            if time.time() * 1000 > deadline:
                log("SKIP: registry lock timeout")
                raise TimeoutError("registry lock timeout")
            time.sleep(0.2)


def release_lock():
    try:
        shutil.rmtree(REGISTRY_LOCK, ignore_errors=True)
    except Exception:
        pass


def clean_stale_dirs(reg):
    """Delete per-owner dirs not in the registry and old enough to be safe.

    The registry is the source of truth for LIVE instances. Any owner dir
    without a registry entry (and not modified recently) is an orphan from
    an already-reaped/aborted instance — this is the 1.9GB leak.
    """
    now_ms = time.time() * 1000
    removed = 0
    for child in SUPERVISOR_DIR.iterdir():
        if not child.is_dir():
            continue
        name = child.name
        if name in ("registry.lock",) or name.endswith(".tmp"):
            continue
        # Owner dirs are named like "general-abcd1234" or "surge-analyst".
        # Never touch the shared 9222 instance (it lives elsewhere) — this
        # dir only holds per-owner instances, all of which must be in reg.
        if name in reg:
            continue
        try:
            age_ms = now_ms - child.stat().st_mtime * 1000
        except Exception:
            continue
        if age_ms < STALE_DIR_MS:
            continue
        try:
            shutil.rmtree(child, ignore_errors=True)
            removed += 1
            log(f"Removed stale owner dir: {name} (age {age_ms / 1000 / 60:.0f}m)")
        except Exception:
            pass
    if removed:
        log(f"Cleaned {removed} stale owner dir(s)")


def main():
    if not REGISTRY_FILE.exists():
        clean_stale_dirs({})
        return

    try:
        acquire_lock()
    except TimeoutError:
        return

    try:
        reg = json.loads(REGISTRY_FILE.read_text())
        now_ms = int(time.time() * 1000)
        changed = False
        for owner, info in list(reg.items()):
            if not isinstance(info, dict):
                del reg[owner]
                changed = True
                continue
            last_used = info.get("lastUsed") or 0
            port = info.get("port")
            pid = info.get("pid")
            idle_ms = now_ms - last_used

            if idle_ms > IDLE_MS:
                log(
                    f"Closing idle instance for '{owner}' (idle {idle_ms / 1000:.0f}s > {IDLE_MS / 1000:.0f}s)"
                )
                if port:
                    close_instance(port, pid)
                del reg[owner]
                changed = True
            elif port and pid:
                # Stale entry: tracked process dead AND nothing listening on
                # the port -> drop it. If the port still responds, the
                # server is alive (setsid wrapper pid mismatch) — KEEP it.
                real_pid = pid_listening_on(port)
                tracked_alive = _pid_alive(pid) if pid else False
                if not tracked_alive and real_pid is None:
                    del reg[owner]
                    changed = True
                elif not tracked_alive and real_pid is not None:
                    # Refresh pid so the next idle sweep can kill it properly
                    reg[owner]["pid"] = real_pid
                    changed = True
            elif port and not pid:
                # Entry with a port but no pid: check the port itself
                try:
                    subprocess.run(
                        ["curl", "-s", "-m", "2", f"http://127.0.0.1:{port}/status"],
                        timeout=5,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        check=True,
                    )
                    reg[owner]["pid"] = pid_listening_on(port)
                    changed = True
                except Exception:
                    del reg[owner]
                    changed = True

        if changed:
            tmp = REGISTRY_FILE.with_suffix(".tmp")
            tmp.write_text(json.dumps(reg, indent=2))
            tmp.rename(REGISTRY_FILE)

        # Post-sweep: remove orphaned owner dirs (NOT live registry owners)
        clean_stale_dirs(reg)
    finally:
        release_lock()


if __name__ == "__main__":
    main()
