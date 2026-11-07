"""HTTP side of the jury: ForcAD-style PUT /flags, client API and the scoreboard."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
from pathlib import Path

import scoring
from submit import MAX_FLAGS_PER_REQUEST

STATIC = Path(__file__).resolve().parent / "static"
log = logging.getLogger("jury.web")


def scoreboard(game):
    db, cfg = game.db, game.cfg
    services = list(cfg["services"])
    current = game.current_round()
    fp = {(r["team_id"], r["service"]): r["fp"] for r in db.all("SELECT * FROM scores")}
    sla_rows = db.all(
        "SELECT team_id, service, SUM(verdict = 'UP') AS up, "
        "SUM(verdict != 'CHECK_FAILED') AS counted FROM checks GROUP BY team_id, service")
    sla = {(r["team_id"], r["service"]): (r["up"], r["counted"]) for r in sla_rows}
    stolen = {(r["attacker_id"], r["service"]): r["n"] for r in db.all(
        "SELECT s.attacker_id, f.service, COUNT(*) AS n FROM steals s "
        "JOIN flags f ON f.flag = s.flag GROUP BY s.attacker_id, f.service")}
    lost = {(r["team_id"], r["service"]): r["n"] for r in db.all(
        "SELECT f.team_id, f.service, COUNT(*) AS n FROM steals s "
        "JOIN flags f ON f.flag = s.flag GROUP BY f.team_id, f.service")}
    last = {(r["team_id"], r["service"]): r for r in db.all(
        "SELECT c.* FROM checks c JOIN (SELECT team_id, service, MAX(round) AS round "
        "FROM checks GROUP BY team_id, service) m USING (team_id, service, round)")}

    teams = []
    for team in cfg["teams"]:
        cells = {}
        for service in services:
            key = (team["id"], service)
            up, counted = sla.get(key, (0, 0))
            check = last.get(key)
            cells[service] = {
                "fp": round(fp.get(key, cfg["default_score"]), 2),
                "sla": scoring.sla(up, counted),
                "up_rounds": up, "counted_rounds": counted,
                "stolen": stolen.get(key, 0), "lost": lost.get(key, 0),
                "verdict": check["verdict"] if check else None,
                "message": check["public"] if check else "",
                "round": check["round"] if check else None,
            }
        teams.append({"id": team["id"], "name": team["name"], "ip": team["ip"],
                      "score": scoring.team_score(cells.values()), "services": cells})
    teams.sort(key=lambda t: (-t["score"], t["id"]))
    for place, team in enumerate(teams, 1):
        team["place"] = place

    now = game.now()
    next_round = None
    if game.state() == "running":
        next_round = max(0.0, game.round_started_at(current + 1) - now)
    elif game.state() == "not_started":
        next_round = max(0.0, game.start_ts - now)
    return {"round": current, "state": game.state(), "round_time": cfg["round_time"],
            "flag_lifetime": cfg["flag_lifetime"], "next_round_in": next_round,
            "server_time": now, "services": services, "teams": teams}


def attack_data(game):
    """ForcAD shape: {service: {team_ip: [public data of each live flag]}}."""
    current = game.current_round()
    result = {service: {team["ip"]: [] for team in game.cfg["teams"]}
              for service in game.cfg["services"]}
    rows = game.db.all(
        "SELECT t.ip, f.service, f.slot, f.round, f.attack FROM flags f "
        "JOIN teams t ON t.id = f.team_id WHERE f.round > ? ORDER BY f.round",
        (current - game.cfg["flag_lifetime"],))
    for row in rows:
        if row["service"] in result and row["ip"] in result[row["service"]]:
            item = {"slot": row["slot"], "round": row["round"], **json.loads(row["attack"])}
            result[row["service"]][row["ip"]].append(item)
    return result


class Handler(BaseHTTPRequestHandler):
    server_version = "SibintekJury/1.0"

    def log_message(self, fmt, *args):
        log.debug("%s %s", self.address_string(), fmt % args)

    def reply(self, status, body, content_type="application/json; charset=utf-8"):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def route(self):
        return self.path.split("?", 1)[0].rstrip("/") or "/"

    def do_GET(self):
        game = self.server.game
        path = self.route()
        if path in ("/", "/index.html"):
            self.reply(200, (STATIC / "index.html").read_bytes(), "text/html; charset=utf-8")
        elif path == "/api/client/scoreboard":
            self.reply(200, scoreboard(game))
        elif path == "/api/client/attack_data":
            self.reply(200, attack_data(game))
        elif path == "/api/client/teams":
            self.reply(200, [{"id": t["id"], "name": t["name"], "ip": t["ip"]}
                             for t in game.cfg["teams"]])
        elif path == "/api/client/config":
            cfg = game.cfg
            self.reply(200, {key: cfg[key] for key in (
                "round_time", "flag_lifetime", "default_score", "hardness",
                "start_time", "end_time")} | {"flag_format": "[A-Z0-9]{31}="})
        else:
            self.reply(404, {"error": "not found"})

    def do_PUT(self):
        if self.route() != "/flags":
            self.reply(404, {"error": "not found"})
            return
        submitter = self.server.submitter
        team = submitter.team_by_token(self.headers.get("X-Team-Token"))
        if team is None:
            self.reply(403, {"error": "Invalid team token"})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            flags = json.loads(self.rfile.read(min(length, 1 << 20)) or b"null")
        except ValueError:
            flags = None
        if not isinstance(flags, list):
            self.reply(400, {"error": "Body must be a JSON array of flags"})
            return
        if len(flags) > MAX_FLAGS_PER_REQUEST:
            self.reply(400, {"error": f"At most {MAX_FLAGS_PER_REQUEST} flags per request"})
            return
        self.reply(200, submitter.submit_many(team["id"], flags))


class HTTPServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, game, submitter):
        super().__init__(address, Handler)
        self.game = game
        self.submitter = submitter
