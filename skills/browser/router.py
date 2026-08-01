#!/usr/bin/env python3
"""
Browser Agent Router — single entry point for every browser_* tool call.

One port (:9290) accepts every browser command. The `X-Agent` header
identifies the per-owner window (owner = '<agent>-<sha1(sessionID)[:8]>'
computed by tools/browser.ts). The router:

  * empty / shared X-Agent  -> proxies to the systemd default instance (:9222)
  * per-owner X-Agent       -> resolves/creates that owner's private instance
                               on 9230-9289, then proxies the command to it
  * action "close"          -> closes the CALLER's own instance (never another
                               agent's), matching the per-owner isolation
                               contract

All pool state lives in ~/.browser-agents/registry.json, protected by the
cross-process mkdir lock (~/.browser-agents/registry.lock) shared with the
reaper (reaper.py) — browser.ts is now a thin client and no longer touches
the registry.

Uses ThreadingHTTPServer so concurrent calls to DIFFERENT instances run in
parallel. Each per-owner server.py instance serializes its own requests via
its internal page_lock — correct per-agent behavior.

Also: on proxy failure to the shared :9222 instance, the router starts it
(systemctl --user start browser-agent.service) and retries once, mirroring
the old ensureServer() behavior in browser.ts.
"""

import json
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────
ROUTER_PORT = int(os.environ.get("BROWSER_ROUTER_PORT", "9290"))
SHARED_INSTANCE_URL = "http://127.0.0.1:9222"
PORT_START = int(os.environ.get("BROWSER_POOL_START", "9230"))
PORT_END = int(os.environ.get("BROWSER_POOL_END", "9289"))
MAX_INSTANCES = int(os.environ.get("BROWSER_MAX_INSTANCES", "12"))
INSTANCE_IDLE_MS = int(os.environ.get("BROWSER_INSTANCE_IDLE_MS", str(5 * 60 * 1000)))

SUPERVISOR_DIR = Path(os.path.expanduser("~/.browser-agents"))
REGISTRY_FILE = SUPERVISOR_DIR / "registry.json"
REGISTRY_LOCK = SUPERVISOR_DIR / "registry.lock"

SERVER_SCRIPT_CANDIDATES = [
    Path(os.path.expanduser("~/browser-agent/server.py")),
    Path(os.path.expanduser("~/my-agent-os/skills/browser/server.py")),
    Path("/home/ubuntu/browser-agent/server.py"),
]
SERVER_SCRIPT = next(
    (p for p in SERVER_SCRIPT_CANDIDATES if p.exists()), SERVER_SCRIPT_CANDIDATES[0]
)

SHARED_AGENTS = {"orchestrator", "build", "plan", "title", "compaction"}


def log(msg):
    print(f"[browser-router] {msg}", file=sys.stderr, flush=True)


# ── Registry + lock (identical protocol to reaper.py / browser.ts) ────
def read_registry():
    try:
        return json.loads(REGISTRY_FILE.read_text())
    except Exception:
        return {}


def write_registry(reg):
    try:
        SUPERVISOR_DIR.mkdir(exist_ok=True)
        tmp = REGISTRY_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(reg, indent=2))
        tmp.rename(REGISTRY_FILE)
    except Exception:
        pass


def acquire_lock(timeout_ms=15000):
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
                    import shutil

                    shutil.rmtree(REGISTRY_LOCK, ignore_errors=True)
                    continue
            except FileNotFoundError:
                continue
            except Exception:
                pass
            if time.time() * 1000 > deadline:
                raise TimeoutError("registry lock timeout")
            time.sleep(0.1)


def release_lock():
    try:
        import shutil

        shutil.rmtree(REGISTRY_LOCK, ignore_errors=True)
    except Exception:
        pass


def with_registry_lock(fn):
    acquire_lock()
    try:
        return fn()
    finally:
        release_lock()


