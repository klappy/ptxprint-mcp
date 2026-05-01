---
uri: klappy://canon/articles/hero-metrics-and-storytelling
title: "Hero Metrics & Storytelling — Total Pages Typeset, X-Ray Timelines, and the Public Narrative"
audience: project
exposure: working
voice: instructional
stability: working
tags: ["canon", "article", "telemetry", "hero-metrics", "storytelling", "pages-typeset", "x-ray", "waterfall", "phase-timing", "snapshot", "long-term-retention", "public-dashboard", "vodka-architecture", "ptxprint", "mcp", "v1.2-aligned", "ptxprint_telemetry", "analytics-engine"]
date: 2026-04-30
derives_from: "klappy://canon/governance/telemetry-governance, klappy://canon/specs/ptxprint-mcp-v1-2-spec"
companion_to: "klappy://canon/governance/telemetry-governance"
canonical_status: non_canonical
governs: "How telemetry already collected per the governance schema is composed into the project's public hero stat, X-Ray per-job timeline view, weekly/monthly storytelling rollups, and snapshot strategy for surviving the 90-day Analytics Engine retention window."
status: draft_pending_fresh_review
---

# Hero Metrics & Storytelling — Total Pages Typeset, X-Ray Timelines, and the Public Narrative

> Telemetry governance defines what is allowed to be collected and why. This article defines what — of everything that is allowed — actually tells the story. The hero metric is **total pages of scripture typeset, lifetime**. The X-Ray view is the **per-job phase waterfall**. The narrative is **shared infrastructure quietly producing publication-quality scripture, measured in pages put into the world**. Nothing in this article adds a single new schema slot, a single new server opinion, or a single new privacy boundary. Everything is composition over the existing `ptxprint_telemetry` dataset documented in `klappy://canon/governance/telemetry-governance`.

---

## Why This Article Exists Separately From Governance

`klappy://canon/governance/telemetry-governance` is **constraint canon**. It specifies what fields are collected, what is excluded, the privacy floor, the security guards, the schema hygiene rules. Constraint canon changes only when the data contract changes.

This article is **derived-practice canon**. It specifies which compositions of the existing data tell the story worth telling — a hero stat, a debugging waterfall, a public dashboard, a long-term snapshot strategy. Practice canon changes whenever the maintainer learns a better way to tell the story; the schema underneath stays the same.

Mixing the two would have produced one of two failure modes:

1. **Governance creep** — the storytelling section grows, gets opinionated, and someone treats "the dashboard should show X" as a contract that requires a schema change to honor. The schema is supposed to be answer-driven, not dashboard-driven.
2. **Practice ossification** — the governance review gate (PR review by a fresh session) starts blocking presentation tweaks. Story telling should be cheap to revise; data contracts should be expensive.

Splitting them keeps each free to evolve at its own cadence.

---

## The Hero Stat — Total Pages Typeset, Lifetime

### Why Pages, Not Jobs Or Builds

The choice of hero metric is a values statement disguised as a number.

A jobs-completed counter rewards activity. A builds-shipped counter rewards throughput. Neither maps to the mission. The mission is **scripture put into the world** — and a 1,200-page Old Testament build is 1,200× more of that than a 1-page proof print, even though both increment "jobs" by exactly one.

Pages typeset is the closest available proxy for the actual unit of value the project produces. It is:

- **Mission-aligned** — every page typeset is a page of formatted scripture that did not exist in publication-quality form before the run. A team somewhere can print, fold, and distribute it.
- **Already in the schema** — `pages_count` is `double10` per `klappy://canon/governance/telemetry-governance` § "Numeric Values (Doubles)". It is populated only on `job_terminal` events with `failure_mode = success`. Adding it to the dashboard requires zero schema change.
- **Honest** — soft failures and hard failures do not contribute. A degraded run that emitted a PDF without pictures (the `klappy://canon/articles/failure-mode-taxonomy` "soft" case) does not count toward the hero stat. The number rewards real output, not partial output.
- **Free to compute** — it is one `SUM` over one column with one `WHERE` clause. The query runs in milliseconds against Analytics Engine.

### The Query

