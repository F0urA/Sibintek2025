#!/usr/bin/env python3
"""Start or stop the local API-only AD practice stack."""

import argparse
import os
from pathlib import Path
import secrets
import subprocess


ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env.training"


def ensure_secrets():
    if ENV_FILE.exists():
        return
    values = {
        "SIBINTEK_NEWS_SECRET": secrets.token_urlsafe(32),
        "SIBINTEK_WEB_DB_PASSWORD": secrets.token_urlsafe(24),
        "SIBINTEK_WEB_JWT_SECRET": secrets.token_urlsafe(32),
    }
    fd = os.open(ENV_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        for name, value in values.items():
            handle.write(f"{name}={value}\n")
    print("Created local secrets in AD_training/.env.training")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("up", "down", "ps"))
    parser.add_argument("--public", action="store_true",
                        help="vulnbox mode: publish ports on 0.0.0.0 so the jury and "
                             "other teams can reach them (game network/VPN only!)")
    args = parser.parse_args()
    env = dict(os.environ)
    if args.action == "up":
        ensure_secrets()
        if args.public:
            env["SIBINTEK_BIND"] = "0.0.0.0"
            print("WARNING: intentionally vulnerable services are now listening on all "
                  "interfaces. Expose them only inside the game network/VPN.")
    command = ["docker", "compose", "--env-file", str(ENV_FILE),
               "-f", str(ROOT / "compose.yml")]
    command += {"up": ["up", "--build", "-d"], "down": ["down"], "ps": ["ps"]}[args.action]
    return subprocess.run(command, cwd=ROOT, env=env, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
