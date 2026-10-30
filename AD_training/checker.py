#!/usr/bin/env python3
"""Local AD flag checker for the four Sibintek2025 services (stdlib only)."""

import argparse
import http.cookiejar
import json
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_URLS = {
    "news": "http://127.0.0.1:3000",
    "smp": "http://127.0.0.1:7000",
    "web": "http://127.0.0.1:5001",
    "blackline": "http://127.0.0.1:8080",
}
SLOTS = {
    "news": ("report", "private_news"),
    "smp": ("message", "pigeon"),
    "web": ("operation", "route"),
    "blackline": ("profile", "fleet", "finance", "audit", "retail"),
}


class CheckerError(Exception):
    pass


class Client:
    def __init__(self, base, timeout):
        self.base = base.rstrip("/") + "/"
        self.timeout = timeout
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self.token = None

    def request(self, method, path, data=None, form=False):
        url = urllib.parse.urljoin(self.base, path.lstrip("/"))
        if data is None:
            body = None
        elif form:
            body = urllib.parse.urlencode(data).encode()
        else:
            body = json.dumps(data).encode()
        headers = {}
        if body is not None:
            headers["Content-Type"] = (
                "application/x-www-form-urlencoded" if form else "application/json"
            )
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        try:
            response = self.opener.open(
                urllib.request.Request(url, data=body, headers=headers, method=method),
                timeout=self.timeout,
            )
            with response:
                return response.status, response.url, response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read(300).decode("utf-8", "replace")
            raise CheckerError(f"HTTP {exc.code} at {path}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            raise CheckerError(f"Connection failed at {path}: {exc}") from exc

    def json(self, method, path, data=None):
        status, _, body = self.request(method, path, data)
        try:
            return status, json.loads(body)
        except json.JSONDecodeError as exc:
            raise CheckerError(f"Invalid JSON at {path}") from exc


def unique_user(prefix):
    return f"{prefix}_{secrets.token_hex(6)}", secrets.token_urlsafe(18)


def need(condition, message):
    if not condition:
        raise CheckerError(message)


def news_login(client, state):
    _, url, _ = client.request("POST", "/login", {
        "username": state["username"], "password": state["password"]
    }, form=True)
    need(urllib.parse.urlparse(url).path != "/login", "News login failed")


def put_news(client, slot, flag):
    username, password = unique_user("checker")
    _, url, _ = client.request("POST", "/register", {
        "username": username, "password": password,
        "email": username + "@local.invalid", "is_journalist": "on",
    }, form=True)
    need(urllib.parse.urlparse(url).path == "/login", "News registration failed")
    state = {"username": username, "password": password}
    news_login(client, state)
    if slot == "report":
        status, item = client.json("POST", "/api/reports/submit", {
            "title": "Internal report " + username,
            "description": "Local AD training record",
            "confidential_data": flag,
            "internal": True,
        })
        need(status == 201 and isinstance(item.get("id"), int), "News report creation failed")
        state["id"] = item["id"]
    else:
        _, url, _ = client.request("POST", "/news/create", {
            "title": "Private bulletin " + username,
            "content": flag,
            "category": "Безопасность станций",
            "is_private": "on",
        }, form=True)
        path = urllib.parse.urlparse(url).path
        need(path.startswith("/news/") and path.split("/")[-1].isdigit(), "Private news creation failed")
        state["id"] = int(path.split("/")[-1])
    return state


def get_news(client, slot, flag, state):
    news_login(client, state)
    path = f"/reports/{state['id']}" if slot == "report" else f"/news/{state['id']}"
    _, url, body = client.request("GET", path)
    need(urllib.parse.urlparse(url).path == path, "News item unavailable")
    need(flag in body, "Flag missing from News item")


def smp_login(client, state):
    _, data = client.json("POST", "/api/login", {
        "username": state["username"], "password": state["password"]
    })
    client.token = data["token"]


def put_smp(client, slot, flag):
    username, password = unique_user("checker")
    _, data = client.json("POST", "/api/register", {
        "username": username, "password": password
    })
    client.token = data["token"]
    state = {"username": username, "password": password}
    _, pigeon = client.json("POST", "/api/pigeons", {
        "name": "Courier " + username, "color": "blue", "age": 2,
        "description": flag if slot == "pigeon" else "Local AD courier",
    })
    state["pigeon_id"] = pigeon["id"]
    if slot == "message":
        _, message = client.json("POST", "/api/messages", {
            "pigeon_id": pigeon["id"], "recipient_username": username,
            "subject": "Dispatch", "content": flag,
        })
        state["message_id"] = message["id"]
    return state


def get_smp(client, slot, flag, state):
    smp_login(client, state)
    if slot == "pigeon":
        _, item = client.json("GET", f"/api/pigeons/{state['pigeon_id']}")
        need(item.get("description") == flag, "Flag missing from pigeon")
    else:
        query = urllib.parse.urlencode({"message_id": state["message_id"]})
        _, items = client.json("GET", "/api/messages?" + query)
        need(any(item.get("id") == state["message_id"] and item.get("content") == flag
                 for item in items), "Flag missing from message")


def web_login(client, state):
    _, data = client.json("POST", "/api/auth/login", {
        "username": state["username"], "password": state["password"]
    })
    client.token = data["token"]


def put_web(client, slot, flag):
    username, password = unique_user("checker")
    _, user = client.json("POST", "/api/auth/register", {
        "username": username, "password": password, "role": "admin",
        "full_name": "Local AD checker",
    })
    state = {"username": username, "password": password, "user_id": user["id"]}
    web_login(client, state)
    _, depot = client.json("POST", "/api/depots", {
        "name": "Depot " + username, "location": "local", "capacity": 1000,
    })
    _, tank = client.json("POST", f"/api/depots/{depot['id']}/tanks", {
        "tank_number": username, "fuel_type": "Hydrogen", "capacity": 100,
        "notes": "Local AD tank",
    })
    if slot == "operation":
        _, operation = client.json("POST", "/api/operations/receive", {
            "depot_id": depot["id"], "tank_id": tank["id"],
            "fuel_type": "Hydrogen", "volume": 1,
            "source_destination": "local", "notes": flag,
        })
        state["operation_id"] = operation["id"]
    else:
        # The competition migration seeds one truck; routes have no truck-create API.
        _, routes = client.json("POST", "/api/routes", {
            "truck_id": 1, "driver_id": user["id"],
            "depot_from": depot["id"], "azs_destination": "local",
            "fuel_type": "Hydrogen", "volume": 1, "notes": flag,
        })
        state["route_id"] = routes["id"]
    return state


def get_web(client, slot, flag, state):
    web_login(client, state)
    path = (f"/api/operations/{state['operation_id']}" if slot == "operation"
            else f"/api/routes/{state['route_id']}/gps")
    _, item = client.json("GET", path)
    need(item.get("notes") == flag, "Flag missing from DNK_web item")


BLACKLINE_PATHS = {
    "profile": ("/api/profile/secrets", "profile_flag"),
    "retail": ("/api/retail/profile/config", "role_retail_flag"),
    "finance": ("/api/fin/profile/config", "role_fin_flag"),
}


def blackline_login(client, state):
    _, data = client.json("POST", "/api/auth/login", {
        "email": state["email"], "password": state["password"]
    })
    client.token = data["jwt"]


def put_blackline(client, slot, flag):
    username, password = unique_user("checker")
    email = username + "@local.invalid"
    role = {"retail": "retail", "finance": "fin", "fleet": "fleet"}.get(slot, "operator")
    _, user = client.json("POST", "/api/auth/register", {
        "email": email, "password": password, "name": "Local AD checker",
        "role": role,
    })
    state = {"email": email, "password": password, "user_id": user["id"]}
    blackline_login(client, state)
    if slot in BLACKLINE_PATHS:
        path, field = BLACKLINE_PATHS[slot]
        client.json("PUT", path, {field: flag})
    elif slot == "fleet":
        _, webhook = client.json("POST", "/api/fleet/webhooks", {
            "url": "http://127.0.0.1:9/checker", "secret_token": flag,
        })
        state["webhook_id"] = webhook["id"]
    else:
        _, event = client.json("POST", "/api/audit/emit", {
            "kind": "local_checker", "note": "Local AD training event",
            "log_flag": flag,
        })
        state["event_id"] = event["request_id"]
    return state


def get_blackline(client, slot, flag, state):
    blackline_login(client, state)
    if slot in BLACKLINE_PATHS:
        path, field = BLACKLINE_PATHS[slot]
        _, data = client.json("GET", path)
        need(data.get(field) == flag, "Flag missing from DNK_blackLine " + slot)
    elif slot == "fleet":
        _, data = client.json("GET", f"/api/fleet/webhooks/{state['webhook_id']}")
        need(data.get("secret_token") == flag, "Flag missing from webhook")
    else:
        _, data = client.json("GET", "/api/audit/events")
        need(any(event.get("id") == state["event_id"] and event.get("log_flag") == flag
                 for event in data["events"]), "Flag missing from audit event")


PUT = {"news": put_news, "smp": put_smp, "web": put_web, "blackline": put_blackline}
GET = {"news": get_news, "smp": get_smp, "web": get_web, "blackline": get_blackline}
HEALTH = {"news": "/", "smp": "/health", "web": "/health", "blackline": "/healthz"}


def attack_data(service, slot, state):
    """Public hints for a local attacker; never include checker credentials."""
    if service == "news":
        return {"id": state["id"]}
    if service == "smp":
        return {"usernames": [state["username"]]} if slot == "pigeon" else {}
    if service == "web":
        return {"route_id": state["route_id"]} if slot == "route" else {}
    if slot == "fleet":
        return {"webhook_id": state["webhook_id"]}
    if slot in ("profile", "finance", "retail"):
        return {"user_id": state["user_id"]}
    return {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("put", "get", "check", "health"))
    parser.add_argument("service", choices=DEFAULT_URLS)
    parser.add_argument("--slot", help="Flag location; see --list-slots")
    parser.add_argument("--url", help="Service base URL (defaults to local Compose port)")
    parser.add_argument("--flag", help="Flag to place or verify")
    parser.add_argument("--state", help="JSON returned by put, or @path to JSON file")
    parser.add_argument("--timeout", type=float, default=5)
    parser.add_argument("--list-slots", action="store_true")
    args = parser.parse_args()
    if args.list_slots:
        print(json.dumps(SLOTS, ensure_ascii=False))
        return 0
    if args.action not in ("check", "health"):
        need(args.slot in SLOTS[args.service],
             "Choose --slot from: " + ", ".join(SLOTS[args.service]))
        need(bool(args.flag), "--flag is required")
    client = Client(args.url or DEFAULT_URLS[args.service], args.timeout)
    if args.action in ("check", "health"):
        client.request("GET", HEALTH[args.service])
        result = {"status": "ok", "service": args.service}
    elif args.action == "put":
        state = PUT[args.service](client, args.slot, args.flag)
        GET[args.service](client, args.slot, args.flag, state)
        result = {"status": "ok", "service": args.service, "slot": args.slot,
                  "state": state, "attack_data": attack_data(args.service, args.slot, state)}
    else:
        need(bool(args.state), "--state is required for get")
        if args.state.startswith("@"):
            with open(args.state[1:], encoding="utf-8") as handle:
                source = handle.read()
        else:
            source = args.state
        state = json.loads(source)
        need(isinstance(state, dict), "--state must contain a JSON object")
        if state.get("status") == "ok" and "state" in state:
            state = state["state"]
        need(isinstance(state, dict), "--state.state must be a JSON object")
        GET[args.service](client, args.slot, args.flag, state)
        result = {"status": "ok", "service": args.service, "slot": args.slot}
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (CheckerError, KeyError, ValueError, OSError) as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
