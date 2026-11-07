"""Game clock and the round loop: check -> put -> get for every team x service."""

from concurrent.futures import ThreadPoolExecutor
import json
import logging
import secrets
import subprocess
import sys
import threading
import time

from config import CHECKER, SLOTS, team_url

FLAG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
# Severity order for combining several checker results into one round verdict.
SEVERITY = {"UP": 0, "CHECK_FAILED": 1, "MUMBLE": 2, "CORRUPT": 3, "DOWN": 4}

log = logging.getLogger("jury.rounds")


def new_flag():
    return "".join(secrets.choice(FLAG_ALPHABET) for _ in range(31)) + "="


class Result:
    def __init__(self, verdict, public="", private="", payload=None):
        self.verdict = verdict
        self.public = public
        self.private = private
        self.payload = payload or {}

    @property
    def ok(self):
        return self.verdict == "UP"


class Game:
    def __init__(self, cfg, db, checker=CHECKER, now=time.time):
        self.cfg = cfg
        self.db = db
        self.checker = str(checker)
        self.now = now
        self.stop_event = threading.Event()
        db.sync_teams(cfg)
        start = cfg["start_ts"] or db.get_meta("start_ts") or self.now()
        db.set_meta("start_ts", start)
        self.start_ts = start

    # -- clock --------------------------------------------------------------- #
    def current_round(self):
        return self.db.get_meta("round", 0)

    def state(self):
        now = self.now()
        if self.cfg["end_ts"] and now >= self.cfg["end_ts"]:
            return "over"
        if now < self.start_ts or self.current_round() == 0:
            return "not_started"
        return "running"

    def due_round(self):
        """Round number the wall clock says we should be in (0 = not started)."""
        now = self.now()
        if now < self.start_ts:
            return 0
        if self.cfg["end_ts"] and now >= self.cfg["end_ts"]:
            return self.current_round()
        return int((now - self.start_ts) // self.cfg["round_time"]) + 1

    def round_started_at(self, round_no):
        return self.start_ts + (round_no - 1) * self.cfg["round_time"]

    # -- checker ------------------------------------------------------------- #
    def run_checker(self, action, service, url, slot=None, flag=None, state=None):
        command = [sys.executable, self.checker, action, service, "--url", url,
                   "--timeout", str(self.cfg["http_timeout"])]
        if slot:
            command += ["--slot", slot, "--flag", flag]
        if state is not None:
            command += ["--state", state]
        try:
            proc = subprocess.run(command, capture_output=True, text=True,
                                  timeout=self.cfg["checker_timeout"])
        except subprocess.TimeoutExpired:
            return Result("DOWN", f"{action}: timeout", f"{action} exceeded checker_timeout")
        try:
            data = json.loads(proc.stdout.strip().splitlines()[-1])
        except (ValueError, IndexError):
            tail = (proc.stdout + proc.stderr)[-500:]
            return Result("CHECK_FAILED", f"{action}: checker error", tail)
        verdict = data.get("verdict") or ("UP" if data.get("status") == "ok" else "MUMBLE")
        if verdict == "UP":
            return Result("UP", "OK", "", data)
        return Result(verdict, f"{action}: {data.get('public', 'failed')}",
                      data.get("error", ""), data)

    def check_service(self, round_no, team, service):
        """ForcAD order: check, then put a new flag, then get an older live one."""
        url = team_url(self.cfg, team, service)
        result = self.run_checker("check", service, url)
        if result.ok:
            slots = SLOTS[service]
            slot = slots[(round_no - 1) % len(slots)]
            flag = new_flag()
            result = self.run_checker("put", service, url, slot, flag)
            if result.ok:
                self.db.add_flag(flag, team["id"], service, slot, round_no,
                                 result.payload.get("state", {}),
                                 result.payload.get("attack_data", {}))
                old = self.db.random_live_flag(team["id"], service, round_no,
                                               self.cfg["flag_lifetime"], flag)
                if old:
                    result = self.run_checker("get", service, url, old["slot"],
                                              old["flag"], old["state"])
        self.db.add_check(round_no, team["id"], service, result.verdict,
                          result.public, result.private)
        return result

    # -- loop ---------------------------------------------------------------- #
    def play_round(self, round_no):
        self.db.set_meta("round", round_no)
        started = self.now()
        jobs = [(team, service) for team in self.cfg["teams"] for service in self.cfg["services"]]
        with ThreadPoolExecutor(max_workers=min(64, len(jobs))) as pool:
            results = list(pool.map(lambda job: self.check_service(round_no, *job), jobs))
        summary = {}
        for (team, service), result in zip(jobs, results):
            summary.setdefault(result.verdict, []).append(f"{team['name']}/{service}")
        elapsed = self.now() - started
        log.info("round %d done in %.1fs: %s", round_no, elapsed,
                 {verdict: len(items) for verdict, items in summary.items()})
        for verdict, items in summary.items():
            if verdict != "UP":
                log.info("  %s: %s", verdict, ", ".join(items))
        if elapsed > self.cfg["round_time"]:
            log.warning("round %d took longer than round_time; the next round is skipped",
                        round_no)

    def loop(self):
        while not self.stop_event.is_set():
            due = self.due_round()
            if self.state() == "over" and due == self.current_round():
                log.info("game is over (end_time reached)")
                self.stop_event.wait(self.cfg["round_time"])
                continue
            if due > self.current_round():
                self.play_round(due)
                continue
            if due == 0:
                wait = self.start_ts - self.now()
            else:
                wait = self.round_started_at(due + 1) - self.now()
            self.stop_event.wait(max(0.2, min(wait, 5)))
