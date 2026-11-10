"""Publish atomic, bounded Linux host observations for containerized SPAA.

This is a read-only collector running as the unprivileged debian13 user on
the Linux host. The resulting JSON file can be mounted read-only into the
container; no host shell, systemd D-Bus control or TCP listener is exposed.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import time
import uuid

from systemd_observer import observe_procfs, observe_systemd_services

SCHEMA_VERSION = 1
MAX_SNAPSHOT_BYTES = 1024 * 1024


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def collect_host_snapshot(probes=None):
    probes = probes or {
        "systemd": observe_systemd_services,
        "procfs": observe_procfs,
    }

    def read(item):
        name, func = item
        try:
            return name, {"ok": True, "data": func()}
        except Exception as exc:
            return name, {"ok": False, "error": type(exc).__name__}

    with ThreadPoolExecutor(max_workers=max(1, min(4, len(probes)))) as pool:
        sources = dict(pool.map(read, probes.items()))
    return {
        "schemaVersion": SCHEMA_VERSION,
        "snapshotId": str(uuid.uuid4()),
        "observedAt": _now(),
        "scope": "linux-host-collector",
        "sources": sources,
    }


def publish_host_snapshot(destination: Path, snapshot):
    destination = Path(destination)
    destination.parent.mkdir(mode=0o750, parents=True, exist_ok=True)
    raw = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(raw) > MAX_SNAPSHOT_BYTES:
        raise ValueError("host_snapshot_too_large")
    path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", prefix=".host-sphere-", suffix=".tmp",
            dir=destination.parent, delete=False
        ) as output:
            path = Path(output.name)
            os.fchmod(output.fileno(), 0o640)
            output.write(raw)
            output.flush()
            os.fsync(output.fileno())
        os.replace(path, destination)
    finally:
        if path is not None:
            path.unlink(missing_ok=True)


def read_host_snapshot(source: Path, max_age_seconds=60, clock=None):
    source = Path(source)
    with source.open("rb") as f:
        raw = f.read(MAX_SNAPSHOT_BYTES + 1)
    if len(raw) > MAX_SNAPSHOT_BYTES:
        raise ValueError("host_snapshot_too_large")
    snapshot = json.loads(raw)
    if (not isinstance(snapshot, dict) or
            snapshot.get("schemaVersion") != SCHEMA_VERSION or
            snapshot.get("scope") != "linux-host-collector" or
            not isinstance(snapshot.get("sources"), dict)):
        raise ValueError("invalid_host_snapshot")
    observed = datetime.fromisoformat(snapshot["observedAt"])
    if observed.tzinfo is None:
        raise ValueError("host_snapshot_missing_timezone")
    age = (clock or datetime.now(timezone.utc)) - observed
    if age.total_seconds() < -10 or age.total_seconds() > max_age_seconds:
        raise ValueError("stale_host_snapshot")
    for key in ("systemd", "procfs"):
        entry = snapshot["sources"].get(key)
        if not isinstance(entry, dict) or type(entry.get("ok")) is not bool:
            raise ValueError("invalid_host_snapshot_sources")
        if entry["ok"] and not isinstance(entry.get("data"), dict):
            raise ValueError("invalid_host_snapshot_source_data")
    return snapshot


def main():
    destination = Path(os.environ.get(
        "SPAA_HOST_SNAPSHOT_PATH", "/var/lib/debian13/observations/host-sphere.json"
    ))
    interval = max(5, min(300, int(os.environ.get("SPAA_HOST_REFRESH_SECONDS", "15"))))
    while True:
        publish_host_snapshot(destination, collect_host_snapshot())
        time.sleep(interval)


if __name__ == "__main__":
    main()
