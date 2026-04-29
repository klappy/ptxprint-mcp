#!/usr/bin/env python3
"""
docs-tool smoke — session 13.

Verifies the `docs` tool against a live PTXprint MCP deploy.

Usage:
    python3 smoke/docs-smoke.py [worker_url]

Default worker_url: https://ptxprint-mcp.klappy.workers.dev

Exits non-zero on any failure. Prints a one-line PASS/FAIL summary.
"""

from __future__ import annotations

import json
import sys
import urllib.request
from typing import Any

DEFAULT_WORKER_URL = "https://ptxprint-mcp.klappy.workers.dev"
USER_AGENT = "ptxprint-mcp-docs-smoke/0.1"


def post_mcp(worker_url: str, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": name, "arguments": arguments},
    }
    req = urllib.request.Request(
        f"{worker_url.rstrip('/')}/mcp",
        data=json.dumps(body).encode(),
        method="POST",
        headers={
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
            "user-agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        text = resp.read().decode()

    # Parse SSE-or-JSON.
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

    # Test 2: docs(depth=1) returns a non-empty answer with at least one canon source URI.
    print("test 2: docs(depth=1) returns canon source for the Charis SIL question")
    result_d1 = post_mcp(
        worker_url,
        "docs",
        {"query": "what fonts does the container bundle?", "depth": 1},
    )
    if not check("answer is non-empty",
                 isinstance(result_d1.get("answer"), str) and len(result_d1["answer"]) > 0):
        failures += 1
    if not check("sources[] non-empty with klappy:// URIs",
                 bool(result_d1.get("sources"))
                 and all(s.get("uri", "").startswith("klappy://") for s in result_d1["sources"])):
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
    result_d2 = post_mcp(
        worker_url,
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
    result_nope = post_mcp(
        worker_url,
        "docs",
        {"query": "xyzzyfrobnozzlewibblefoo", "depth": 1},
    )
    # Either: (a) no hits found → answer null, sources [], governance kb;
    # or: (b) BM25 found weak matches; either way the call must not throw.
    if not check("no-result call did not error",
                 isinstance(result_nope, dict) and "error" not in result_nope.get("error", "")):
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
