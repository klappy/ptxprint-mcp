#!/usr/bin/env python3
"""
docs-tool smoke — session 13.

Verifies the `docs` tool against a live PTXprint MCP deploy.

Usage:
    pip install --user mcp   # one-time
    python3 smoke/docs-smoke.py [worker_url]

Default worker_url: https://ptxprint-mcp.klappy.workers.dev

Exits non-zero on any failure. Prints a one-line PASS/FAIL summary.

Uses the official Model Context Protocol Python SDK
(`mcp.client.streamable_http`) for the MCP transport. The SDK handles
the initialize handshake, Mcp-Session-Id tracking, and SSE framing.
"""

from __future__ import annotations

import asyncio
import json
import sys
import urllib.request
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

DEFAULT_WORKER_URL = "https://ptxprint-mcp.klappy.workers.dev"
USER_AGENT = "ptxprint-mcp-docs-smoke/0.1"


def check(name: str, cond: bool, detail: str = "") -> bool:
    mark = "PASS" if cond else "FAIL"
    print(f"  [{mark}] {name}{(' — ' + detail) if detail else ''}")
    return cond


def call_docs(session_result: Any) -> dict[str, Any]:
    """Unwrap an MCP CallToolResult whose first content block is a JSON string."""
    content = session_result.content
    if not content:
        raise RuntimeError(f"empty content in tool result: {session_result!r}")
    text = getattr(content[0], "text", None)
    if not isinstance(text, str):
        raise RuntimeError(f"first content block is not text: {content[0]!r}")
    return json.loads(text)


async def run(worker_url: str) -> int:
    print(f"smoke target: {worker_url}\n")
    failures = 0

    # Test 1: /health advertises the docs tool. (Plain HTTP, not MCP.)
    print("test 1: /health includes 'docs' in tools[]")
    health_req = urllib.request.Request(
        f"{worker_url.rstrip('/')}/health",
        headers={"user-agent": USER_AGENT},
    )
    with urllib.request.urlopen(health_req, timeout=10) as resp:
        health = json.loads(resp.read().decode())
    if not check(
        "/health 200 + tools[] contains 'docs'",
        "docs" in (health.get("tools") or []),
        f"got tools={health.get('tools')!r}",
    ):
        failures += 1
    print()

    # Set up an MCP session for the rest of the tests.
    mcp_url = f"{worker_url.rstrip('/')}/mcp"
    async with streamablehttp_client(mcp_url) as (read, write, _get_session_id):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print(f"  (mcp session initialized against {mcp_url})\n")

            # Test 2: docs(depth=1) returns canon source for the Charis question.
            print("test 2: docs(depth=1) returns canon source for the Charis SIL question")
            r1 = await session.call_tool(
                "docs",
                {"query": "what fonts does the container bundle?", "depth": 1},
            )
            result_d1 = call_docs(r1)
            if not check(
                "answer is non-empty",
                isinstance(result_d1.get("answer"), str) and len(result_d1["answer"]) > 0,
                f"got answer={(result_d1.get('answer') or '')[:80]!r}",
            ):
                failures += 1
            if not check(
                "sources[] non-empty with klappy:// URIs",
                bool(result_d1.get("sources"))
                and all(s.get("uri", "").startswith("klappy://") for s in result_d1["sources"]),
                f"got {len(result_d1.get('sources', []))} sources",
            ):
                failures += 1
            answer_text = (result_d1.get("answer") or "") + json.dumps(
                result_d1.get("sources", [])
            )
            if not check(
                "response mentions Charis (case-insensitive)",
                "charis" in answer_text.lower(),
            ):
                failures += 1
            if not check(
                "governance_source = knowledge_base",
                result_d1.get("governance_source") == "knowledge_base",
            ):
                failures += 1
            print()

            # Test 3: docs(depth=2) returns enriched top doc content.
            print("test 3: docs(depth=2) returns full top doc")
            r2 = await session.call_tool(
                "docs",
                {"query": "what fonts does the container bundle?", "depth": 2},
            )
            result_d2 = call_docs(r2)
            top_d1 = (result_d1.get("sources") or [{}])[0].get("snippet", "")
            top_d2 = (result_d2.get("sources") or [{}])[0].get("snippet", "")
            if not check(
                "depth=2 top-source snippet is longer than depth=1 (full doc fetched)",
                len(top_d2) > len(top_d1),
                f"d1={len(top_d1)} chars, d2={len(top_d2)} chars",
            ):
                failures += 1
            print()

            # Test 4: graceful no-result behavior.
            print("test 4: docs() with nonsense query degrades gracefully")
            r4 = await session.call_tool(
                "docs",
                {"query": "xyzzyfrobnozzlewibblefoo", "depth": 1},
            )
            result_nope = call_docs(r4)
            if not check(
                "no-result call did not error (returned a structured response)",
                isinstance(result_nope, dict),
            ):
                failures += 1
            print()

    if failures == 0:
        print("RESULT: PASS — docs tool live and behaving per spec.")
        return 0
    print(f"RESULT: FAIL — {failures} check(s) failed.")
    return 1


def main(argv: list[str]) -> int:
    worker_url = argv[1] if len(argv) > 1 else DEFAULT_WORKER_URL
    return asyncio.run(run(worker_url))


if __name__ == "__main__":
    sys.exit(main(sys.argv))
