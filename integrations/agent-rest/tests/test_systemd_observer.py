"""Contract tests for systemd/procfs SPAA collectors; no live systemd needed."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import systemd_observer as observer


class LinuxSphereTests(unittest.TestCase):
    def test_systemd_collects_running_stopped_and_disabled_units(self):
        def fake_systemctl(*args):
            if args[0] == "list-units":
                return (
                    "sshd.service loaded active running OpenSSH service\n"
                    "broken.service loaded failed failed Broken service\n"
                    "● failed.service loaded failed failed Failed unit\n"
                )
            return (
                "sshd.service enabled enabled\n"
                "broken.service disabled enabled\n"
                "failed.service static -\n"
                "sleeping.service disabled enabled\n"
            )

        with patch.object(observer, "_systemctl", side_effect=fake_systemctl):
            snapshot = observer.observe_systemd_services()
        self.assertEqual(snapshot["total"], 4)
        self.assertEqual(snapshot["counts"], {
            "active": 1, "inactive": 1, "failed": 2, "other": 0,
        })
        self.assertEqual(snapshot["scope"], "visible-systemd-manager")
        self.assertEqual(
            next(x for x in snapshot["nodes"] if x["name"] == "sleeping.service")["unitFileState"],
            "disabled",
        )
        self.assertFalse(snapshot["truncated"])

    def test_fixed_commands_are_read_only_and_do_not_use_shell(self):
        class Result:
            returncode = 0
            stdout = "demo.service loaded active running Demo\n"
        with patch.object(observer.shutil, "which", return_value="/usr/bin/systemctl"):
            with patch.object(observer.subprocess, "run", return_value=Result()) as mock:
                observer._systemctl("list-units", "--type=service", "--all")
        args, kwargs = mock.call_args
        self.assertEqual(args[0][0:4], ["systemctl", "list-units", "--type=service", "--all"])
        self.assertFalse(kwargs["check"])
        self.assertNotIn("shell", kwargs)

    def test_systemd_absence_is_not_reported_as_online(self):
        with patch.object(observer.shutil, "which", return_value=None):
            with self.assertRaisesRegex(RuntimeError, "systemctl_not_installed"):
                observer.observe_systemd_services()

    def test_procfs_reports_its_namespace_not_claimed_daemons(self):
        sample = observer.observe_procfs()
        self.assertEqual(sample["scope"], "current-process-namespace")
        self.assertIn("not-daemon-classification", sample["coverage"])
        self.assertGreaterEqual(sample["total"], 1)
        self.assertTrue(all("name" in x and "pid" in x for x in sample["nodes"]))
        self.assertFalse(any("cmdline" in x or "environment" in x for x in sample["nodes"]))


if __name__ == "__main__":
    unittest.main()
