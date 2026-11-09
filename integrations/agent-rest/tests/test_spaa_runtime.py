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

    def test_all_to_all_mesh_reuses_one_sphere_and_records_receipts(self):
        sphere = spaa.collect_sphere({"system": lambda: {"ready": True}})
        topology = spaa.mesh_topology()
        self.assertEqual(topology["sphereId"], sphere["sphereId"])
        self.assertEqual(len(topology["members"]), 4)
        self.assertEqual(len(topology["edges"]), 12)
        self.assertEqual(len({(e["from"], e["to"]) for e in topology["edges"]}), 12)
        sent = spaa.publish_mesh_message("Alex", "Task completed", sphere_id=sphere["sphereId"])
        self.assertEqual(set(sent["recipients"]), {"Aria", "Astyria", "Aurelius"})
        self.assertEqual(sent["queued"], 3)
        for peer in sent["recipients"]:
            self.assertIn("Task completed", [m["body"] for m in spaa.drain_inbox(peer)])
            self.assertEqual(spaa.drain_inbox(peer), [])
            self.assertEqual(spaa.peer_context(peer)[-1]["sphereId"], sphere["sphereId"])
        self.assertEqual(spaa.mesh_topology()["messagesStored"], 3)
        self.assertTrue(all(m["state"] == "delivered" for m in spaa.recent_mesh_messages()))

    def test_mesh_does_not_permit_spoofing_or_infinite_echo(self):
        with self.assertRaises(ValueError):
            spaa.publish_mesh_message("unknown-executor", "Spoof")
        with self.assertRaises(ValueError):
            spaa.publish_mesh_message("Aria", "self", recipient="Aria")
        with self.assertRaises(ValueError):
            spaa.publish_mesh_message("Alex", "X" * 1025)
        event = spaa.publish_mesh_message("Aria", "Peer status")
        self.assertEqual(event["queued"], 3)
        for name in event["recipients"]:
            spaa.drain_inbox(name)
        # Receiving a message is not equivalent to executing a model or replying.
        self.assertEqual(spaa.mesh_topology()["messagesStored"], 3)

    def test_operator_mesh_api_is_authenticated_and_fans_out(self):
        web = ThreadingHTTPServer(("127.0.0.1", 0), spaa.Handler)
        thread = threading.Thread(target=web.serve_forever, daemon=True)
        thread.start()
        def send(method, path, body=None, authorized=True):
            connection = http.client.HTTPConnection("127.0.0.1", web.server_port, timeout=5)
            headers = {"Content-Type": "application/json"}
            if authorized:
                headers["Authorization"] = "Bearer " + spaa.TOKEN
            try:
                connection.request(method, path,
                                   json.dumps(body) if body is not None else None,
                                   headers=headers)
                reply = connection.getresponse()
                return reply.status, json.loads(reply.read())
            finally:
                connection.close()
        try:
            spaa.collect_sphere({"system": lambda: {"ready": True}})
            self.assertEqual(send("GET", "/mesh", authorized=False)[0], 401)
            status, topology = send("GET", "/mesh")
            self.assertEqual(status, 200)
            self.assertEqual(topology["directedLinks"], 12)
            status, output = send("POST", "/mesh/send", {
                "sender": "Alex", "recipient": "*", "body": "Everyone synchronize"})
            self.assertEqual(status, 202)
            self.assertEqual(output["sender"], "operator")
            self.assertEqual(output["queued"], 4)
            self.assertEqual(len(spaa.recent_mesh_messages()), 4)
        finally:
            web.shutdown()
            web.server_close()
            thread.join(timeout=4)

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
