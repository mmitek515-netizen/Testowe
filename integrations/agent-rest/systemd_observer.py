"""Read-only spherical inventory of Linux services and visible processes.

Each systemd service is represented as an observation node. This does not alter
systemd, the Linux kernel, or native daemon scheduling. In Docker the scanner
observes only its process namespace; host systemd may be unavailable.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import os
import shutil
import subprocess
import time

MAX_NODES = 2048


def _stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _systemctl(*args):
    if not shutil.which("systemctl"):
        raise RuntimeError("systemctl_not_installed")
    result = subprocess.run(
        ["systemctl", *args, "--no-pager", "--no-legend", "--plain", "--full"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        timeout=5, check=False,
    )
    if result.returncode != 0:
        # Never expose stderr from unit managers to user-visible telemetry.
        raise RuntimeError("systemd_manager_unavailable")
    return result.stdout


def observe_systemd_services():
    """Collect ALL enumerable service units, including stopped and disabled units.

    Executes two fixed, read-only systemctl queries (no shell, no user commands).
    A unit's registered/active state is not proof of model execution.
    """
    started = time.monotonic()
    loaded = {}
    for line in _systemctl("list-units", "--type=service", "--all").splitlines():
        parts = line.strip().removeprefix("● ").split(maxsplit=4)
        if len(parts) < 4 or not parts[0].endswith(".service"):
            continue
        name, load, active, sub = parts[:4]
        loaded[name] = {"name": name, "load": load, "active": active,
                        "sub": sub, "unitFileState": "unknown"}
    for line in _systemctl("list-unit-files", "--type=service").splitlines():
        parts = line.split()
        if len(parts) < 2 or not parts[0].endswith(".service"):
            continue
        name, state = parts[:2]
        entry = loaded.setdefault(name, {
            "name": name, "load": "not-loaded",
            "active": "inactive", "sub": "not-running",
            "unitFileState": "unknown",
        })
        entry["unitFileState"] = state

    names = sorted(loaded)
    bounded = [loaded[name] for name in names[:MAX_NODES]]
    return {
        "scope": "visible-systemd-manager",
        "coverage": "systemd-managed-service-units",
        "observedAt": _stamp(),
        "durationMs": round((time.monotonic() - started) * 1000),
        "total": len(names),
        "truncated": len(names) > MAX_NODES,
        "counts": {
            "active": sum(x["active"] == "active" for x in loaded.values()),
            "inactive": sum(x["active"] == "inactive" for x in loaded.values()),
            "failed": sum(x["active"] == "failed" for x in loaded.values()),
            "other": sum(x["active"] not in ("active", "inactive", "failed")
                         for x in loaded.values()),
        },
        "nodes": bounded,
    }


def observe_procfs():
    """Visible processes of the CURRENT PID namespace, not necessarily the host.

    Processes are not all daemons: we do not falsely classify them as services.
    No command lines, environment variables, credentials, or memory are read.
    """
    proc = Path("/proc")
    if not proc.is_dir():
        raise RuntimeError("procfs_unavailable")
    started = time.monotonic()
    nodes = []
    total = 0
    unreadable = 0
    for item in sorted(proc.iterdir(), key=lambda p: (not p.name.isdigit(), int(p.name) if p.name.isdigit() else 0)):
        if not item.name.isdigit():
            continue
        try:
            name = (item / "comm").read_text(encoding="utf-8", errors="replace").strip()[:64]
        except (OSError, PermissionError):
            unreadable += 1
            continue
        total += 1
        if len(nodes) < MAX_NODES:
            nodes.append({"pid": int(item.name), "name": name})
    return {
        "scope": "current-process-namespace",
        "coverage": "readable-process-names-not-daemon-classification",
        "observedAt": _stamp(),
        "durationMs": round((time.monotonic() - started) * 1000),
        "total": total,
        "unreadable": unreadable,
        "truncated": total > MAX_NODES,
        "nodes": nodes,
    }
