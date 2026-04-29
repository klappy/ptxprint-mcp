#!/usr/bin/env python3
"""
docs-tool smoke — session 13.

Verifies the `docs` tool against a live PTXprint MCP deploy.

Usage:
    python3 smoke/docs-smoke.py [worker_url]

Default worker_url: https://ptxprint-mcp.klappy.workers.dev

Exits non-zero on any failure. Prints a one-line PASS/FAIL summary.

MCP transport details:
- Streamable HTTP MCP requires an `initialize` handshake first; the server
  responds with an `Mcp-Session-Id` header that must be echoed on every
  subsequent request to the same session.
- Responses are SSE-framed (`event: message\\ndata: {...}`) when the
  Accept header includes text/event-stream.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from typing import Any

DEFAULT_WORKER_URL = "https://ptxprint-mcp.klappy.workers.dev"
USER_AGENT = "ptxprint-mcp-docs-smoke/0.1"


class McpClient:
    def __init__(self, worker_url: str):
        self.url = f"{worker_url.rstrip('/')}/mcp"
        self.session_id: str | None = None
        self.next_id = 1

    def _post(self, body: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
        headers = {
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
            "user-agent": USER_AGENT,
        }
        if self.session_id:
            headers["mcp-session-id"] = self.session_id
        req = urllib.request.Request(
            self.url,
            data=json.dumps(body).encode(),
            method="POST",
            headers=headers,
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            text = resp.read().decode()
            resp_headers = {k.lower(): v for k, v in resp.getheaders()}

        text = text.strip()
        if text.startswith("{"):
            envelope = json.loads(text)
        else:
            envelope = None
            for line in text.split("\n"):
                if line.startswith("data:"):
                    envelope = json.loads(line[len("data:"):].strip())
                    break
            if envelope is None:
                raise RuntimeError(f"unparseable MCP response: {text[:200]!r}")
        return envelope, resp_headers

    def initialize(self) -> None:
        body = {
            "jsonrpc": "2.0",
            "id": self.next_id,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {"name": "ptxprint-mcp-docs-smoke", "version": "0.1"},
            },
        }
        self.next_id += 1
        _envelope, headers = self._post(body)
        sid = headers.get("mcp-session-id")
        if not sid:
            raise RuntimeError(f"server did not return Mcp-Session-Id; headers={headers!r}")
        self.session_id = sid

        # Required follow-up: notifications/initialized so the server knows
        # initialization is complete. Notifications expect 200/202 with no body.
        notify = {"jsonrpc": "2.0", "method": "notifications/initialized"}
        headers_n = {
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
            "user-agent": USER_AGENT,
            "mcp-session-id": self.session_id,
        }
        req = urllib.request.Request(
            self.url,
            data=json.dumps(notify).encode(),
            method="POST",
            headers=headers_n,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
        except Exception:
            # Some implementations return 202 with no body; ignore parse failures.
            pass

    def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        body = {
            "jsonrpc": "2.0",
            "id": self.next_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        self.next_id += 1
        envelope, _headers = self._post(body)
        inner = envelope.get("result", {}).get("content", [{}])[0].get("text")
        if not isinstance(inner, str):
            raise RuntimeError(f"missing inner content: {envelope!r}")
        return json.loads(inner)


def check(name: str, cond: bool, detail: str = "") -> bool:
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {name}{(' — ' + detail) if detail else ''}")
    return cond


def main(argv: list[str]) -> int:
    worker_url = argv[1] if len(argv) > 1 else DEFAULT_WORKER_URL
    print(f"smoke target: {worker_url}\n")

    failures = 0

    # Test 1: /health advertises the docs tool.
    print("test 1: /health includes 'docs' in tools[]")
    health_req = urllib.request.Request(
        f"{worker_url.rstrip('/')}/health",
        headers={"user-agent": USER_AGENT},
    )
    with urllib.request.urlopen(health_req, timeout=10) as resp:
        health = json.loads(resp.read().decode())
    if not check("/health 200 + tools[] contains 'docs'",
                 "docs" in (health.get("tools") or []),
                 f"got tools={health.get('tools')!r}"):
        failures += 1
    print()

    # Set up MCP session for the rest of the tests.
    client = McpClient(worker_url)
    try:
        client.initialize()
        print(f"  (mcp session: {client.session_id[:16]}...)\n")
    except Exception as e:
        print(f"  [FAIL] initialize handshake failed: {e}")
        return 1

    # Test 2: docs(depth=1) returns a non-empty answer with at least one canon source URI.
    print("test 2: docs(depth=1) returns canon source for the Charis SIL question")
    result_d1 = client.call_tool(
        "docs",
        {"query": "what fonts does the container bundle?", "depth": 1},
    )
    if not check("answer is non-empty",
                 isinstance(result_d1.get("answer"), str) and len(result_d1["answer"]) > 0,
                 f"got answer={(result_d1.get('answer') or '')[:80]!r}"):
        failures += 1
    if not check("sources[] non-empty with klappy:// URIs",
                 bool(result_d1.get("sources"))
                 and all(s.get("uri", "").startswith("klappy://") for s in result_d1["sources"]),
                 f"got {len(result_d1.get('sources', []))} sources"):
        failures += 1
    answer_text = (result_d1.get("answer") or "") + json.dumps(result_d1.get("sources", []))
    if not check("response mentions Charis (case-insensitive)",
                 "charis" in answer_text.lower()):
        failures += 1
    if not check("governance_source = knowledge_base",
                 result_d1.get("governance_source") == "knowledge_base"):
        failures += 1
    print()

    # Test 3: docs(depth=2) returns enriched top doc content.
    print("test 3: docs(depth=2) returns full top doc")
    result_d2 = client.call_tool(
        "docs",
        {"query": "what fonts does the container bundle?", "depth": 2},
    )
    top_snippet_d1 = (result_d1.get("sources") or [{}])[0].get("snippet", "")
    top_snippet_d2 = (result_d2.get("sources") or [{}])[0].get("snippet", "")
    if not check("depth=2 top-source snippet is longer than depth=1 (full doc fetched)",
                 len(top_snippet_d2) > len(top_snippet_d1),
                 f"d1={len(top_snippet_d1)} chars, d2={len(top_snippet_d2)} chars"):
        failures += 1
    print()

    # Test 4: graceful no-result behavior.
    print("test 4: docs() with nonsense query degrades gracefully")
    result_nope = client.call_tool(
        "docs",
        {"query": "xyzzyfrobnozzlewibblefoo", "depth": 1},
    )
    # Either: (a) no hits found → answer null, sources [], governance kb;
    # or: (b) BM25 found weak matches; either way the call must not throw.
    if not check("no-result call did not error (returned a structured response)",
                 isinstance(result_nope, dict)):
        failures += 1
    print()

    # Summary
    print()
    if failures == 0:
        print("RESULT: PASS — docs tool live and behaving per spec.")
        return 0
    print(f"RESULT: FAIL — {failures} check(s) failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
