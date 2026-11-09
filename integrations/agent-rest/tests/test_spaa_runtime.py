"""Focused SPAA tests: real SQLite, shared snapshots, asymmetry and HTTP auth."""
import http.client
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import agent_rest as spaa
from http.server import ThreadingHTTPServer

class SphereRuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old_db = spaa.DB_PATH
        self.old_token = spaa.TOKEN
        spaa.DB_PATH = str(Path(self.tmp.name) / "runtime.sqlite")
        spaa.TOKEN = "local-integration-test-token-at-least-32-characters"
        spaa.init_db()

    def tearDown(self):
        spaa.DB_PATH = self.old_db
        spaa.TOKEN = self.old_token
        self.tmp.cleanup()

    def test_shared_sphere_is_versioned_and_persistent(self):
        data = spaa.collect_sphere({
            "debian.test": lambda: {"ready": True},
            "ollama.test": lambda: {"model": "local"},
            "unavailable.test": lambda: (_ for _ in ()).throw(RuntimeError("secret")),
        })
        self.assertEqual(data["sourceCount"], 3)
        self.assertEqual(len(data["observations"]), 3)
        self.assertEqual(data["sphereId"], spaa.read_sphere()["sphereId"])
        self.assertEqual(data["sphereId"], spaa.read_sphere(data["sphereId"])["sphereId"])
        self.assertTrue(any(not row["ok"] for row in data["observations"]))
        self.assertNotIn("secret", json.dumps(data))

    def test_worker_asymmetry_and_shared_context(self):
        sphere = spaa.collect_sphere({"system": lambda: {"status": "ok"}})
        with spaa.db_session() as db:
            for agent, kind in (("Aurelius", "diagnostics"), ("Alex", "integration")):
                db.execute("INSERT INTO tasks(id,agent,kind,description,status,createdAt) "
                           "VALUES(?,?,?,?,?,?)",
                           (agent, agent, kind, "Check system", "queued", spaa.now()))
        first = spaa.claim_task("Aurelius")
        second = spaa.claim_task("Alex")
        self.assertEqual(first["sphereId"], sphere["sphereId"])
        self.assertEqual(second["sphereId"], sphere["sphereId"])
        self.assertEqual(json.loads(spaa.answer_task(first))["sphere"]["sphereId"],
                         sphere["sphereId"])
        self.assertIn("research", spaa.AGENTS["Aria"])
        self.assertNotIn("research", spaa.AGENTS["Alex"])
        self.assertIn("diagnostics", spaa.AGENTS["Aurelius"])
        self.assertNotIn("diagnostics", spaa.AGENTS["Astyria"])
        spaa.finish_task(first["id"], "completed", result="observed")
        with spaa.db_session() as db:
            self.assertEqual(db.execute("SELECT status FROM tasks WHERE id=?",
                             (first["id"],)).fetchone()["status"], "completed")

    def test_http_requires_token_and_enforces_capabilities(self):
        web = ThreadingHTTPServer(("127.0.0.1", 0), spaa.Handler)
        thread = threading.Thread(target=web.serve_forever, daemon=True)
        thread.start()
        def request(method, path, body=None, token=True):
            conn = http.client.HTTPConnection("127.0.0.1", web.server_port, timeout=4)
            headers = {"Content-Type": "application/json"}
            if token:
                headers["Authorization"] = "Bearer " + spaa.TOKEN
            try:
                conn.request(method, path, json.dumps(body) if body is not None else None,
                             headers=headers)
                response = conn.getresponse()
                return response.status, json.loads(response.read())
            finally:
                conn.close()
        try:
            self.assertEqual(request("GET", "/sphere", token=False)[0], 401)
            spaa.collect_sphere({"system": lambda: {"state": "ok"}})
            status, sphere = request("GET", "/sphere")
            self.assertEqual(status, 200)
            self.assertEqual(sphere["sourceCount"], 1)
            status, workers = request("GET", "/sphere/workers")
            self.assertEqual(status, 200)
            self.assertEqual(len(workers["workers"]), 4)
            self.assertTrue(all(not x["identityVerified"] for x in workers["workers"]))
            status, error = request("POST", "/tasks", {
                "agent": "Astyria", "kind": "diagnostics", "description": "Wrong kind"})
            self.assertEqual(status, 400)
            status, task = request("POST", "/tasks", {
                "agent": "Aria", "kind": "research", "description": "Review observation"})
            self.assertEqual(status, 202)
            self.assertEqual(task["kind"], "research")
            self.assertEqual(spaa.claim_task("Aria")["id"], task["id"])
            self.assertIsNone(spaa.claim_task("Alex"))
        finally:
            web.shutdown()
            web.server_close()
            thread.join(timeout=3)

    def test_schema_migration_and_recovery(self):
        with spaa.db_session() as db:
            db.execute("INSERT INTO tasks(id,agent,description,status,createdAt,kind) "
                       "VALUES(?,?,?,?,?,?)",
                       ("abandoned", "Aria", "Restart work", "running", spaa.now(), "analysis"))
        spaa.init_db()
        with spaa.db_session() as db:
            status = db.execute("SELECT status FROM tasks WHERE id='abandoned'").fetchone()[0]
        self.assertEqual(status, "queued")

if __name__ == "__main__":
    unittest.main()
