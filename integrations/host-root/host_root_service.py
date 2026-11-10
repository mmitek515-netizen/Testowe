#!/usr/bin/env python3
"""Opt-in real Linux-host root command executor for Testowe.

Runs ONLY as a local systemd service over a Unix-domain socket.
No TCP listener, no bearer secret in URL, no simulated results.
The Node API retains operator authentication and forwards via socket.
"""
import hashlib
import json
import os
import socketserver
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SOCKET = os.environ.get("TESTOWE_ROOT_SOCKET", "/run/testowe-root/cli.sock")
WORKDIR = os.environ.get("TESTOWE_ROOT_CWD", "/var/lib/testowe")
MAX_INPUT = 8192
MAX_OUTPUT = 65536
TIMEOUT = 20

class CommandHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.request.settimeout(30)
        try:
            raw = self.rfile.readline(MAX_INPUT * 2 + 1)
            request = json.loads(raw)
            if request.get("operation") == "status":
                self.wfile.write(json.dumps({
                    "uid": os.geteuid(),
                    "isRoot": os.geteuid() == 0,
                    "scope": "linux-host-root",
                    "cwd": WORKDIR,
                    "executable": "/bin/bash",
                    "interactivePty": False
                }).encode() + b"\n")
                return
            cmd = request.get("command")
            if not isinstance(cmd, str) or not cmd.strip() or len(cmd) > MAX_INPUT or "\0" in cmd:
                raise ValueError("invalid_command")
            if os.geteuid() != 0:
                raise PermissionError("root_service_not_running_as_uid_0")
            start = time.monotonic()
            env = {
                "PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
                "LANG": "C.UTF-8",
                "TERM": "dumb",
                "HOME": "/root",
            }
            # Subprocess has real host UID 0 and real host namespaces.
            try:
                process = subprocess.run(
                    ["/bin/bash", "-lc", cmd],
                    cwd=WORKDIR,
                    env=env,
                    text=True,
                    capture_output=True,
                    timeout=TIMEOUT,
                    check=False,
                )
                result = {
                    "stdout": process.stdout[:MAX_OUTPUT],
                    "stderr": process.stderr[:MAX_OUTPUT],
                    "exitCode": process.returncode,
                    "signal": None,
                    "timedOut": False,
                    "truncated": len(process.stdout) + len(process.stderr) > MAX_OUTPUT,
                }
            except subprocess.TimeoutExpired as exc:
                result = {
                    "stdout": (exc.stdout or b"").decode("utf-8", "replace")[:MAX_OUTPUT] if isinstance(exc.stdout, bytes) else (exc.stdout or "")[:MAX_OUTPUT],
                    "stderr": (exc.stderr or b"").decode("utf-8", "replace")[:MAX_OUTPUT] if isinstance(exc.stderr, bytes) else (exc.stderr or "")[:MAX_OUTPUT],
                    "exitCode": None,
                    "signal": "SIGKILL",
                    "timedOut": True,
                    "truncated": False,
                }
            result.update({
                "uid": os.geteuid(),
                "isRoot": True,
                "scope": "linux-host-root",
                "cwd": WORKDIR,
                "durationMs": round((time.monotonic() - start) * 1000),
            })
            # Write only a command hash to journald to avoid spilling secrets.
            print(json.dumps({
                "time": datetime.now(timezone.utc).isoformat(),
                "event": "host-root-command",
                "sha256": hashlib.sha256(cmd.encode()).hexdigest(),
                "exitCode": result["exitCode"],
                "timedOut": result["timedOut"],
            }), flush=True)
            self.wfile.write(json.dumps(result).encode() + b"\n")
        except Exception as exc:
            self.wfile.write(json.dumps({"error": type(exc).__name__, "message": str(exc)[:120]}).encode() + b"\n")

class Server(socketserver.ThreadingMixIn, socketserver.UnixStreamServer):
    daemon_threads = True
    allow_reuse_address = True

def main():
    if os.geteuid() != 0:
        raise SystemExit("Root service requires UID 0 on the actual Linux host.")
    folder = Path(SOCKET).parent
    folder.mkdir(mode=0o750, parents=True, exist_ok=True)
    Path(WORKDIR).mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.path.lexists(SOCKET):
        os.unlink(SOCKET)
    with Server(SOCKET, CommandHandler) as server:
        group = __import__("grp").getgrnam("testowe-cli").gr_gid
        os.chown(folder, 0, group)
        os.chmod(folder, 0o750)
        os.chown(SOCKET, 0, group)
        os.chmod(SOCKET, 0o660)
        print("Testowe root host Unix socket ready", flush=True)
        server.serve_forever()

if __name__ == "__main__":
    main()