```sql
SELECT
  SUM(pages_count * _sample_interval) AS pages_typeset_lifetime
FROM ptxprint_telemetry
WHERE event_type = 'job_terminal'
  AND failure_mode = 'success'
```

Note the `* _sample_interval` factor. Cloudflare Analytics Engine samples writes under load; multiplying each row's value by `_sample_interval` recovers the unsampled aggregate. This is the same pattern documented in governance for count aggregations, applied to a numeric sum.

The lifetime window is unbounded — no `WHERE timestamp > NOW() - INTERVAL '...'`. This intentionally exposes the 90-day retention boundary: lifetime totals computed against raw Analytics Engine data will silently miss everything older than 90 days. The fix is in § "Long-Term Retention Strategy" below.

### The Tagline Form

The hero stat is meant to be displayed as one number with one label. Examples:

- **N,NNN,NNN pages of scripture typeset by PTXprint MCP**
- **N,NNN,NNN pages typeset · M,MMM successful builds · K,KKK distinct teams**

Avoid framings that imply unique books, unique translations, or unique people. The data does not support those claims (no project IDs, no book codes, only opt-in consumer labels). It does support pages, builds, and distinct labels.

---

## The X-Ray View — Per-Job Phase Waterfall

### What It Is

A waterfall view of one specific job: queue wait, input fetch, typesetting, autofill, upload, end-to-end. Each phase as a horizontal bar with its `duration_ms`. The total height of the bar shows where time actually went.

This is the diagnostic artifact that turns "your job took 47 seconds" into "your job took 47 seconds, of which 38 seconds was the typesetting phase, 4 seconds was input fetch, 3 seconds was upload, and the rest was queue wait." It is the difference between a number and an explanation.

### Why It Stays Vodka-Pure

The data is already collected. Per governance § "Job Lifecycle Events", the Container emits a `job_phase` event at every phase transition with `duration_ms` recording how long the **just-completed** phase took. Six phase values exist in the enum (`queued | fetching_inputs | typesetting | autofill | uploading | done`). Every dispatched job produces a complete sequence.

The X-Ray view is a query over that data, not a new event class. The server adds zero new opinions. The waterfall is a visualization choice the consumer makes.

### The Query

A single job's waterfall is keyed by `payload_hash_prefix`. Per governance, the prefix is the explicit pseudonymous boundary — 8 hex chars, designed to collide privacy-positively when two teams typeset the same public Bible. Querying by it for a specific job is the documented use case.

```sql
SELECT
  phase,
  duration_ms,
  timestamp
FROM ptxprint_telemetry
WHERE event_type = 'job_phase'
  AND payload_hash_prefix = ?
ORDER BY timestamp ASC
```

This returns the phase sequence for one job in chronological order. The consumer composes the waterfall by stacking the durations.

### Aggregate Phase-Distribution View

The aggregate "where does time go on average" view is in governance § "Where time goes — average phase duration". The X-Ray view is its per-job complement: governance shows the distribution shape across all jobs; the X-Ray shows one specific bar inside that distribution.

Useful pairing: render both side-by-side in the per-job result page. "Your job was 47 seconds. Average for all jobs is 38 seconds. Here's why yours was 9 seconds slower" — the typesetting phase took 12 seconds longer than typical, autofill took 3 seconds less, the rest was within 1 second of average.

### What X-Ray Is Not

The X-Ray view is not a profiler. It does not break time down within a phase. If `typesetting` took 38 seconds, the X-Ray says `typesetting: 38000ms` and stops. Sub-phase profiling (e.g., XeTeX pass 1 vs. pass 2 vs. pass 3) is **not in the schema today** and should not be added speculatively per governance § "Schema Hygiene". If sub-phase distinctions become operationally necessary, the path is: amend governance to define the schema slot, ship the Container change to emit it, then update this article to add the deeper waterfall query.

---

## Storytelling Queries — The Weekly And Monthly Rollups

The hero stat is the headline. These are the supporting numbers that make the headline credible.

### Pages typeset this week

```sql
SELECT
  SUM(pages_count * _sample_interval) AS pages_typeset
FROM ptxprint_telemetry
WHERE event_type = 'job_terminal'
  AND failure_mode = 'success'
  AND timestamp > NOW() - INTERVAL '7' DAY
```

### Pages typeset by week, last 90 days

