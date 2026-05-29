# Calibration Scoreboard

Tracks whether confidence tiers are accurate over time. A tier is calibrated when its claims hold at the rate its percent implies. If ~80% claims get corrected 50% of the time, the tier is inflated.

## The loop

1. Every time you post a `[CORRECTION]`, identify the tag it overrides (e.g. `INFERRED~80`, `VERIFIED`, `GUESSED~30`).
2. Log the override immediately:

```bash
bash resources/skills/skills/meta/liedetector/scripts/calibration-log.sh \
  "INFERRED~80" \
  "Claimed parseConfig handles missing files; it panics on missing keys instead."
```

3. Periodically tally the log to see which tiers fail most often.

### Auto-populating the log

The always-on `tag-audit` Stop hook detects the same miscalibration events this
scoreboard tracks (an evidence-less `[VERIFIED]`, a stale `[KNOWN]`). Opt in and
it appends a record per detected event automatically, so the log fills without
manual entry:

```bash
touch ~/.config/cue/liedetector-calibration-auto   # enable
rm    ~/.config/cue/liedetector-calibration-auto   # disable
```

Auto records carry an `auto(tag-audit):` prefix in their `note`. Manual
`[CORRECTION]` entries (logged via `calibration-log.sh`) are the higher-signal
data; auto entries flag self-graded claims the harness couldn't corroborate.

## Tally command

Run this over `~/.config/cue/liedetector-calibration.log` to count corrections per tag, sorted by frequency:

```bash
awk -F'"' '{print $8}' ~/.config/cue/liedetector-calibration.log \
  | sort | uniq -c | sort -rn
```

The `tag` *value* is the eighth double-quote-delimited token in each JSONL line
(`{` `ts` `:` `<ts>` `,` `tag` `:` `<value>` ...). Splitting on `"`, token 6 is
the literal key `tag`; token 8 is its value.

Example output:

```
  14 INFERRED~80
   9 GUESSED~30
   5 VERIFIED
   2 ASSUMED~60
```

## Recalibrating

For each tier, compare corrections to total uses. Track total uses manually or by grepping session transcripts.

| Tier | Implied error rate | Recalibrate when |
|---|---|---|
| VERIFIED | ~1-10% | Any correction flags a leak; lower future use |
| INFERRED~80 | ~20% | Corrections exceed 25% of uses |
| ASSUMED~60 | ~40% | Corrections exceed 45% of uses |
| GUESSED~30 | ~70% | Corrections exceed 75% of uses |

When a tier consistently fails above its implied error rate, shift claims at that tier one tier lower (e.g. use `GUESSED~40` instead of `INFERRED~80`).

## Log format

JSONL, one record per line:

```jsonl
{"ts":"2026-05-29T14:01:00Z","tag":"INFERRED~80","note":"Claimed X; actual was Y."}
```

Fields: `ts` (ISO 8601 UTC), `tag` (overridden confidence tag), `note` (claim and truth).
