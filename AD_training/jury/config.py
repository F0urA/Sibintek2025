"""Jury configuration: loading, validation and generation (stdlib only)."""

import datetime
import json
from pathlib import Path
import secrets
import sys

HERE = Path(__file__).resolve().parent
TRAINING = HERE.parent
CHECKER = TRAINING / "checker.py"
DEFAULT_CONFIG = TRAINING / "jury.json"
DEFAULT_DB = HERE / "data" / "jury.sqlite"

if str(TRAINING) not in sys.path:
    sys.path.insert(0, str(TRAINING))

from checker import SLOTS  # noqa: E402  (shared slot list with the checker)

SERVICE_PORTS = {"news": 3000, "smp": 7000, "web": 5001, "blackline": 8080}

DEFAULTS = {
    "round_time": 60,        # seconds per round
    "flag_lifetime": 5,      # rounds a flag stays submittable
    "checker_timeout": 20,   # seconds for one checker invocation
    "http_timeout": 5,       # seconds for one HTTP request inside the checker
    "start_time": None,      # ISO 8601 / unix time; null = when `run` first starts
    "end_time": None,        # ISO 8601 / unix time; null = endless
    "default_score": 1000,   # starting flag points per team x service
    "hardness": 10,          # base points for one stolen flag
    "listen": {"http": "0.0.0.0:8000", "tcp": "0.0.0.0:31337"},
}


class ConfigError(Exception):
    pass


def parse_time(value):
    """None, unix seconds, or ISO 8601 (naive = local time) -> unix seconds."""
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return datetime.datetime.fromisoformat(str(value)).timestamp()
    except ValueError as exc:
        raise ConfigError(f"Bad time {value!r}: use ISO 8601 or unix seconds") from exc


def parse_addr(value):
    host, _, port = str(value).rpartition(":")
    if not port.isdigit():
        raise ConfigError(f"Bad listen address {value!r}: expected host:port")
    return host or "0.0.0.0", int(port)


def load(path):
    try:
        with open(path, encoding="utf-8") as handle:
            raw = json.load(handle)
    except FileNotFoundError as exc:
        raise ConfigError(f"{path} not found; create it with: "
                          "python3 AD_training/jury init --teams N") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"{path}: invalid JSON: {exc}") from exc
    return validate(raw)


def validate(raw):
    cfg = {**DEFAULTS, **raw}
    cfg["listen"] = {**DEFAULTS["listen"], **raw.get("listen", {})}
    for key in ("round_time", "flag_lifetime", "checker_timeout", "http_timeout",
                "default_score", "hardness"):
        if not isinstance(cfg[key], (int, float)) or cfg[key] <= 0:
            raise ConfigError(f"{key} must be a positive number")
    if cfg["checker_timeout"] > cfg["round_time"]:
        raise ConfigError("checker_timeout must not exceed round_time")
    cfg["start_ts"] = parse_time(cfg["start_time"])
    cfg["end_ts"] = parse_time(cfg["end_time"])
    for name in ("http", "tcp"):
        parse_addr(cfg["listen"][name])

    services = cfg.get("services") or {name: {} for name in SERVICE_PORTS}
    for name in services:
        if name not in SLOTS:
            raise ConfigError(f"Unknown service {name!r}; known: {', '.join(SLOTS)}")
        services[name] = {"port": SERVICE_PORTS[name], **(services[name] or {})}
    cfg["services"] = services

    teams = cfg.get("teams") or []
    if len(teams) < 1:
        raise ConfigError("Config needs at least one team")
    seen = {"name": set(), "ip": set(), "token": set()}
    for index, team in enumerate(teams, 1):
        for key in ("name", "ip", "token"):
            value = team.get(key)
            if not isinstance(value, str) or not value:
                raise ConfigError(f"Team #{index}: {key} is required")
            if value in seen[key]:
                raise ConfigError(f"Team #{index}: duplicate {key} {value!r}")
            seen[key].add(value)
        for service in team.get("urls", {}):
            if service not in services:
                raise ConfigError(f"Team {team['name']}: unknown service {service!r} in urls")
        # Ids follow config order: append new teams, never reorder mid-game.
        team["id"] = index
    return cfg


def team_url(cfg, team, service):
    override = team.get("urls", {}).get(service)
    if override:
        return override.rstrip("/")
    return f"http://{team['ip']}:{cfg['services'][service]['port']}"


def generate(count, ip_template):
    if "{n}" not in ip_template:
        raise ConfigError("--ip-template must contain {n}, e.g. 10.60.{n}.2")
    teams = [{"name": f"Team {n}", "ip": ip_template.format(n=n),
              "token": secrets.token_hex(16)} for n in range(1, count + 1)]
    return {
        "round_time": DEFAULTS["round_time"],
        "flag_lifetime": DEFAULTS["flag_lifetime"],
        "checker_timeout": DEFAULTS["checker_timeout"],
        "start_time": None,
        "end_time": None,
        "default_score": DEFAULTS["default_score"],
        "hardness": DEFAULTS["hardness"],
        "listen": dict(DEFAULTS["listen"]),
        "services": {name: {"port": port} for name, port in SERVICE_PORTS.items()},
        "teams": teams,
    }
