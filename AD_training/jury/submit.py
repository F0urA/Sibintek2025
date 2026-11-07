"""ForcAD-compatible flag submission: shared logic plus the TCP (:31337) server.

Every answer is "[<flag>] <message>" with ForcAD's wording, so exploit farms
(S4DFarm / DestructiveFarm `forcad_http`) classify responses out of the box.
"""

import logging
import re
import socketserver

import scoring

FLAG_RE = re.compile(r"[A-Z0-9]{31}=")
MAX_FLAGS_PER_REQUEST = 100

ACCEPTED = "Flag accepted! Earned {points:g} flag points!"
INVALID = "Flag is invalid or too old"
OWN = "Flag is your own"
ALREADY = "Flag already stolen"
NOT_STARTED = "Game not started"
OVER = "Game is over"

log = logging.getLogger("jury.submit")


class Submitter:
    def __init__(self, game):
        self.game = game
        self.db = game.db
        self.cfg = game.cfg

    def team_by_token(self, token):
        if not token:
            return None
        return self.db.one("SELECT id, name FROM teams WHERE token = ?", (token.strip(),))

    def submit(self, team_id, flag):
        """Process one flag; returns the bare ForcAD message."""
        state = self.game.state()
        if state == "not_started":
            return NOT_STARTED
        if state == "over":
            return OVER
        if not isinstance(flag, str) or not FLAG_RE.fullmatch(flag):
            return INVALID
        lifetime = self.cfg["flag_lifetime"]
        with self.db.transaction() as conn:
            current = self.game.current_round()
            row = conn.execute("SELECT team_id, service, round FROM flags WHERE flag = ?",
                               (flag,)).fetchone()
            if row is None or row["round"] <= current - lifetime:
                return INVALID
            if row["team_id"] == team_id:
                return OWN
            if conn.execute("SELECT 1 FROM steals WHERE flag = ? AND attacker_id = ?",
                            (flag, team_id)).fetchone():
                return ALREADY
            service, victim = row["service"], row["team_id"]
            fp = {r["team_id"]: r["fp"] for r in conn.execute(
                "SELECT team_id, fp FROM scores WHERE service = ? AND team_id IN (?, ?)",
                (service, team_id, victim))}
            gain, loss = scoring.attack_points(fp[team_id], fp[victim], self.cfg["hardness"])
            conn.execute("INSERT INTO steals (flag, attacker_id, round, points) "
                         "VALUES (?, ?, ?, ?)", (flag, team_id, current, gain))
            conn.execute("UPDATE scores SET fp = fp + ? WHERE team_id = ? AND service = ?",
                         (gain, team_id, service))
            conn.execute("UPDATE scores SET fp = fp - ? WHERE team_id = ? AND service = ?",
                         (loss, victim, service))
        log.info("team %s stole %s flag of team %s (+%g)", team_id, service, victim, gain)
        return ACCEPTED.format(points=gain)

    def submit_many(self, team_id, flags):
        return [{"msg": f"[{flag}] {self.submit(team_id, flag)}", "flag": flag}
                for flag in flags]


class TCPHandler(socketserver.StreamRequestHandler):
    """Protocol: first line is the team token, then one flag per line."""

    timeout = 120

    def send(self, text):
        self.wfile.write((text + "\n").encode())

    def readline(self):
        line = self.rfile.readline(256)
        return line.decode("utf-8", "replace").strip() if line else None

    def handle(self):
        submitter = self.server.submitter
        try:
            self.send("Enter your team token:")
            team = submitter.team_by_token(self.readline())
            if team is None:
                self.send("Invalid team token")
                return
            self.send(f"Welcome, {team['name']}! Send flags, one per line.")
            while True:
                flag = self.readline()
                if flag is None:
                    return
                if flag:
                    self.send(f"[{flag}] {submitter.submit(team['id'], flag)}")
        except (OSError, TimeoutError):
            return


class TCPServer(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, submitter):
        super().__init__(address, TCPHandler)
        self.submitter = submitter
