# Learning review — 2026-09-05-ptxprint-mcp-validate-and-fix

Status: prepared by bounded leaf learning cook; independent review and coordinator landing pending. Historical facts are attributed to the records below; only GitHub PR merge metadata was re-observed in this run. Source snapshot: `b2b043ae40c763cfa9366b351e103dd574a89533`. Original cargo is preserved.

## Intended outcome
Validate PTXprint live and repair empty documentation results.

## Delivered intervention and observations
PR51/52 merged; VERDICT supersedes owed-on-merge text with historical production retest. Cause was upstream result.hits versus result.data shape drift. Subsequent docs-v2 revision and R20 reveal that the first fix alone left docs/spec drift.

## Outcome limits
Unknown: current production behavior; validation is a historical result.

## Triple-loop learning
1. Fix the mistake: Keep the checker’s own XML and reproducibility mistakes separate from server failures.
2. Fix the producing system: Self-served bundled canon removed a fragile proxy assumption; R20 requires behavior and docs together, with PR56 providing the later correction.
3. Fix how learning works: Real questions and a fresh render exposed defects happy-path claims missed; later docs drift shows why a successful repair is not the end of learning.

## Disposition
Learning-closure candidate after independent review. Inconclusive outcomes and named successor work are retained, not treated as automatic blockers. No new implementation, public statement, messaging, approval, law change, monitor or financial commitment is authorized by this review. No measured attention/time/money saving is claimed.

## Evidence inventory
All top-level ticket cargo was retrieved. Nested design-system assets on the PoC are source assets, not outcome proof; retain their complete subtree on move. Binary images were not rendered for this historical learning audit. Thematic journals were read for subsequent corrections and outcomes, not used as automatic new backlog. The complete machine-readable retrieval packet accompanies review.

- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/CHECKLIST-RUN.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/CHECKLIST-RUN.md) — blob `c1f6b68dd062024af6033f2791bb80a465aa504d`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/DEBRIEF.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/DEBRIEF.md) — blob `b57a21a278fc34e08fd350cdb34d9d0ce60fd599`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/DELTA.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/DELTA.md) — blob `ea1831f221f9c36ee3f9daac1218cc790ea53608`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/FIRE-CHECK-RUN.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/FIRE-CHECK-RUN.md) — blob `98f68613766511760f4d2097b3fb4314b1009dca`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/LEARNING-CLAIM.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/LEARNING-CLAIM.md) — blob `6c6f4659f73247bf47cbc9e881e15828e0cd53d1`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/TICKET.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/TICKET.md) — blob `529fde3d1a57a13a75daaa5bcb0a65b2a6824436`.
- [rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/VERDICT.md](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/rail/4-plated/2026-09-05-ptxprint-mcp-validate-and-fix/VERDICT.md) — blob `ff5375c8b9b2147e71e85dddbea8601e01d92cf0`.
- [journal/2026-08-25-bt-servant-v3-cookbook.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-bt-servant-v3-cookbook.tsv) — blob `57ce729f5a41c6be755759bf71c19b8ef2d227fa`.
- [journal/2026-08-25-cookbook-bincy-tim-sweep.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-cookbook-bincy-tim-sweep.tsv) — blob `637c1137277f984403f502b6b3118711002873b5`.
- [journal/2026-08-25-cookbook-explore-research-loop.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-cookbook-explore-research-loop.tsv) — blob `042efc37dc5d5b5e4fae961925f442a35e5c2f2a`.
- [journal/2026-08-25-cookbook-issue-lane.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-cookbook-issue-lane.tsv) — blob `91fb3908beb53325e459b8f5a61a2b92427b3a93`.
- [journal/2026-08-25-cookbook-sweep-debt.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-cookbook-sweep-debt.tsv) — blob `fd8107a1076c3c734487cfe8a7cd4ae4e926bc12`.
- [journal/2026-08-25-cookbook-v3-session-brief.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-25-cookbook-v3-session-brief.tsv) — blob `e87e0610ef3e582594c21fcfe329c1077cb33b54`.
- [journal/2026-08-26-contributor-gratitude-recipe.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-26-contributor-gratitude-recipe.tsv) — blob `a94a0d9108bc7e773d55751ae4290d5ad6aec666`.
- [journal/2026-08-26-cookbook-pass-0004.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-26-cookbook-pass-0004.tsv) — blob `5d378205178eca9dd26ff077ede8ee6ff63c4755`.
- [journal/2026-08-27-3d-cookbook-order.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-27-3d-cookbook-order.tsv) — blob `3841b950da9fe76c637a8d65ecafc741b20e651d`.
- [journal/2026-08-27-cookbook-pass-0005.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-27-cookbook-pass-0005.tsv) — blob `961fab2444ad907ad975bdf2680820e150664aa6`.
- [journal/2026-08-27-cookbook-pass-0006.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-08-27-cookbook-pass-0006.tsv) — blob `4f59389aff770b11fc796210616509c13ac632bb`.
- [journal/2026-09-04-auggie-cookbook-open-study-notes-poc.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-04-auggie-cookbook-open-study-notes-poc.tsv) — blob `e2737241a563e8264d14b9b8d901f31eab578f03`.
- [journal/2026-09-04-auggie-cookbook-open-study-notes-titus.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-04-auggie-cookbook-open-study-notes-titus.tsv) — blob `c5ff38f87a705f584cb236331db0532bd65c5e2a`.
- [journal/2026-09-04-auggie-ptxprint-docs-v2.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-04-auggie-ptxprint-docs-v2.tsv) — blob `5b30791356518559917919a765272500804996b8`.
- [journal/2026-09-04-auggie-ptxprint-mcp-order.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-04-auggie-ptxprint-mcp-order.tsv) — blob `311f5c9fd182d18bcd82d5dd2b9848f58ad686db`.
- [journal/2026-09-05-auggie-explore-uw-trb.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-05-auggie-explore-uw-trb.tsv) — blob `7874aa57c31b06f28d202fe1c139f16c2f0b117d`.
- [journal/2026-09-05-auggie-titus-editions-pt-ar-hi.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-05-auggie-titus-editions-pt-ar-hi.tsv) — blob `4c43e16787475aea6392a228cfb0699f0bfb4dc2`.
- [journal/2026-09-05-auggie-titus-study-bible-ptxprint-spa.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-05-auggie-titus-study-bible-ptxprint-spa.tsv) — blob `ceb12eef08122ed6e075ed4394a30331f4102d23`.
- [journal/2026-09-05-auggie-titus-study-bible-ptxprint.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-05-auggie-titus-study-bible-ptxprint.tsv) — blob `362c927f7ba954c2d97edff8afd1050bb8e67fc3`.
- [journal/2026-09-05-auggie-titus-ult-tn.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-05-auggie-titus-ult-tn.tsv) — blob `f786902a8192e5b0dc864c0a420385d50590177e`.
- [journal/2026-09-07-cos-rail-tending.tsv](https://github.com/klappy/kitchen/blob/b2b043ae40c763cfa9366b351e103dd574a89533/journal/2026-09-07-cos-rail-tending.tsv) — blob `d8f6f3c3a901aaab5cc5951aac563f99c421823b`.

Additional cross-ticket evidence (retrieved independently; blob references are immutable):
- [journal/2026-09-01-cos-door.tsv](https://api.github.com/repos/klappy/kitchen/git/blobs/095420534135140eb824ecdbcc81b7f97a6fe1f1)
- [cookbook/communication/CONTRIBUTOR-GRATITUDE.md](https://api.github.com/repos/klappy/kitchen/git/blobs/5bb399e4f0fa443fe363148495dee93ba5df0949)
- [rail/meals/2026-09-03-3d-review-cookbook-drain/MEAL.md](https://api.github.com/repos/klappy/kitchen/git/blobs/843c0a6e5137e5cedc422499a9145f83ce71e208)

## Fresh PR metadata
- [PR 51](https://github.com/klappy/ptxprint-mcp/pull/51): merged=True; merge commit `b41e6fb74ab05d6a4543dff377a07d5e78ac4439`; UTC merge time `2026-09-05T01:05:12Z`. Checks and production behavior were not rerun by this author.
- [PR 52](https://github.com/klappy/ptxprint-mcp/pull/52): merged=True; merge commit `224297e462f3dbc7e1c6e99c9bc4468dbd8668ee`; UTC merge time `2026-09-05T01:05:17Z`. Checks and production behavior were not rerun by this author.
- [PR 56](https://github.com/klappy/ptxprint-mcp/pull/56): merged=True; merge commit `7e9c7cbb1ccfe08bf4a49912bedadaa842280634`; UTC merge time `2026-09-05T02:08:01Z`. Checks and production behavior were not rerun by this author.

## Review correction and additional evidence
The historical ticket treats separate validation/fix PRs as distinct seats, but DEBRIEF names the same in-seat Auggie creator. Separate PRs do not establish independent validation. Captain merge approval is not evidence of a separate technical rerun. Preserve this historical independence miss; the present separate learning reviewer addresses this review, not the old release retrospectively.
