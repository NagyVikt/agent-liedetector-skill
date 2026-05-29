# Cross-vendor verification

Same-family verification (opus author, sonnet verifier) reduces self-check
fragility but doesn't eliminate it. Both models share training corpus, RLHF
priors, and common failure modes — a misconception baked in at pretraining is
likely wrong in both. Routing the audit to a genuinely different vendor
(Codex/OpenAI, Gemini/Google) adds independent priors, different retrieval
patterns, and different hallucination failure modes.

The honest cost: one extra round-trip over acpx adds latency and tokens. Reserve
this for the highest-stakes, hardest-to-reverse decisions only.

## When it's worth it

Use cross-vendor verification only when all three hold AND the same-family
verifier is plausibly contaminated:

1. The claim concerns a library, API, or tool where vendor training data
   distributions differ meaningfully (e.g. Google SDK behavior, OpenAI API
   surface, proprietary cloud specifics).
2. The decision is irreversible or very expensive to undo (data migration,
   architecture lock-in, shipped security fix).
3. The claim is mechanically checkable — the verifier can read files or run
   commands, not just re-derive your judgment.

Skip it for cost-of-reasoning disagreements, style calls, or anything
source-adjudicable locally.

## Routing the audit via acpx

Spawn the verifier in a stateless exec call so it brings no shared context:

```sh
acpx gemini exec \
  --approve-reads \
  --format quiet \
  --cwd /home/deadpool/Documents/cue \
  "Audit these assertions about this repo. Return PASS / FAIL / PARTIAL for
each, plus one evidence line (file path + quoted text you read, or command +
output). Do NOT edit anything. Treat several as potentially false — do not
rubber-stamp.

Assertions:
1. <claim A>
2. <claim B>
..."
```

Or with Codex:

```sh
acpx codex exec \
  --approve-reads \
  --deny-all \
  --format quiet \
  --cwd /home/deadpool/Documents/cue \
  "$(cat <<'EOF'
Audit these assertions. PASS / FAIL / PARTIAL + evidence per item. Read-only.
1. <claim A>
2. <claim B>
EOF
)"
```

Key points:
- `exec` not `sessions new` — stateless, no bleed from prior context.
- `--approve-reads` / `--deny-all` — verifier reads, never writes.
- Neutral framing: "audit these assertions," not "confirm these are correct."
- Absolute repo path in `--cwd` so the verifier's shell cwd matches your claims.

## Adjudication discipline

Apply the same rules as external-verification.md. The cross-vendor verdict is
input, not ground truth:

- PASS — accept provisionally; still spot-check with a direct file read if the
  stakes warrant it.
- FAIL or PARTIAL — re-check the file or command yourself with absolute paths
  before issuing a `[CORRECTION]`. The verifier can hallucinate a finding.
- Verifier disagrees with a local read — the source file wins, always.

A cross-vendor FAIL that you cannot reproduce locally is a verifier error, not
a correction trigger.