```sql
SELECT
  toStartOfWeek(timestamp) AS week,
  SUM(pages_count * _sample_interval) AS pages_typeset,
  SUM(_sample_interval) AS successful_builds
FROM ptxprint_telemetry
WHERE event_type = 'job_terminal'
  AND failure_mode = 'success'
  AND timestamp > NOW() - INTERVAL '90' DAY
GROUP BY week
ORDER BY week ASC
```

The `ORDER BY week ASC` is intentional. Storytelling rollups read left-to-right as a trajectory; they should ascend through time so the eye lands on the most recent value last. Operational dashboards use `DESC` so the freshest row is at the top; storytelling charts use `ASC` so the trend points forward.

### Pages typeset per distinct team this month

```sql
SELECT
  consumer_label,
  SUM(pages_count * _sample_interval) AS pages_typeset,
  SUM(_sample_interval) AS successful_builds
FROM ptxprint_telemetry
WHERE event_type = 'job_terminal'
  AND failure_mode = 'success'
  AND timestamp > NOW() - INTERVAL '30' DAY
  AND consumer_label != 'unknown'
GROUP BY consumer_label
ORDER BY pages_typeset DESC
LIMIT 25
```

The `consumer_label != 'unknown'` filter excludes traffic that did not self-identify. Per governance § "Consumer Identification Model", unidentified traffic is the default; this query intentionally rewards identification by surfacing only the labels that participated in the transparency leaderboard.

### Time saved by cache hits

A cache hit returns in seconds and consumes essentially zero Container minutes. A cache miss dispatches a fresh build that may take 30 minutes. The time saved by the cache layer is one of the strongest arguments for content-addressed storage.

```sql
SELECT
  SUM(IF(cache_outcome = 'hit', _sample_interval, 0)) AS cache_hits,
  AVG(IF(event_type = 'job_terminal', duration_ms, NULL)) AS avg_dispatch_ms,
  SUM(IF(cache_outcome = 'hit', _sample_interval, 0)) *
    AVG(IF(event_type = 'job_terminal', duration_ms, NULL)) / 1000 / 60 AS minutes_saved_estimate
FROM ptxprint_telemetry
WHERE timestamp > NOW() - INTERVAL '30' DAY
```

This is an estimate, not a measurement. The assumption is that the average cache hit, had it missed, would have taken roughly the average dispatch time. That assumption is reasonable for a content-addressed cache (popular payloads probably do not deviate wildly from the population mean) but it is not exact. Frame it accordingly: "approximately N hours of Container time saved by cache hits this month" — never an exact number.

### Overfull-box health trend

Overfull `\hbox` warnings are the most common silent-degradation signal. A jump in average overfull count per build often precedes user complaints about layout quality.

```sql
SELECT
  toStartOfWeek(timestamp) AS week,
  AVG(overfull_count) AS avg_overfull,
  quantile(0.95)(overfull_count) AS p95_overfull,
  SUM(_sample_interval) AS builds
FROM ptxprint_telemetry
WHERE event_type = 'job_terminal'
  AND failure_mode IN ('success', 'soft')
  AND timestamp > NOW() - INTERVAL '90' DAY
GROUP BY week
ORDER BY week ASC
```

This is operational, not strictly storytelling — but it pairs with the hero stat as a quality watch. "We typeset N pages this week, with average overfull count flat at K — output volume is up, quality stable." That's a healthy story. "We typeset N pages this week, average overfull jumped from K to 4K" is the silent-degradation alarm.

---

## Long-Term Retention Strategy — Surviving The 90-Day Window

### The Problem

Per governance § "Long-Term Retention", Cloudflare Analytics Engine retains data for 3 months. After 90 days, the raw events are gone. A lifetime hero stat computed against raw Analytics Engine data is therefore **not lifetime** — it is "last 90 days." Six months in, that gap stops being acceptable for a stat that is supposed to be monotonic.

Governance correctly notes this is a known constraint and explicitly defers the snapshot mechanism: "No automated weekly snapshot job exists in v1." This article specifies the snapshot mechanism so the deferral can be closed when implementation catches up.

### The Snapshot Pattern