# ── OS-level helpers ──────────────────────────────────────────────────
def bound_ports_in_range():
    out = set()
    try:
        raw = subprocess.run(
            ["bash", "-c", "ss -tln | awk '{print $4}'"],
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout
        import re

        for line in raw.splitlines():
            m = re.search(r":(\d+)$", line)
            if m:
                p = int(m.group(1))
                if PORT_START <= p <= PORT_END:
                    out.add(p)
    except Exception:
        pass
    return out


def pid_listening_on(port):
    try:
        raw = subprocess.run(
            ["bash", "-c", f"ss -tlnp | grep ':{port}\\b'"],
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout
        import re

        m = re.search(r"pid=(\d+)", raw)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return None


def is_alive(url, timeout_ms=2000):
    try:
        req = urllib.request.Request(url + "/status", method="GET")
        urllib.request.urlopen(req, timeout=timeout_ms / 1000).read()
        return True
    except Exception:
        return False


def close_instance_port(port):
    try:
        data = json.dumps({"action": "close"}).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10).read()
    except Exception:
        pass


# ── Instance lifecycle (moved from browser.ts) ────────────────────────
def spawn_instance(owner):
    """Reserve a port in the registry BEFORE spawning, skip OS-bound ports,
    track the REAL listening pid. Atomic under the registry lock."""

    def _spawn():
        reg = read_registry()
        used = {
            info.get("port")
            for info in reg.values()
            if isinstance(info, dict) and info.get("port")
        }
        bound = bound_ports_in_range()
        port = next(
            (
                p
                for p in range(PORT_START, PORT_END + 1)
                if p not in used and p not in bound
            ),
            None,
        )
        if port is None:
            raise RuntimeError(
                f"Browser instance pool exhausted ({PORT_START}-{PORT_END})"
            )
        user_data_dir = SUPERVISOR_DIR / owner / "user-data"
        user_data_dir.parent.mkdir(parents=True, exist_ok=True)
        # RESERVE before spawning so concurrent callers/reaper skip it
        reg[owner] = {
            "port": port,
            "userDataDir": str(user_data_dir),
            "status": "starting",
            "lastUsed": int(time.time() * 1000),
            "createdAt": int(time.time() * 1000),
        }
        write_registry(reg)

        env = dict(os.environ)
        env.update(
            {
                "BROWSER_AGENT_PORT": str(port),
                "BROWSER_AGENT_USER_DATA_DIR": str(user_data_dir),
                "BROWSER_AGENT_NAME": owner,
                "BROWSER_AGENT_SCREENSHOT_DIR": str(
                    SUPERVISOR_DIR / owner / "screenshots"
                ),
                "BROWSER_AGENT_EXIT_ON_CLOSE": "1",
                "DISPLAY": os.environ.get("DISPLAY", ":99"),
            }
        )
        log_fd = -1
        try:
            log_fd = os.open(
                str(SUPERVISOR_DIR / owner / "server.log"),
                os.O_WRONLY | os.O_CREAT | os.O_APPEND,
            )
        except Exception:
            pass

        try:
            # setsid detaches; stdout/stderr go to the per-owner log
            kwargs = {"env": env, "start_new_session": True}
            if log_fd >= 0:
                kwargs["stdout"] = log_fd
                kwargs["stderr"] = log_fd
            child = subprocess.Popen(
                ["setsid", sys.executable, str(SERVER_SCRIPT)],
                stdin=subprocess.DEVNULL,
                **kwargs,
            )
        finally:
            if log_fd >= 0:
                os.close(log_fd)

        url = f"http://127.0.0.1:{port}"
        deadline = time.time() + 15
        while time.time() < deadline:
            if is_alive(url):
                break
            time.sleep(0.5)
        if not is_alive(url):
            try:
                child.kill()
            except Exception:
                pass
            reg.pop(owner, None)
            write_registry(reg)
            raise RuntimeError(
                f'Browser instance for "{owner}" failed to start on port {port}'
            )

        real_pid = pid_listening_on(port) or child.pid
        reg[owner] = {
            "port": port,
            "userDataDir": str(user_data_dir),
            "pid": real_pid,
            "status": "ready",
            "lastUsed": int(time.time() * 1000),
            "createdAt": int(time.time() * 1000),
        }
        write_registry(reg)
        return url

    return with_registry_lock(_spawn)


def resolve_owner_url(owner):
    """Return the URL for an owner's private instance, creating/evicting as
    needed. All registry mutations are atomic under the lock."""

    def _resolve():
        reg = read_registry()
        existing = reg.get(owner)
        if existing and is_alive(f"http://127.0.0.1:{existing.get('port')}"):
            existing["lastUsed"] = int(time.time() * 1000)
            write_registry(reg)
            return f"http://127.0.0.1:{existing['port']}"
        if existing:
            reg.pop(owner, None)
            write_registry(reg)

        # Enforce MAX_INSTANCES: evict least-recently-used idle instance
        entries = [(k, v) for k, v in reg.items() if isinstance(v, dict)]
        if len(entries) >= MAX_INSTANCES:
            entries.sort(key=lambda kv: kv[1].get("lastUsed") or 0)
            victim_owner, victim = entries[0]
            if victim_owner != owner and victim.get("port"):
                close_instance_port(victim["port"])
                tracked = victim.get("pid")
                if tracked and tracked > 0:
                    try:
                        os.kill(tracked, signal.SIGKILL)
                    except Exception:
                        pass
                real = pid_listening_on(victim["port"])
                if real and real != tracked:
                    try:
                        os.kill(real, signal.SIGKILL)
                    except Exception:
                        pass
                reg.pop(victim_owner, None)
                write_registry(reg)
        return None

    url = with_registry_lock(_resolve)
    if url:
        return url
    return spawn_instance(owner)


def close_owner_instance(owner):
    def _close():
        reg = read_registry()
        info = reg.get(owner)
        if info:
            close_instance_port(info.get("port"))
            tracked = info.get("pid")
            if tracked and tracked > 0:
                try:
                    os.kill(tracked, signal.SIGKILL)
                except Exception:
                    pass
            real = pid_listening_on(info.get("port"))
            if real and real != tracked:
                try:
                    os.kill(real, signal.SIGKILL)
                except Exception:
                    pass
            reg.pop(owner, None)
            write_registry(reg)

    with_registry_lock(_close)


# ── Proxy ─────────────────────────────────────────────────────────────
def proxy_to(url, body_bytes, timeout_ms=120000):
    """POST the raw JSON body to a browser instance and return (status, body)."""
    req = urllib.request.Request(
        url,
        data=body_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_ms / 1000) as resp:
        return resp.status, resp.read()


def ensure_shared_instance():
    """Start the systemd default :9222 instance if it's down (old ensureServer)."""
    if is_alive(SHARED_INSTANCE_URL):
        return
    try:
        subprocess.run(
            ["systemctl", "--user", "start", "browser-agent.service"],
            timeout=10,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass
    for _ in range(15):
        if is_alive(SHARED_INSTANCE_URL):
            return
        time.sleep(1)


# ── HTTP handler ──────────────────────────────────────────────────────
class RouterHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_response(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/status":
            reg = read_registry()
            owners = {
                k: {
                    "port": v.get("port"),
                    "status": v.get("status"),
                    "pid": v.get("pid"),
                }
                for k, v in reg.items()
                if isinstance(v, dict)
            }
            self._json(
                {
                    "status": "ok",
                    "router_port": ROUTER_PORT,
                    "pool": f"{PORT_START}-{PORT_END}",
                    "max_instances": MAX_INSTANCES,
                    "owners": owners,
                }
            )
            return
        self._json({"status": "error", "message": "not found"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            self._json({"status": "error", "message": "empty body"}, 400)
            return
        body = self.rfile.read(content_length)
        owner = self.headers.get("X-Agent", "").strip()

        try:
            cmd = json.loads(body)
        except json.JSONDecodeError as e:
            self._json({"status": "error", "message": f"Invalid JSON: {e}"}, 400)
            return

        # Close is ALWAYS handled locally (never proxied) — it can only ever
        # close the caller's own window.
        if cmd.get("action") == "close":
            if not owner:
                # Shared agent: close the default instance (old behavior)
                status, resp = proxy_to(SHARED_INSTANCE_URL, body)
                self._proxy_response(status, resp)
                return
            close_owner_instance(owner)
            self._json(
                {
                    "status": "ok",
                    "closed": True,
                    "owner": owner,
                    "note": "Closed this agent's own browser window (isolated per-session).",
                }
            )
            return

        # Route
        if not owner:
            # Shared agents (orchestrator/build/plan/title/compaction)
            ensure_shared_instance()
            try:
                status, resp = proxy_to(SHARED_INSTANCE_URL, body)
                self._proxy_response(status, resp)
            except Exception as e:
                self._json(
                    {
                        "status": "error",
                        "message": f"shared instance proxy failed: {e}",
                    },
                    502,
                )
            return

        # Per-owner
        try:
            url = resolve_owner_url(owner)
        except RuntimeError as e:
            self._json({"status": "error", "message": str(e)}, 503)
            return
        except Exception as e:
            self._json({"status": "error", "message": f"resolve failed: {e}"}, 500)
            return

        try:
            status, resp = proxy_to(url, body)
            self._proxy_response(status, resp)
        except Exception as e:
            # Instance died between resolve and proxy — retry once via a fresh
            # resolve (respawns if needed), then give up.
            log(f"proxy to {url} failed: {e}; retrying via fresh resolve")
            try:
                url2 = resolve_owner_url(owner)
                status, resp = proxy_to(url2, body)
                self._proxy_response(status, resp)
            except Exception as e2:
                self._json(
                    {"status": "error", "message": f"proxy failed after retry: {e2}"},
                    502,
                )

    def log_message(self, format, *args):
        pass  # keep the router log quiet (per-owner server.log has detail)


def main():
    log(f"Starting browser router on port {ROUTER_PORT}")
    log(f"Pool: {PORT_START}-{PORT_END}, max {MAX_INSTANCES}, server: {SERVER_SCRIPT}")
    server = ThreadingHTTPServer(("127.0.0.1", ROUTER_PORT), RouterHandler)
    log(f"Router listening on 127.0.0.1:{ROUTER_PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
