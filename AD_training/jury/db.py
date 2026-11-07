"""SQLite storage for the jury. One connection guarded by a lock: simple and
fast enough for a training game with a handful of teams."""

import json
from pathlib import Path
import sqlite3
import threading

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, ip TEXT NOT NULL, token TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS flags (
    flag TEXT PRIMARY KEY, team_id INTEGER NOT NULL, service TEXT NOT NULL,
    slot TEXT NOT NULL, round INTEGER NOT NULL, state TEXT NOT NULL, attack TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS flags_by_round ON flags (round);
CREATE TABLE IF NOT EXISTS checks (
    round INTEGER NOT NULL, team_id INTEGER NOT NULL, service TEXT NOT NULL,
    verdict TEXT NOT NULL, public TEXT NOT NULL, private TEXT NOT NULL,
    PRIMARY KEY (round, team_id, service)
);
CREATE TABLE IF NOT EXISTS steals (
    flag TEXT NOT NULL, attacker_id INTEGER NOT NULL, round INTEGER NOT NULL,
    points REAL NOT NULL, PRIMARY KEY (flag, attacker_id)
);
CREATE TABLE IF NOT EXISTS scores (
    team_id INTEGER NOT NULL, service TEXT NOT NULL, fp REAL NOT NULL,
    PRIMARY KEY (team_id, service)
);
"""


class DB:
    def __init__(self, path):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.conn = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
        self.conn.row_factory = sqlite3.Row
        with self.lock:
            if path != ":memory:":
                self.conn.execute("PRAGMA journal_mode=WAL")
            self.conn.executescript(SCHEMA)

    def close(self):
        with self.lock:
            self.conn.close()

    # -- generic helpers --------------------------------------------------- #
    def all(self, sql, params=()):
        with self.lock:
            return [dict(row) for row in self.conn.execute(sql, params)]

    def one(self, sql, params=()):
        with self.lock:
            row = self.conn.execute(sql, params).fetchone()
            return dict(row) if row else None

    def run(self, sql, params=()):
        with self.lock:
            self.conn.execute(sql, params)

    def transaction(self):
        return _Transaction(self)

    # -- meta ---------------------------------------------------------------- #
    def get_meta(self, key, default=None):
        row = self.one("SELECT value FROM meta WHERE key = ?", (key,))
        return json.loads(row["value"]) if row else default

    def set_meta(self, key, value):
        self.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
                 (key, json.dumps(value)))

    # -- setup --------------------------------------------------------------- #
    def sync_teams(self, cfg):
        with self.transaction():
            for team in cfg["teams"]:
                self.conn.execute(
                    "INSERT INTO teams (id, name, ip, token) VALUES (?, ?, ?, ?) "
                    "ON CONFLICT (id) DO UPDATE SET name = excluded.name, "
                    "ip = excluded.ip, token = excluded.token",
                    (team["id"], team["name"], team["ip"], team["token"]))
                for service in cfg["services"]:
                    self.conn.execute(
                        "INSERT OR IGNORE INTO scores (team_id, service, fp) VALUES (?, ?, ?)",
                        (team["id"], service, cfg["default_score"]))

    # -- rounds -------------------------------------------------------------- #
    def add_flag(self, flag, team_id, service, slot, round_no, state, attack):
        self.run("INSERT INTO flags (flag, team_id, service, slot, round, state, attack) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (flag, team_id, service, slot, round_no,
                  json.dumps(state, ensure_ascii=False), json.dumps(attack, ensure_ascii=False)))

    def random_live_flag(self, team_id, service, round_no, lifetime, exclude):
        """A flag from an earlier, still-live round to verify with `get`."""
        return self.one(
            "SELECT * FROM flags WHERE team_id = ? AND service = ? AND round < ? "
            "AND round > ? AND flag != ? ORDER BY RANDOM() LIMIT 1",
            (team_id, service, round_no, round_no - lifetime, exclude))

    def add_check(self, round_no, team_id, service, verdict, public, private):
        self.run("INSERT OR REPLACE INTO checks VALUES (?, ?, ?, ?, ?, ?)",
                 (round_no, team_id, service, verdict, public, private))


class _Transaction:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        self.db.lock.acquire()
        self.db.conn.execute("BEGIN IMMEDIATE")
        return self.db.conn

    def __exit__(self, exc_type, *_):
        try:
            self.db.conn.execute("ROLLBACK" if exc_type else "COMMIT")
        finally:
            self.db.lock.release()