A Worker Cron Trigger runs once a week. It executes a small set of aggregate queries against Analytics Engine, reads the results, and appends one row per query to a durable store. The durable store persists past the Analytics Engine retention window; lifetime totals are then computed by summing the snapshot rows, not by re-querying raw events.

The snapshot tier is not the source of truth. Raw Analytics Engine within the retention window stays authoritative for the last 90 days. The snapshot is the **archive of what raw Analytics Engine knew about each week, captured before the data expired**. Lifetime totals = sum of weekly snapshots + current incomplete week from raw.

### Storage Choice — R2

Three candidates exist for the snapshot store: Cloudflare KV, R2, or a canon-article markdown file.

- **KV** is fast and simple but has no schema, awkward for tabular data, and inspecting the contents requires either the dashboard or an API call.
- **R2** is object storage with no schema constraints, supports straightforward append patterns (one JSONL row per snapshot), and can be made publicly readable so the same transparency principle as `telemetry_public` extends to the archive.
- **A canon markdown file** is human-visible and version-controlled but pollutes the canon repo with machine-generated data and creates merge conflicts if humans edit nearby content.

**R2 is the recommended store.** A single bucket (`ptxprint-telemetry-snapshots`) with one object per metric (`pages-typeset-weekly.jsonl`, `cache-hits-weekly.jsonl`, etc.) keeps the snapshot independent per metric, supports cheap reads, and exposes the archive at a stable public URL.

### What Gets Snapshotted

Only the queries this article designates as load-bearing for hero/storytelling rollups:

- Weekly `pages_typeset` (success only) — the hero stat archive
- Weekly `successful_builds` count — the supporting denominator
- Weekly `cache_hits` and `cache_misses` — for cache-effectiveness trend beyond 90 days
- Weekly `failure_mode` distribution — for soft-failure rate trend beyond 90 days

Snapshotting raw events would defeat the privacy floor and the retention design. Only **pre-aggregated counts** go into the archive. The granularity is the week. Sub-week resolution is not preserved past 90 days; that is intentional — anyone needing per-day historical data should query within the window before it expires.

### The Snapshot Schema

One JSONL line per snapshot row, written to R2:

```json
{
  "metric": "pages_typeset_weekly",
  "week_start": "2026-04-27",
  "value": 14823,
  "snapshotted_at": "2026-05-04T00:00:00Z",
  "source": "ptxprint_telemetry"
}
```

The `snapshotted_at` field captures when the snapshot was taken (not when the data describes), so a re-snapshot can detect and skip already-archived weeks. The `source` field reserves space for future migrations if the dataset name ever changes.

### The Cron Schedule

Once a week, on Monday at 00:00 UTC. Captures the just-completed week before any chance the data starts expiring (90 days is well beyond a week of safety margin). Cron runs are idempotent — re-running a snapshot for a week already archived overwrites with the same values. No deduplication logic needed in the snapshot writer.

### Lifetime Hero Stat — The Composite Query

Lifetime totals once snapshots exist:

```text
lifetime_pages_typeset =
  SUM(value FROM R2 ptxprint-telemetry-snapshots/pages-typeset-weekly.jsonl)
  +
  SELECT SUM(pages_count * _sample_interval)
  FROM ptxprint_telemetry
  WHERE event_type = 'job_terminal'
    AND failure_mode = 'success'
    AND timestamp >= toStartOfWeek(NOW() - INTERVAL '7' DAY)
```

Read the snapshot archive, sum the historical weeks, add the current incomplete week from raw. The current week is not yet snapshotted, so it must come from raw; everything older comes from the archive even if still within the 90-day window (consistency is more important than freshness past the current week).

This composition is what the public dashboard's hero number actually queries. Document it as a single tool — `get_lifetime_hero_stat()` is a candidate composite query, not a new schema slot.

### Rebuild From Raw — The Bootstrap

Until the cron runs once, the snapshot archive is empty. The bootstrap procedure: a one-shot script reads all weeks within the current 90-day window from raw Analytics Engine and writes them to the archive. After bootstrap, the lifetime stat reflects only the last 90 days; future weeks accumulate normally.

This is a one-time data loss for any pages typeset before the bootstrap point. The mitigation is to schedule the bootstrap as soon as the snapshot mechanism ships — every week of delay between v1.2 telemetry shipping and snapshot bootstrapping is a week of pages that will not survive the retention window.

