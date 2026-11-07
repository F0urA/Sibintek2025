"""Sibintek2025 AD jury: rounds, ForcAD-compatible flag submission, scoreboard.

  python3 AD_training/jury init --teams 4 --ip-template 10.60.{n}.2
  python3 AD_training/jury run
  python3 AD_training/jury tokens
"""

import argparse
import json
import logging
import os
from pathlib import Path
import sys
import threading

sys.path.insert(0, str(Path(__file__).resolve().parent))

import config  # noqa: E402
from db import DB  # noqa: E402
from rounds import Game  # noqa: E402
from submit import Submitter, TCPServer  # noqa: E402
from web import HTTPServer  # noqa: E402

log = logging.getLogger("jury")


def cmd_init(args):
    path = Path(args.config)
    if path.exists() and not args.force:
        print(f"{path} already exists; pass --force to overwrite", file=sys.stderr)
        return 1
    cfg = config.generate(args.teams, args.ip_template)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(cfg, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"Wrote {path}. Edit team names/IPs if needed, then hand out the tokens:")
    print_tokens(config.validate(cfg))
    return 0


def print_tokens(cfg):
    for team in cfg["teams"]:
        print(f"  {team['id']:>3}  {team['name']:<20} {team['ip']:<16} {team['token']}")


def cmd_tokens(args):
    print_tokens(config.load(args.config))
    return 0


def serve(server, name):
    thread = threading.Thread(target=server.serve_forever, name=name, daemon=True)
    thread.start()
    return thread


def cmd_run(args):
    cfg = config.load(args.config)
    db = DB(args.db)
    game = Game(cfg, db)
    submitter = Submitter(game)
    http_addr = config.parse_addr(cfg["listen"]["http"])
    tcp_addr = config.parse_addr(cfg["listen"]["tcp"])
    http_server = HTTPServer(http_addr, game, submitter)
    tcp_server = TCPServer(tcp_addr, submitter)
    serve(http_server, "http")
    serve(tcp_server, "tcp")
    log.info("scoreboard and PUT /flags on http://%s:%d, TCP flags on %s:%d",
             *http_addr, *tcp_addr)
    log.info("%d teams x %d services, round %ds, flag lifetime %d rounds, round now %d",
             len(cfg["teams"]), len(cfg["services"]), cfg["round_time"],
             cfg["flag_lifetime"], game.current_round())
    try:
        game.loop()
    except KeyboardInterrupt:
        log.info("stopping")
    finally:
        game.stop_event.set()
        http_server.shutdown()
        tcp_server.shutdown()
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=str(config.DEFAULT_CONFIG),
                        help="jury config (default: AD_training/jury.json)")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="create a config with random team tokens")
    init.add_argument("--teams", type=int, required=True)
    init.add_argument("--ip-template", default="10.60.{n}.2",
                      help="vulnbox address per team, {n} = team number")
    init.add_argument("--force", action="store_true")

    run = sub.add_parser("run", help="run rounds, flag submission and the scoreboard")
    run.add_argument("--db", default=str(config.DEFAULT_DB),
                     help="SQLite file (default: AD_training/jury/data/jury.sqlite); "
                          "delete it to start a fresh game")

    sub.add_parser("tokens", help="print team tokens from the config")

    args = parser.parse_args()
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        return {"init": cmd_init, "run": cmd_run, "tokens": cmd_tokens}[args.command](args)
    except config.ConfigError as exc:
        print(f"config error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
