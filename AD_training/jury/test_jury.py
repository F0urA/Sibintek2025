"""Jury tests without Docker: a fake checker stands in for the real services.

Run: python3 -m unittest discover -s AD_training/jury -v
"""

import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parent))

import config  # noqa: E402  (puts AD_training on sys.path for `checker`)
import checker  # noqa: E402
from db import DB  # noqa: E402
from rounds import Game, new_flag  # noqa: E402
import scoring  # noqa: E402
import submit  # noqa: E402
from submit import Submitter, TCPServer  # noqa: E402
from web import HTTPServer, attack_data, scoreboard  # noqa: E402

FAKE_CHECKER = r'''
import json, os, sys
args = sys.argv[1:]
action = args[0]
opts = dict(zip(args[2::2], args[3::2]))
forced = os.environ.get("FAKE_VERDICT", "UP")
if forced != "UP":
    print(json.dumps({"status": "fail", "verdict": forced, "public": "forced", "error": "x"}))
    sys.exit(1)
if action == "put":
    print(json.dumps({"status": "ok", "verdict": "UP", "state": {"flag": opts["--flag"]},
                      "attack_data": {"id": 42}}))
elif action == "get":
    ok = json.loads(opts["--state"])["flag"] == opts["--flag"]
    print(json.dumps({"status": "ok" if ok else "fail",
                      "verdict": "UP" if ok else "CORRUPT", "public": "Flag missing"}))
else:
    print(json.dumps({"status": "ok", "verdict": "UP"}))
'''


class Clock:
    def __init__(self, start=1_000_000.0):
        self.value = start

    def __call__(self):
        return self.value


def make_cfg(**overrides):
    raw = {"round_time": 60, "flag_lifetime": 3, "checker_timeout": 10,
           "services": {"news": {}, "smp": {}},
           "listen": {"http": "127.0.0.1:0", "tcp": "127.0.0.1:0"},
           "teams": [{"name": "A", "ip": "10.0.0.1", "token": "token-a"},
                     {"name": "B", "ip": "10.0.0.2", "token": "token-b"}]}
    raw.update(overrides)
    return config.validate(raw)


class JuryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.fake = Path(cls.tmp.name) / "fake_checker.py"
        cls.fake.write_text(FAKE_CHECKER)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def setUp(self):
        os.environ.pop("FAKE_VERDICT", None)
        self.clock = Clock()
        self.cfg = make_cfg(start_time=self.clock.value)
        self.game = Game(self.cfg, DB(":memory:"), checker=self.fake, now=self.clock)
        self.submitter = Submitter(self.game)

    def tearDown(self):
        self.game.db.close()

    def flag_of(self, team_id, round_no=None):
        sql = "SELECT flag FROM flags WHERE team_id = ?"
        params = [team_id]
        if round_no is not None:
            sql += " AND round = ?"
            params.append(round_no)
        return self.game.db.one(sql + " LIMIT 1", params)["flag"]

    # -- rounds -------------------------------------------------------------- #
    def test_round_puts_and_checks(self):
        self.game.play_round(1)
        self.game.play_round(2)
        checks = self.game.db.all("SELECT verdict FROM checks")
        self.assertEqual(len(checks), 2 * 2 * 2)
        self.assertTrue(all(c["verdict"] == "UP" for c in checks))
        flags = self.game.db.all("SELECT * FROM flags")
        self.assertEqual(len(flags), 8)
        self.assertTrue(all(submit.FLAG_RE.fullmatch(f["flag"]) for f in flags))

    def test_down_counts_against_sla(self):
        self.game.play_round(1)
        os.environ["FAKE_VERDICT"] = "DOWN"
        self.game.play_round(2)
        board = scoreboard(self.game)
        cell = board["teams"][0]["services"]["news"]
        self.assertEqual(cell["verdict"], "DOWN")
        self.assertAlmostEqual(cell["sla"], 0.5)
        self.assertEqual(self.game.db.one("SELECT COUNT(*) AS n FROM flags")["n"], 4)

    def test_check_failed_not_counted_in_sla(self):
        self.game.play_round(1)
        os.environ["FAKE_VERDICT"] = "CHECK_FAILED"
        self.game.play_round(2)
        cell = scoreboard(self.game)["teams"][0]["services"]["news"]
        self.assertEqual(cell["sla"], 1.0)

    def test_due_round_follows_clock(self):
        self.assertEqual(self.game.due_round(), 1)
        self.clock.value += 125
        self.assertEqual(self.game.due_round(), 3)

    # -- submission ---------------------------------------------------------- #
    def test_not_started(self):
        self.assertEqual(self.submitter.submit(1, new_flag()), submit.NOT_STARTED)

    def test_submit_outcomes(self):
        self.game.play_round(1)
        victim_flag = self.flag_of(2)
        own_flag = self.flag_of(1)
        accepted = self.submitter.submit(1, victim_flag)
        self.assertTrue(accepted.startswith("Flag accepted! Earned "), accepted)
        self.assertEqual(self.submitter.submit(1, victim_flag), submit.ALREADY)
        self.assertEqual(self.submitter.submit(1, own_flag), submit.OWN)
        self.assertEqual(self.submitter.submit(1, "garbage"), submit.INVALID)
        self.assertEqual(self.submitter.submit(1, new_flag()), submit.INVALID)
        board = {t["id"]: t for t in scoreboard(self.game)["teams"]}
        service = self.game.db.one("SELECT service FROM flags WHERE flag = ?",
                                   (victim_flag,))["service"]
        self.assertGreater(board[1]["services"][service]["fp"], 1000)
        self.assertLess(board[2]["services"][service]["fp"], 1000)
        self.assertEqual(board[1]["services"][service]["stolen"], 1)
        self.assertEqual(board[2]["services"][service]["lost"], 1)
        self.assertEqual(board[1]["place"], 1)

    def test_flag_expires_after_lifetime(self):
        self.game.play_round(1)
        flag = self.flag_of(2, 1)
        self.game.db.set_meta("round", 3)  # lifetime 3: round-1 flag still valid
        self.assertTrue(self.submitter.submit(1, flag).startswith("Flag accepted"))
        other = self.game.db.one(
            "SELECT flag FROM flags WHERE team_id = 2 AND round = 1 AND flag != ?",
            (flag,))["flag"]
        self.game.db.set_meta("round", 4)
        self.assertEqual(self.submitter.submit(1, other), submit.INVALID)

    def test_game_over(self):
        self.game.play_round(1)
        self.game.cfg["end_ts"] = self.clock.value
        self.assertEqual(self.submitter.submit(1, self.flag_of(2)), submit.OVER)

    def test_attack_data_shape(self):
        self.game.play_round(1)
        data = attack_data(self.game)
        self.assertEqual(set(data), {"news", "smp"})
        self.assertEqual(set(data["news"]), {"10.0.0.1", "10.0.0.2"})
        item = data["news"]["10.0.0.2"][0]
        self.assertEqual(item, {"slot": "report", "round": 1, "id": 42})

    # -- network ------------------------------------------------------------- #
    def test_http_and_tcp_submission(self):
        self.game.play_round(1)
        http_server = HTTPServer(("127.0.0.1", 0), self.game, self.submitter)
        tcp_server = TCPServer(("127.0.0.1", 0), self.submitter)
        for server in (http_server, tcp_server):
            threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            base = f"http://127.0.0.1:{http_server.server_address[1]}"
            flag = self.flag_of(2)
            request = urllib.request.Request(
                base + "/flags", data=json.dumps([flag, "junk"]).encode(),
                headers={"X-Team-Token": "token-a"}, method="PUT")
            with urllib.request.urlopen(request) as response:
                body = json.loads(response.read())
            self.assertEqual(body[0]["flag"], flag)
            self.assertTrue(body[0]["msg"].startswith(f"[{flag}] Flag accepted! Earned "))
            self.assertEqual(body[1]["msg"], f"[junk] {submit.INVALID}")

            bad = urllib.request.Request(base + "/flags", data=b"[]",
                                         headers={"X-Team-Token": "nope"}, method="PUT")
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(bad)
            self.assertEqual(ctx.exception.code, 403)

            with urllib.request.urlopen(base + "/api/client/scoreboard") as response:
                self.assertEqual(json.loads(response.read())["round"], 1)
            with urllib.request.urlopen(base + "/") as response:
                self.assertIn(b"Sibintek AD", response.read())

            with socket.create_connection(("127.0.0.1", tcp_server.server_address[1])) as sock:
                stream = sock.makefile("rw")
                stream.readline()
                stream.write("token-b\n")
                stream.flush()
                self.assertTrue(stream.readline().startswith("Welcome, B!"))
                stream.write(flag + "\n")
                stream.flush()
                self.assertEqual(stream.readline().strip(), f"[{flag}] {submit.OWN}")
        finally:
            http_server.shutdown()
            tcp_server.shutdown()


