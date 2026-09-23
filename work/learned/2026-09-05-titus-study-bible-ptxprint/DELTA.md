# DELTA — 2026-09-05-titus-study-bible-ptxprint (driver's-seat lens receipt)
Before fire, 2026-09-04 ~21:25 ET, by Auggie, driving the deploy as a user (every call the script makes was made by hand first) and reading `payload-construction`, `changes-txt-format`, the John fixture, and the cookbook's Titus slice.

| # | Changed | Why |
|---|---|---|
| 1 | Notes enter via `changes.txt`, not an edited USFM. | Sources are URL+sha256 and the cookbook repo is private: nowhere to host a modified file without infrastructure. PTXprint already has the mechanism. |
| 2 | Whole book, not one chapter. | "A Titus study bible" is the book; the chapter-3 run was a bisect step, not the product, and I said so when I showed it. |
| 3 | `usechangesfile = True` set by the script, and the article says so first. | The fixture ships it off; the first render was perfect and noteless. |
| 4 | 6×9, body 9.5, notes 7.2, one per line. | A5/12 pt dies on a note stack (`! Dimension too large`); the captain's own words — "squashing and showing less of chapter 3 and more notes together" — are the study layout. |
| 5 | `\f` for the product, `\ef` as an env switch. | `\f` is the path proven tonight; `\ef` is the right class but unverified — documented as target, not claimed. |
| 6 | Container-limit and docs findings fixed upstream, same night, in their own PRs. | R19/R20: the dish does not carry the server's fixes in its cargo; each fix carries its own docs. |

Considered / rejected: hosting a modified USFM on the cookbook (private; no); one footnote stream for both translation notes and study notes as the final design (fine for a PoC, wrong for a product — `\ef` next); waiting for containers to free before shipping the proof (showed chapter 3 labelled as chapter 3 instead).

One thing: the recipe's promise was 2 h; wall-clock was longer because two server defects had to be fixed first. The dish itself was ~40 min.
