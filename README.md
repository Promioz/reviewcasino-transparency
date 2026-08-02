# ReviewCasino — Score Journal Transparency Mirror

This repository is the **public, independently verifiable mirror** of
ReviewCasino's score-change journal (`score_events`). Every change to an
algorithmic or editorial score on [reviewcasino.com](https://www.reviewcasino.com)
is recorded in a hash-chained journal; this mirror republishes it daily,
anchored to Bitcoin via [OpenTimestamps](https://opentimestamps.org/).

**Why:** a review site's scores are only trustworthy if their history cannot be
silently rewritten. This mirror makes any rewrite detectable by anyone.

## Files

| File | What |
|---|---|
| `journal.jsonl` | Full journal export — one JSON event per line, ascending `seq`, each row carries `prevHash`/`rowHash` |
| `head.json` | Chain head snapshot: `{seq, rowHash, count, genesis, exportedAt}` |
| `ots/<date>-head.json.ots` | Daily OpenTimestamps proof of that day's `head.json` |

## Verify it yourself

**1. The chain is internally consistent** (no row edited/deleted since export):

```bash
git clone https://github.com/Promioz/RK  # or use the snippet below
npx tsx ReviewCasino/scripts/verify-journal.ts --file journal.jsonl
```

The chain rule, in ~10 lines (independent of our code):
each row must satisfy `rowHash == sha256(canonicalJson(core) + prevHash)`,
where `prevHash` equals the previous row's `rowHash` and the first row chains
from `sha256("rc-genesis-2026")`. Canonical JSON key order:
`seq, entityType, entityId, field, oldValue, newValue, actorRole, reason, createdAt`.

**2. The history existed at the anchored date** (not fabricated later):

```bash
pip install opentimestamps-client
ots verify ots/<date>-head.json.ots -f head.json
```

**3. The published journal matches the live site** — the head hash shown on
<https://www.reviewcasino.com/how-we-rank> must equal `head.json`'s `rowHash`.

## Honesty notes

- The journal covers score changes **from 2026-08-02** (the day the chain went
  live). It starts empty by design — no retroactively fabricated history.
- Rows contain **zero personal data**: `actorRole` is a role string
  (`editorial` / `system` / `migration`), never a user identity.
- A missing daily anchor means that day's run failed (calendars down, CI issue)
  — the previous anchor still bounds the history. We do not backfill anchors.