class ScoringTest(unittest.TestCase):
    def test_attack_points(self):
        self.assertEqual(scoring.attack_points(1000, 1000, 10), (10.0, 10.0))
        weak_steals_strong = scoring.attack_points(500, 2000, 10)[0]
        strong_steals_weak = scoring.attack_points(2000, 500, 10)[0]
        self.assertGreater(weak_steals_strong, strong_steals_weak)
        self.assertEqual(scoring.attack_points(1, 10**6, 10)[0], 30.0)
        # The victim never loses more than it has.
        self.assertEqual(scoring.attack_points(1, 3, 10), (17.32, 3.0))

    def test_sla_and_total(self):
        self.assertEqual(scoring.sla(0, 0), 1.0)
        self.assertEqual(scoring.sla(3, 4), 0.75)
        self.assertEqual(scoring.team_score([{"fp": 1000, "sla": 0.5},
                                             {"fp": 100, "sla": 1.0}]), 600.0)


class ConfigTest(unittest.TestCase):
    def test_duplicate_token_rejected(self):
        with self.assertRaises(config.ConfigError):
            make_cfg(teams=[{"name": "A", "ip": "1", "token": "t"},
                            {"name": "B", "ip": "2", "token": "t"}])

    def test_url_override(self):
        cfg = make_cfg(teams=[{"name": "A", "ip": "10.0.0.1", "token": "a",
                               "urls": {"news": "http://127.0.0.1:13000/"}}])
        self.assertEqual(config.team_url(cfg, cfg["teams"][0], "news"),
                         "http://127.0.0.1:13000")
        self.assertEqual(config.team_url(cfg, cfg["teams"][0], "smp"),
                         "http://10.0.0.1:7000")

    def test_generate(self):
        cfg = config.validate(config.generate(3, "10.60.{n}.2"))
        self.assertEqual([t["ip"] for t in cfg["teams"]],
                         ["10.60.1.2", "10.60.2.2", "10.60.3.2"])


class TankSearchTest(unittest.TestCase):
    def search(self, owners, email):
        original = checker.blackline_tank
        calls = []

        def fake(_client, tank_id):
            calls.append(tank_id)
            if 1 <= tank_id <= len(owners):
                return {"owner_email": owners[tank_id - 1]}
            return None

        checker.blackline_tank = fake
        try:
            return checker.blackline_find_tank(None, email), calls
        finally:
            checker.blackline_tank = original

    def test_finds_newest_tank_fast(self):
        owners = [f"u{i}" for i in range(1, 2001)]
        found, calls = self.search(owners, "u2000")
        self.assertEqual(found, 2000)
        self.assertLess(len(calls), 30)

    def test_finds_tank_below_top(self):
        owners = [f"u{i}" for i in range(1, 101)]
        self.assertEqual(self.search(owners, "u97")[0], 97)
        self.assertEqual(self.search(["only"], "only")[0], 1)
        self.assertIsNone(self.search([], "x")[0])


if __name__ == "__main__":
    unittest.main()
