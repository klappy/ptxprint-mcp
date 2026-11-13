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
public-domain John fixture without a production callback. It verifies PDF magic,
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
