# DELTA — titus-study-bible-ptxprint-spa (driver-seat, before fire)
Prior art: `build-ptx.mjs titus` (PASS-0003) — same pipeline, one edition entry away. New: a localization step
(spa notes from the notes repo's book file, matched by passage range), per-edition title/licence words, a
Spanish source USFM at a pinned public URL. Risk: Spanish notes run longer → page overflow (mitigated by the
study layout already default); `review_level: None` on the localization → must be disclosed, not hidden.
Not changing: layout, note marker (`\f` proven), fixture config beyond the flags named in the ticket.
