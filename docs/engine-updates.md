# Engine candidates and release evidence

`engine-lock.json` pins PTXprint and usfmtc independently to immutable commits.
The initial candidate is PTXprint 3.1.6 plus usfmtc e72a391. A pair is a candidate,
not evidence of compatibility. The container replaces upstream's mutable usfmtc
URL, verifies the fetched PTXprint commit, runs pip check, and retains the TeX
macro and bundled-font copies. The obsolete markdown_it workaround is removed:
3.1.6 declares markdown_it-py, equivalent to markdown-it-py under PyPI normalization.
Other transitive Python and apt dependencies are not locked; do not claim a fully
reproducible image. Increment render_revision for other renderer-affecting changes.

## Cache and provenance

The returned payload_hash remains the canonical input digest. New job IDs and R2
names use SHA256(`ptxprint-render-v1:<engine fingerprint>:<payload hash>`).
The engine fingerprint is SHA256 of recursively sorted, compact JSON lock bytes.
Identical inputs on different engine locks cannot reuse an older PDF. Existing
objects are retained, and old result URLs/job IDs remain readable. Rollback may
reuse only artifacts from the restored engine identity.

Worker /health and submit results include engine_fingerprint; /health also includes
the lock. Container /health includes installed_ptxprint. A mismatched Worker and
container pair refuses jobs with HTTP409 instead of serving a mixed-engine result.

## Validation and promotion

Engine image smoke builds the actual Dockerfile and renders the existing pinned
public-domain bsb-jhn-empirical.json working John fixture without a production callback. It verifies PDF magic,
zero exit status, presence of TeX log and no TeX error lines; artifacts include PDF,
log and engine provenance for independent review. This does not prove layout or
font fidelity, study notes/front matter, diglot, RTL or other multilingual cases.
Those representative checks and exact-head independent review remain release gates.

This PR must not deploy production while the existing missing DEV/staging hold
remains unresolved. Main pushes automatically deploy production. Separate stateful
DEV/staging environments or a documented captain ruling are required; a successful
container CI run is not staging evidence. No cache deletion, secrets, bindings or
DNS changes are included. Coordinate version/changelog and existing PR59 package
ownership before promotion; this candidate deliberately leaves those files alone.

## Automated proposals
Weekly/manual updater selects strictly newer stable semver tags using GitHub tags API
and pins the resolved commit. It intentionally preserves the explicit usfmtc pin;
compatibility-driven usfmtc bumps require a deliberate paired change and image evidence.
One open engine-candidate PR blocks additional proposals. Existing branches are never
force-pushed. Candidate PR is draft, image smoke explicitly dispatched, no merge or
deploy command. Updater requires repository Actions PR creation permission; a refusal
fails visibly rather than expanding permission. GITHUB_TOKEN PR checks may require
workflow approval. The updater is not active before this workflow lands on main.

3.1.6 real render uncovered an unconditional gi/Gtk import through report→parlocs.
The image includes Bookworm Python3.11 GI/Cairo bindings and Gtk3 typelib, exposed
to the matching Python3.11 runtime. render_revision2 separates this image change.

Smoke fixture correction: minimal-payload.json has no Settings.xml/config and its
own TODO says it may not render; the 3.1.6 run exited0 without PDF. That unresolved
minimal-config behavior is not called a pass. CI now uses the existing documented
working bsb-jhn-empirical fixture with its config materialized, not a newly weakened
assertion. The test still requires an actual fresh PDF and clean TeX log.

Broader baseline smoke runs configured John, Psalms (poetry) and Jude from existing
fixtures in fresh scratch directories, retaining separate PDFs and logs. These are
English/Gentium checks, not multilingual, diglot or study-bible certification.

## Observed compatibility receipts (2026-11-13)
Candidate3.1.6/e72a391 (usfmtc0.4.10), revision2 rendered configured John61pages,
Psalms192pages and Jude3pages in run43523712400; artifact14083288669. John pages1/31/61,
Psalms1/96/192 and Jude1/3 inspected independently without obvious clipping/overlap.
Psalms192 matches its fixture README; root README184 was stale and is corrected.
Controlled3.0.20/current-usfmtc experiment43524557412 failed with
`PTXEmitter.tag() got an unexpected keyword argument 'prefix'`; artifact14083414395.
This does not diagnose the already-built production image or recreate its historical
mutable dependencies. The diagnostic baseline job is disabled after retaining evidence.

Live updater integration43524109242 successfully discovered upstream and pushed
engine-integration-test/43524109242-1, but GitHub refused PR creation:
`GitHub Actions is not permitted to create or approve pull requests (createPullRequest)`.
No PR was created, dispatch not reached, no identity workaround or permission change.
The live test is disabled pending owner-approved repository permission repair.
Default-branch schedule activation and real bot draft/dispatch remain unverified.

## Rollback unit

Restore the known-good complete Worker/container image pair, not only the PTXprint version. The controlled 3.0.20/current-usfmtc pair failed with `PTXEmitter.tag()` unexpected `prefix`. The lock is not a full transitive image pin.

## Bot workflow approval and staging path

GitHub-token-created pull-request checks may require approval by a user with write access. Allowing PR creation alone does not prove unattended checks; explicitly dispatched smoke must be verified end to end after permission repair. No new credential or identity fallback is authorized by this design.

Before production promotion, provision a separately named staging Worker with its own Durable Object namespace, output and snapshot R2 buckets, and telemetry dataset. Use a separate Wrangler config (not an unconfigured `--env` shortcut); point WORKER_URL to staging and disable scheduled snapshots. Do not reuse production output bindings or credentials. Deploy the exact reviewed candidate there only after resource/deployment authority is established. Exercise submit → polling → artifact upload → cache hit, then a controlled render-revision change → cache miss, plus mismatch409 and cancellation. Record actual endpoint, image/Worker identity and receipts. Current repository config is production-only; no isolated resources have been created or deployment performed by this PR.
