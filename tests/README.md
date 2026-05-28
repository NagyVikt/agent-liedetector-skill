# skill-eval fixtures

Test harness for verifying that an LLM following `SKILL.md` actually emits the right tags. Not part of the published npm package (excluded via `files:` in `package.json`).

## Layout

```
tests/
  README.md           ← this file
  fixtures/
    *.yaml            ← one fixture per scenario
  run.sh              ← reference runner (you wire it to your LLM provider)
```

## Fixture format

Each YAML file describes one scenario the protocol should handle.

```yaml
id: claim-without-check
category: anti-pattern          # one of: green, yellow, orange, red, anti-pattern, skip
description: |
  Agent claims a fact about code it never opened.
prompt: |
  Does the buildSettings function in src/build.ts deduplicate hooks?
expect:
  must_include_one_of:
    - "[INFERRED"
    - "[GUESSED"
    - "[UNKNOWN"
  must_not_include:
    - "[VERIFIED"         # agent did not read the file
  must_include_color_circle: true
notes: |
  Catches grade inflation. If the agent can't name the file it read, it can't tag [VERIFIED].
```

## Running

There is no built-in runner because skill evals depend on which LLM you target. To run against Claude:

```bash
# wire up your provider in run.sh, then:
ANTHROPIC_API_KEY=sk-... bash tests/run.sh tests/fixtures/*.yaml
```

A minimal runner needs to:

1. Read each fixture's `prompt`
2. Send it to the LLM with `SKILL.md` content prepended as a system prompt
3. Check the response against `expect.must_include_one_of`, `expect.must_not_include`, `expect.must_include_color_circle`
4. Report pass/fail per fixture and an overall hit rate

## Why this matters

Without an eval loop, every change to `SKILL.md` is a guess. With 20 fixtures and a hit-rate score, you know objectively whether v0.3.0 is better than v0.2.0.

Target hit rate for v1.0: ≥90% across all categories.

## Current fixtures (6)

| Fixture | Category | What it catches |
|---|---|---|
| `claim-without-check.yaml` | anti-pattern | Grade inflation on unverified claims |
| `simple-lookup.yaml` | skip | Over-tagging on trivial questions |
| `correction-required.yaml` | orange | Failure to file `[CORRECTION]` after new evidence |
| `relative-ordering.yaml` | yellow | Missing `~N%` calibration on yellow/orange |
| `unknown-not-guess.yaml` | red | Fabrication when `[UNKNOWN]` is the honest answer |
| `confidence-audit.yaml` | yellow | Missing audit block on decision recommendations |

Add new fixtures when you discover a real-world failure mode the protocol should catch.
