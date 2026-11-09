"""SPAA: spherical, polymorphic, asynchronous, asymmetric local worker daemon.

This is an actual task processor with a persistent SQLite queue. Four *local*
routing labels are NOT authenticated original external AI agent identities.
No shell, root, filesystem write tool, repository mutation or arbitrary URLs.
All active workers receive the same last committed observation sphere.
"""
from __future__ import annotations

import hmac
import json
import os
import sqlite3
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

AGENTS = {
    "Aria": ("analysis", "research"),
    "Alex": ("analysis", "integration"),
    "Astyria": ("analysis", "research"),
    "Aurelius": ("analysis", "diagnostics", "integration"),
}
MODEL = os.getenv("AGENT_MODEL", "llama2-uncensored:7b")
OLLAMA = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
DEBIAN = os.getenv("DEBIAN13_SYSTEM_API_URL", "http://debian13-system:8080").rstrip("/")
DEBIAN_TOKEN = os.getenv("DEBIAN13_API_TOKEN", "")
BACKEND = os.getenv("SPAA_BACKEND_URL", "http://ai-linux-control:3000").rstrip("/")
TOKEN = os.getenv("AGENT_API_TOKEN", "")
PORT = int(os.getenv("AGENT_API_PORT", "8091"))
DB_PATH = os.getenv("AGENT_DB_PATH", "/data/agent_tasks.sqlite3")
REFRESH_SECONDS = max(5, int(os.getenv("SPAA_REFRESH_SECONDS", "15")))
DB_LOCK = threading.RLock()
MODEL_SEMAPHORE = threading.BoundedSemaphore(1)
STOP = threading.Event()


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect():
    db = sqlite3.connect(DB_PATH, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=30000")
    return db


def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    with DB_LOCK, connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, agent TEXT NOT NULL, description TEXT NOT NULL,
            status TEXT NOT NULL, createdAt TEXT NOT NULL,
            startedAt TEXT, completedAt TEXT, result TEXT, error TEXT
        );
        CREATE TABLE IF NOT EXISTS spheres (
            id TEXT PRIMARY KEY, observedAt TEXT NOT NULL, sourceCount INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS observations (
            sphereId TEXT NOT NULL, source TEXT NOT NULL, ok INTEGER NOT NULL,
            observedAt TEXT NOT NULL, data TEXT, error TEXT,
            PRIMARY KEY(sphereId, source)
        );
        CREATE TABLE IF NOT EXISTS worker_status (
            name TEXT PRIMARY KEY, state TEXT NOT NULL, lastSeen TEXT NOT NULL,
            taskId TEXT, sphereId TEXT, kind TEXT, lastError TEXT
        );""")
        columns = {row["name"] for row in db.execute("PRAGMA table_info(tasks)")}
        if "kind" not in columns:
            db.execute("ALTER TABLE tasks ADD COLUMN kind TEXT NOT NULL DEFAULT 'analysis'")
        if "sphereId" not in columns:
            db.execute("ALTER TABLE tasks ADD COLUMN sphereId TEXT")
        # Tasks abandoned after a restart are retried instead of being marked complete.
        db.execute("UPDATE tasks SET status='queued', startedAt=NULL WHERE status='running'")
        for agent in AGENTS:
            db.execute("INSERT OR REPLACE INTO worker_status "
                       "(name,state,lastSeen,taskId,sphereId,kind,lastError) "
                       "VALUES (?, 'starting', ?,NULL,NULL,NULL,NULL)", (agent, now()))


def fetch_json(url, *, token="", timeout=4):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = Request(url, headers=headers, method="GET")
    with urlopen(req, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError("upstream_http_error")
        raw = response.read(262145)
    if len(raw) > 262144:
        raise ValueError("observation_response_too_large")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("invalid_observation")
    return data


def source_probes():
    """Static, bounded connectors. No user-controlled URLs or secrets in data."""
    def tags():
        raw = fetch_json(OLLAMA + "/api/tags")
        models = [m.get("name", "") for m in raw.get("models", []) if isinstance(m, dict)]
        return {"reachable": True, "model": MODEL, "installed": MODEL in models,
                "availableModels": models[:30]}

    def running():
        raw = fetch_json(OLLAMA + "/api/ps")
        return {"loadedModels": [m.get("name", "") for m in raw.get("models", [])
                                 if isinstance(m, dict)][:20]}

    def debian_health():
        return fetch_json(DEBIAN + "/healthz")

    def debian_diagnostics():
        if len(DEBIAN_TOKEN) < 32:
            raise ValueError("debian_token_not_configured")
        raw = fetch_json(DEBIAN + "/v1/diagnostics", token=DEBIAN_TOKEN)
        return {"service": raw.get("service"), "effectiveUid": raw.get("effectiveUid"),
                "workspaceWritable": raw.get("workspaceWritable"),
                "modelProviderConfigured": raw.get("providerConfigured")}

    def backend_health():
        raw = fetch_json(BACKEND + "/api/health")
        return {"status": raw.get("status"), "personas": raw.get("personas", [])}

    def local_tasks():
        with connect() as db:
            entries = db.execute("SELECT status, COUNT(*) AS n FROM tasks GROUP BY status").fetchall()
        return {"counts": {row["status"]: row["n"] for row in entries}}

    return {
        "ollama.models": tags, "ollama.loaded": running,
        "debian.health": debian_health, "debian.diagnostics": debian_diagnostics,
        "svl.health": backend_health, "tasks.queue": local_tasks,
    }


def collect_sphere(probes=None):
    """All sensors sampled concurrently, committed as ONE versioned shared view."""
    sources = probes if probes is not None else source_probes()
    sphere_id = str(uuid.uuid4())
    observed_at = now()

    def observe(item):
        name, probe = item
        try:
            return name, True, probe(), None, now()
        except Exception as exc:
            # Error CLASS only: do not expose internal URLs, credentials or network traces.
            return name, False, None, type(exc).__name__, now()

    with ThreadPoolExecutor(max_workers=min(8, max(1, len(sources)))) as pool:
        readings = list(pool.map(observe, sources.items()))
    with DB_LOCK, connect() as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("INSERT INTO spheres(id,observedAt,sourceCount) VALUES (?,?,?)",
                   (sphere_id, observed_at, len(sources)))
        for source, ok, data, error, collected_at in readings:
            db.execute("INSERT INTO observations(sphereId,source,ok,observedAt,data,error) "
                       "VALUES (?,?,?,?,?,?)", (sphere_id, source, int(ok), collected_at,
                                                json.dumps(data) if ok else None, error))
        stale = [row["id"] for row in db.execute(
            "SELECT id FROM spheres ORDER BY rowid DESC LIMIT -1 OFFSET 20"
        )]
        for ident in stale:
            db.execute("DELETE FROM observations WHERE sphereId=?", (ident,))
            db.execute("DELETE FROM spheres WHERE id=?", (ident,))
    return read_sphere(sphere_id)


def read_sphere(sphere_id=None):
    with connect() as db:
        if sphere_id:
            row = db.execute("SELECT * FROM spheres WHERE id=?", (sphere_id,)).fetchone()
        else:
            row = db.execute("SELECT * FROM spheres ORDER BY rowid DESC LIMIT 1").fetchone()
        if not row:
            return {"state": "not-collected", "sphereId": None, "observations": []}
        readings = db.execute("SELECT * FROM observations WHERE sphereId=? ORDER BY source",
                              (row["id"],)).fetchall()
    return {"state": "collected", "sphereId": row["id"], "observedAt": row["observedAt"],
            "sourceCount": row["sourceCount"],
            "observations": [{"source": x["source"], "ok": bool(x["ok"]),
                              "observedAt": x["observedAt"],
                              "data": json.loads(x["data"]) if x["data"] else None,
                              "error": x["error"]} for x in readings]}


def worker_state(agent, state, task=None, error=None):
    with DB_LOCK, connect() as db:
        db.execute("UPDATE worker_status SET state=?,lastSeen=?,taskId=?,sphereId=?,"
                   "kind=?,lastError=? WHERE name=?", (state, now(),
                   task.get("id") if task else None, task.get("sphereId") if task else None,
                   task.get("kind") if task else None, error, agent))


def list_workers():
    with connect() as db:
        rows = db.execute("SELECT * FROM worker_status ORDER BY name").fetchall()
    current = time.time()
    workers = []
    for row in rows:
        try:
            last = datetime.fromisoformat(row["lastSeen"]).timestamp()
        except (TypeError, ValueError):
            last = 0
        alive = current - last < max(45, REFRESH_SECONDS * 3)
        workers.append({
            "name": row["name"], "capabilities": list(AGENTS[row["name"]]),
            "state": row["state"] if alive else "stale",
            "lastSeen": row["lastSeen"], "sphereId": row["sphereId"],
            "taskId": row["taskId"], "kind": row["kind"], "online": alive,
            "identityVerified": False, "lastError": row["lastError"],
        })
    return workers


def claim_task(agent):
    kinds = AGENTS[agent]
    placeholders = ",".join("?" for _ in kinds)
    with DB_LOCK, connect() as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM tasks WHERE status='queued' AND agent=? "
                         + "AND kind IN (" + placeholders + ") "
                         + "ORDER BY createdAt,id LIMIT 1", (agent, *kinds)).fetchone()
        if not row:
            return None
        latest = db.execute("SELECT id FROM spheres ORDER BY rowid DESC LIMIT 1").fetchone()
        sphere_id = latest["id"] if latest else None
        db.execute("UPDATE tasks SET status='running',startedAt=?,sphereId=? WHERE id=?",
                   (now(), sphere_id, row["id"]))
        result = dict(row)
        result["sphereId"] = sphere_id
        return result


def finish_task(task_id, state, result=None, error=None):
    with DB_LOCK, connect() as db:
        db.execute("UPDATE tasks SET status=?,result=?,error=?,completedAt=? WHERE id=?",
                   (state, result, error, now(), task_id))


def answer_task(task):
    sphere = read_sphere(task.get("sphereId"))
    if task["kind"] == "diagnostics":
        # Different executor implementation: deterministic diagnostics, NO model call.
        return json.dumps({"kind": "diagnostics", "sphere": sphere},
                          ensure_ascii=False)[:32000]
    prompt = {
        "analysis": "Analyze the user request based on the observable system state.",
        "research": "Research only the attached observations. You have no browser or web access.",
        "integration": "Analyze integration steps; do not claim to execute commands or alter files.",
    }[task["kind"]]
    context = json.dumps(sphere, ensure_ascii=False)[:12000]
    payload = json.dumps({
        "model": MODEL, "stream": False,
        "messages": [
            {"role": "system", "content": (
                "You are a local SPAA task worker, NOT the original external agent. "
                "You have a shared spherical snapshot of ONLY connected sources. "
                + prompt + " State uncertainty, never claim host/root/GitHub execution.")},
            {"role": "user", "content": "Shared observation sphere:\n" + context
             + "\nTask (agent routing label " + task["agent"] + "): " + task["description"]}
        ],
    }).encode("utf-8")
    req = Request(OLLAMA + "/api/chat", data=payload,
                  headers={"Content-Type": "application/json"}, method="POST")
    with MODEL_SEMAPHORE, urlopen(req, timeout=360) as response:
        raw = response.read(262145)
    if len(raw) > 262144:
        raise ValueError("model_response_too_large")
    parsed = json.loads(raw)
    response_text = parsed.get("message", {}).get("content")
    if not isinstance(response_text, str) or not response_text.strip():
        raise ValueError("empty_model_response")
    return response_text[:32000]


def worker_loop(agent):
    while not STOP.is_set():
        task = None
        try:
            task = claim_task(agent)
            if task is None:
                worker_state(agent, "idle")
                STOP.wait(2)
                continue
            worker_state(agent, "running", task)
            result = answer_task(task)
            finish_task(task["id"], "completed", result=result)
            worker_state(agent, "completed", task)
        except Exception as exc:
            if task:
                finish_task(task["id"], "failed", error=type(exc).__name__)
            worker_state(agent, "failed", task, type(exc).__name__)
            STOP.wait(3)


def observer_loop():
    while not STOP.is_set():
        try:
            collect_sphere()
        except Exception as exc:
            print("SPAA observation error: " + type(exc).__name__, flush=True)
        STOP.wait(REFRESH_SECONDS)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def send_json(self, status, value):
        raw = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def authorized(self):
        authorization = self.headers.get("Authorization", "")
        return bool(TOKEN) and hmac.compare_digest(authorization, "Bearer " + TOKEN)

    def do_GET(self):
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        if self.path == "/health":
            sphere = read_sphere()
            models = next((x for x in sphere["observations"]
                           if x["source"] == "ollama.models"), None)
            model_ready = bool(models and models["ok"] and models["data"]["installed"])
            workers = list_workers()
            return self.send_json(200, {
                "service": "spaa-spherical-worker-daemon", "spherical": True,
                "polymorphic": True, "asymmetric": True, "asynchronous": True,
                "agentIdentityVerified": False, "persistentQueue": True,
                "model": MODEL, "ollamaReachable": bool(models and models["ok"]),
                "modelInstalled": model_ready, "onlineWorkerCount":
                    sum(1 for worker in workers if worker["online"]),
                "ready": model_ready and len(workers) == len(AGENTS)
                         and all(worker["online"] for worker in workers),
                "sphereId": sphere.get("sphereId"),
            })
        if self.path == "/agents":
            return self.send_json(200, {"agents": list_workers()})
        if self.path in ("/sphere", "/sphere/observations"):
            return self.send_json(200, read_sphere())
        if self.path == "/sphere/workers":
            return self.send_json(200, {"workers": list_workers(),
                                        "sharedSphereId": read_sphere().get("sphereId")})
        if self.path == "/tasks":
            with connect() as db:
                rows = db.execute("SELECT * FROM tasks ORDER BY createdAt DESC LIMIT 100").fetchall()
            return self.send_json(200, {"tasks": [dict(row) for row in rows]})
        if self.path.startswith("/tasks/"):
            with connect() as db:
                row = db.execute("SELECT * FROM tasks WHERE id=?",
                                 (self.path[len("/tasks/"):],)).fetchone()
            return self.send_json(200 if row else 404,
                                  dict(row) if row else {"error": "not_found"})
        return self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        if self.path == "/sphere/refresh":
            # Read-only probes. A manual refresh never executes a shell command.
            return self.send_json(200, collect_sphere())
        if self.path != "/tasks":
            return self.send_json(404, {"error": "not_found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16384:
                return self.send_json(413, {"error": "invalid_payload_size"})
            payload = json.loads(self.rfile.read(length))
            agent, description = payload.get("agent"), payload.get("description")
            kind = payload.get("kind", "analysis")
            if (agent not in AGENTS or kind not in AGENTS[agent]
                    or not isinstance(description, str)
                    or not 0 < len(description) <= 8000):
                return self.send_json(400, {"error": "invalid_task_or_capability"})
        except (ValueError, TypeError, AttributeError):
            return self.send_json(400, {"error": "invalid_json"})
        task = {"id": str(uuid.uuid4()), "agent": agent,
                "description": description, "kind": kind,
                "status": "queued", "createdAt": now()}
        with DB_LOCK, connect() as db:
            db.execute("INSERT INTO tasks (id,agent,description,kind,status,createdAt) "
                       "VALUES (?,?,?,?,?,?)",
                       (task["id"], agent, description, kind, "queued", task["createdAt"]))
        return self.send_json(202, task)


def main():
    if len(TOKEN) < 32:
        raise SystemExit("AGENT_API_TOKEN needs 32 or more characters")
    init_db()
    threading.Thread(target=observer_loop, name="spaa-observer", daemon=True).start()
    for agent in AGENTS:
        threading.Thread(target=worker_loop, args=(agent,), name="spaa-" + agent,
                         daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