---

## Public Dashboard Composition

The dashboard is the user-facing surface. It is what someone seeing PTXprint MCP for the first time encounters. The composition decisions here matter as much as the metric choices.

### Above The Fold — One Hero, Three Supports

```
                  N,NNN,NNN
            pages of scripture typeset

   M,MMM successful builds   ·   K,KKK distinct teams   ·   J,JJJ% cache hit rate
```

One number large enough to read from across the room. Three smaller numbers as supporting context. Nothing else above the fold. Resist the temptation to add a fourth or fifth number; each one dilutes the hero.

### Below The Fold — Three Charts

1. **Pages typeset per week, last 13 weeks** — a column chart showing trajectory. Adds the time dimension to the headline number.
2. **Phase distribution, last 30 days** — a stacked horizontal bar showing how time gets spent on average across `queued | fetching_inputs | typesetting | autofill | uploading`. Tells the reader what the system actually spends its time doing.
3. **Failure mix, last 30 days** — a stacked bar (or simple bar) showing `success | soft | hard | cancelled | timeout` as percentages. Honest about what does and doesn't work.

### What Not To Show On The Public Dashboard

- **Per-job X-Ray waterfalls.** The X-Ray view is a debugging artifact, not a public-facing one. It belongs on a per-job result page (the agent's tool response, the BT Servant relay message), not on the homepage.
- **Document leaderboard ranks.** Useful for the maintainer to see which canon docs do work. Not interesting to the average visitor. Belongs in a separate transparency page, not the headline dashboard.
- **Consumer leaderboard ranks beyond top 10.** Encouraging participation matters; surfacing a long tail of unidentified traffic does not.
- **Raw query interface.** `telemetry_public` is reachable from the docs page or the transparency page. It does not belong on the marketing dashboard. Visitors who want to query are a different audience than visitors who want to read the headline.

### The Labels

Words on a dashboard carry as much weight as numbers. Use **pages typeset** not "pages rendered" or "pages produced" — typesetting is what PTXprint does, and the verb belongs to the discipline. Use **distinct teams** not "users" or "consumers" — translation teams are the audience, and the noun honors them. Use **cache hit rate** not "efficiency percentage" — the reader who knows cache infrastructure understands immediately, and the reader who does not is not blocked.

Avoid "powered by AI", "intelligent typesetting", or any other adjective that introduces noise where the number itself does the work.

---

## Vodka Boundary Check

This article is canon. Canon is allowed to express opinion. The question is whether **the server** has acquired any new opinions as a consequence of this article shipping.

| Concern | Answer |
|---|---|
| Does this article add a schema slot? | No. Every metric used (`pages_count`, `duration_ms`, `phase`, `failure_mode`, `cache_outcome`, `payload_hash_prefix`, `consumer_label`, `overfull_count`) is already documented in `klappy://canon/governance/telemetry-governance` § "Structural Dimensions" and § "Numeric Values". |
| Does this article add a tool? | One candidate composite tool is named — `get_lifetime_hero_stat()`. It is a SQL composition over the existing `telemetry_public` interface plus an R2 read. If shipped, it is infrastructure (composition) not opinion (new collection). The minimum implementation can ship as a documented query the agent runs through the existing tool surface; promoting it to a dedicated tool is a Cron-and-R2 question, not a schema question. |
| Does this article add infrastructure? | One: the weekly Cron Trigger and R2 snapshot bucket described in § "Long-Term Retention Strategy". The Cron is generic ("read aggregate queries, write to R2") not domain-shaped. The R2 bucket holds aggregates only; no raw events, no privacy-floor surface widening. |
| Does this article move the privacy floor? | No. Every query filters on existing fields. The snapshot archive contains only weekly aggregates that are already public via `telemetry_public`. Two teams typesetting the same Bible still share a `payload_hash_prefix`; the archive cannot uniquely identify either. |
| Could this article be removed without consequence? | The article could be removed; the data underneath persists. What removal would lose: the maintainer's documented choice of which compositions tell the story, the hero-stat tagline, the snapshot recipe. Those would have to be re-derived. The cost is real but bounded — this article is load-bearing for narrative, not for operational correctness. |

The line passes. Storytelling and presentation choices live in canon (here). Schema, privacy, and security choices live in governance. Code lives in the server and changes only when governance changes.

---

## Future Hero Metrics — When They Justify Themselves

This section names hero candidates that **do not exist today** and the conditions under which they would justify a schema addition. Per governance § "Schema Hygiene", new slots are added only when a real operational question demands them. Speculative slots reproduce the oddkit `cache_tier` deprecation problem.

### Pages-by-script

"Pages typeset in Devanagari script" is a meaningful storytelling number. It would require either a new `script_family` enum populated by the Container at typeset time, or derivation from the `fonts` array in the payload. The Container has the information (it just shipped fonts to XeTeX) but does not currently emit it.

**Justification threshold:** when the project starts measurably serving non-Latin-script translation teams and a maintainer wants to show that publicly. Until then, "pages typeset" without script breakdown is honest.

### Books-typeset

Distinct count of books shipped (per build, per week, per lifetime). The payload contains `books`; `sources_count` is collected but does not equal book count (one source can contain multiple books; one book can come from multiple sources).

**Justification threshold:** when "pages" is not enough to communicate scope and "books" would meaningfully change the story. Probably never — pages is more granular and more honest.

### Time-saved estimate as a first-class metric

The cache time-saved query in § "Storytelling Queries" is an estimate computed at query time. Promoting it to a dashboard metric would warrant validating the estimate against real measurements (some sample of cache hits run through full dispatch to compare). 

**Justification threshold:** when someone asks "how much CPU did the cache save?" and the maintainer wants a more authoritative answer than "approximately."

### CO2 estimate

Cloudflare publishes regional carbon-intensity figures. Multiplied by Container minutes consumed, this gives a coarse CO2-per-build estimate that some audiences find compelling.

**Justification threshold:** when the project starts being asked sustainability questions and a credible-but-coarse number would be more useful than no number. The existing `duration_ms` per `job_phase` event is sufficient input; no schema change required.

### What Will NOT Become A Hero Metric

- **Anything per-project, per-language, per-region, per-team-name.** The privacy floor forbids this. The hero metric story is told without identifying who did the work.
- **Anything per-passage, per-book, per-verse.** Same reason. Pages aggregates content; book codes identify it.
- **Engagement metrics.** No "average session length", "return visitor rate", or similar — the project does not log sessions or visitors and should not start.

---

## Operating Principle

**Compose existing data into the story; never invent new data to make a story prettier.**

- The hero stat exists because `pages_count` already exists. If `pages_count` did not, the right move would be a governance amendment, not a workaround in this article.
- The X-Ray view exists because `job_phase` events with `duration_ms` already exist. Sub-phase profiling does not exist; this article does not pretend it does.
- The snapshot strategy preserves what is already collected, against a known retention boundary. It does not collect anything new.
- The public dashboard surfaces what exists in the most honest, most readable form. It does not embellish, gamify, or rebrand.

If a story worth telling cannot be told from the current schema, the answer is to amend governance — not to bend the storytelling article around what the schema does and does not allow.

---

## See Also

### PTXprint canon

- [Telemetry Governance — What PTXprint MCP Tracks and Why](klappy://canon/governance/telemetry-governance) — the data contract this article composes over
- [v1.2 Specification](klappy://canon/specs/ptxprint-mcp-v1-2-spec) — the tool surface the telemetry observes
- [Failure Mode Taxonomy](klappy://canon/articles/failure-mode-taxonomy) — the source of the `failure_mode` enum used in storytelling queries
- [Headless Operations Overview](klappy://canon/governance/headless-operations) — the agent-facing operational KB

### Upstream pattern (klappy.dev)

- [Vodka Architecture](klappy://canon/principles/vodka-architecture) — the design pattern the boundary check defends
- [DRY Canon — Says It Once](klappy://canon/principles/dry-canon-says-it-once) — the principle that justified splitting this article from governance
- [Maintainability — One Person, Indefinitely](klappy://canon/principles/maintainability-one-person-indefinitely) — the principle the hero stat ultimately serves
- [Verification Requires Fresh Context](klappy://canon/principles/verification-requires-fresh-context) — why this article carries `status: draft_pending_fresh_review`
