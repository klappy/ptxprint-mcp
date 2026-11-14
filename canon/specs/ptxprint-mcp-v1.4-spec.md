---
title: "PTXprint MCP v1.4 — Engine-qualified rendering"
audience: agent
exposure: working
voice: instructional
stability: working
tags: ["ptxprint", "spec", "cache", "engine"]
canonical_status: canon_candidate
version: "v1.4-draft"
created_at: "2026-11-13T00:00:00Z"
supersedes: "v1.3 for engine identity and cache addressing only"
---

# PTXprint MCP v1.4

> **What this answers.** How do pinned engine updates change job identity, caching, diagnostics and release verification? This is the proposed 0.5.0 contract, not a claim of production deployment. Other v1.3 behavior remains unchanged.

## Identity and compatibility

The public payload schema and `payload_hash = sha256(canonical_json(payload))` are unchanged. `engine_fingerprint` is SHA-256 of recursively key-sorted compact JSON of `engine-lock.json`. The lock contains schema 1, PTXprint version and peeled immutable commit, usfmtc immutable commit, and render revision.

`render_id = sha256("ptxprint-render-v1:" + engine_fingerprint + ":" + payload_hash)` becomes the job ID and output-key prefix. Identical inputs under a changed lock produce a different job/cache identity. Old objects and job IDs are not deleted or rewritten; callers must not equate `job_id` with `payload_hash`. Cache misses after upgrade are expected.

## Diagnostics and mismatch handling

Worker health and submit results expose the engine fingerprint. Container health additionally attests installed PTXprint/usfmtc versions and the pinned usfmtc direct URL. A Worker/container fingerprint mismatch is rejected with HTTP 409 before execution. Uploaded log headers record the fingerprint and lock. The wrapper version is separate from the engine version.

## Updates and release gates

The scheduled updater selects stable upstream semantic tags and resolves their peeled commits. It preserves the reviewed usfmtc pin, creates a draft PR and explicitly requests smoke validation. It never approves, merges or deploys. Matching partial runs repair missing PR/dispatch without overwriting reviewed commits. Repository permission to let Actions create PRs is required; no credential fallback bypasses a denial.

Real image tests must cover configured John, Psalms and Jude; Jude also exercises the production Python job handler with local upload/callback captures. These are not deployed Worker/R2 end-to-end validation. Full stateful staging, exact-head independent review, required release approval and production post-deploy checks remain gates.

## Limits and rollback

The lock does not freeze all transitive apt/Python dependencies, so it is not a complete reproducible-image digest. Minimal unconfigured input remains an observed no-PDF failure; no guarantee is added here. English fixtures do not prove diglot, study or all-language parity.

Rollback restores the previously verified complete Worker and container image identity together. Downgrading only PTXprint while retaining current usfmtc is known to fail (3.0.20/current usfmtc: PTXEmitter.tag prefix argument). Never manufacture that pair as a rollback.
