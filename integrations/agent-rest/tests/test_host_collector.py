"""Regression tests for the read-only Linux host-sphere relay."""
from datetime import datetime, timedelta, timezone
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent_rest as spaa
import host_collector as collector


class HostSphereTests(unittest.TestCase):
    def test_both_sensors_sampled_and_saved_atomically(self):
        with tempfile.TemporaryDirectory() as tmp:
            destination = Path(tmp) / "host-sphere.json"
            snapshot = collector.collect_host_snapshot({
                "systemd": lambda: {"scope": "visible-systemd-manager", "total": 3},
                "procfs": lambda: {"scope": "current-process-namespace", "total": 12},
            })
            self.assertEqual(set(snapshot["sources"]), {"systemd", "procfs"})
            self.assertTrue(all(entry["ok"] for entry in snapshot["sources"].values()))
            collector.publish_host_snapshot(destination, snapshot)
            self.assertEqual(destination.stat().st_mode & 0o777, 0o640)
            actual = collector.read_host_snapshot(destination)
            self.assertEqual(actual["snapshotId"], snapshot["snapshotId"])
            self.assertEqual(actual["sources"]["systemd"]["data"]["total"], 3)
            self.assertEqual(list(Path(tmp).glob("*.tmp")), [])
            with patch.object(spaa, "HOST_SNAPSHOT_FILE", str(destination)):
                sources = spaa.source_probes()
                self.assertIn("linux.host.snapshot", sources)
                self.assertEqual(sources["linux.host.snapshot"]()["snapshotId"], snapshot["snapshotId"])

    def test_failed_sensor_is_not_marked_online(self):
        def unavailable():
            raise RuntimeError("secret_data_must_not_be_exposed")
        snapshot = collector.collect_host_snapshot({
            "systemd": unavailable,
            "procfs": lambda: {"total": 1}
        })
        self.assertFalse(snapshot["sources"]["systemd"]["ok"])
        self.assertEqual(snapshot["sources"]["systemd"]["error"], "RuntimeError")
        self.assertNotIn("secret_data_must_not_be_exposed", json.dumps(snapshot))

    def test_stale_and_future_data_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "host.json"
            snapshot = collector.collect_host_snapshot({
                "systemd": lambda: {"total": 1},
                "procfs": lambda: {"total": 1}
            })
            collector.publish_host_snapshot(dest, snapshot)
            stamp = datetime.fromisoformat(snapshot["observedAt"])
            with self.assertRaisesRegex(ValueError, "stale_host_snapshot"):
                collector.read_host_snapshot(dest, clock=stamp + timedelta(seconds=61))
            with self.assertRaisesRegex(ValueError, "stale_host_snapshot"):
                collector.read_host_snapshot(dest, clock=stamp - timedelta(seconds=12))

    def test_compact_context_preserves_every_sensor_and_version(self):
        sphere = {
            "state": "collected", "sphereId": "same-generation",
            "observedAt": "2026-11-10T00:00:00+00:00", "sourceCount": 3,
            "observations": [
                {"source": "linux.systemd.services", "ok": True,
                 "observedAt": "2026-11-10T00:00:00+00:00",
                 "data": {"total": 2000, "counts": {"active": 1990, "failed": 10},
                          "nodes": [{"name": "foo.service"}] * 2000}},
                {"source": "linux.host.snapshot", "ok": True,
                 "observedAt": "2026-11-10T00:00:00+00:00",
                 "data": {
                     "scope": "linux-host-collector", "snapshotId": "host-gen",
                     "sources": {
                         "systemd": {"ok": True, "data": {"total": 2000}},
                         "procfs": {"ok": False, "error": "RuntimeError"}
                     }
                 }},
                {"source": "ollama.models", "ok": False, "error": "TimeoutError"}
            ],
        }
        brief = spaa.compact_sphere_context(sphere)
        self.assertEqual(brief["sphereId"], "same-generation")
        self.assertEqual(len(brief["observations"]), 3)
        self.assertEqual(brief["observations"][0]["data"]["total"], 2000)
        self.assertEqual(
            brief["observations"][1]["data"]["sources"]["procfs"]["ok"], False
        )
        self.assertLess(len(json.dumps(brief)), 3000)
        self.assertEqual(len(sphere["observations"][0]["data"]["nodes"]), 2000)

    def test_malformed_payload_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "host.json"
            dest.write_text('{"schemaVersion": 1, "scope": "untrusted"}')
            with self.assertRaisesRegex(ValueError, "invalid_host_snapshot"):
                collector.read_host_snapshot(dest)


if __name__ == "__main__":
    unittest.main()
