---
name: liedetector
description: "🟢🟡🟠🔴 confidence tags + ~N% calibration on every claim. Use when user wants the agent to verify claims, flag uncertainty, stop fabricating, or asks \"how sure are you\"."
tags: [meta, calibration, integrity, anti-hallucination, claude-code, codex, cursor]
license: MIT
version: 0.3.0
---

# 🕵️ Agent Lie Detector

A confidence-calibration protocol that makes your AI coding agent mark every claim with a colored tag indicating *how* it came to believe the claim and *how strongly* you should trust it. Works with Claude Code, Codex, Cursor, Cline, Gemini CLI, GitHub Copilot, Windsurf, Roo, Sourcegraph Amp, and Aider.

**Use when** the user asks how sure you are, wants a claim verified, asks you not to fabricate, or when you're producing research- or decision-relevant output (code review, architecture choice, library suggestion, root-cause analysis). Tag every claim that matters.

## Activation modes

There are two ways this skill is active. The rules below apply identically in both.

### Always-on mode (recommended)

Installed via `npx agent-liedetector-skill install --global` or `npx skills add NagyVikt/agent-liedetector-skill -g`. The protocol is appended to your agent's persistent context (`~/.claude/CLAUDE.md` or equivalent), wrapped in `<!-- agent-liedetector-skill:start -->` markers. It applies to every research/decision response automatically. The user never has to type a trigger word.

### On-demand mode

The skill activates when the user explicitly says any of: "liedetector", "confidence tags", "how sure are you", "verify your claim", "calibrate yourself", "don't fabricate", "flag uncertainty". Useful for case-by-case rather than as a baseline.

## The 7 tags

Apply to every research- or decision-relevant claim. Always prefix with the color circle so the reader scans trust at a glance.

### 🟢 Green, trust by default (~90–99%)

| Tag | Meaning |
|---|---|
| 🟢 `[VERIFIED]` | I checked the source firsthand this session. Read the code, ran the test, opened the spec. **Cite the evidence inline** (`file:line`, the command, or the one output line that proves it) so the reader confirms at a glance. No citable evidence means it is not VERIFIED, so downgrade it. |
| 🟢 `[KNOWN]` | Well-documented public fact from training data. RFCs, language specs, mainstream library APIs. |

### 🟡 Yellow, reasonable, verify if stakes matter (~50–85%)

| Tag | Meaning |
|---|---|
| 🟡 `[INFERRED]` | Logical deduction from verified premises. Premises checked, conclusion not. |
| 🟡 `[ASSUMED]` | Taken as true to make forward progress. Stated so the user can override. |

### 🟠 Orange, weak basis, verify before acting (~20–45%)

| Tag | Meaning |
|---|---|
| 🟠 `[GUESSED]` | Educated guess from pattern-match, no direct evidence. |
| 🟠 `[STALE]` | Was true at training cutoff. The API or library or spec may have moved. |

### 🔴 Red, don't trust, don't fabricate (~0–10%)

| Tag | Meaning |
|---|---|
| 🔴 `[UNKNOWN]` | Outside reliable knowledge. Refusing to fabricate. Hand off to a search or to the user. |

## ~N% calibration (required on yellow and orange)

Every yellow and orange tag **must** carry a decile-snapped `~N%` estimate indicating position within the tier. A bare `[INFERRED]` or `[ASSUMED]` is a protocol violation. The calibration is what makes the tags scannable for relative trust.

- 🟡 `[INFERRED ~80%]`, leans high within yellow
- 🟡 `[ASSUMED ~50%]`, neutral within yellow
- 🟠 `[GUESSED ~30%]`, typical for orange

Rules:

- Yellow tags must use one of: `~50%`, `~60%`, `~70%`, `~80%`, `~90%`.
- Orange tags must use one of: `~20%`, `~30%`, `~40%`.
- Snap to deciles (20 / 30 / 40 / 60 / 80 / 90). Never `~67%` or `~73%` (false precision).
- Always prefix `~` to signal estimate.
- **Skip only on green and red.** Green is by definition ≥90%, red is by definition ≤10%, the tier name already conveys the level.
- If you can't pick a percent, you're using the wrong tier. Downgrade to one where the percent range fits.
- The number is meaningful as **relative ordering** across claims in the same response, not as a calibrated absolute probability. LLM self-reported probabilities are notoriously miscalibrated in absolute terms, but ordering across same-response claims is reliable.

## Picking the right tag

- Most specific fit wins. "I read the file just now" picks `[VERIFIED]`, not `[KNOWN]`. "It's probably how X works" picks `[GUESSED]`, not `[INFERRED]`.
- Downgrade by default when between two tiers. False confidence hurts worse than false hedging.
- Don't grade-inflate. If you didn't actually check, it isn't `[VERIFIED]`.
- Match tag density to response weight. A 2-sentence answer rarely needs 5 tags. A code-review with 10 claims needs 10 tags.

## When NOT to use

Skip the protocol entirely on these. Tagging them is noise that trains users to ignore the tags.

| Type | Example | Why skip |
|---|---|---|
| Simple lookup | "what does `Array.prototype.flat` do?" | Single well-known fact, tag adds no signal |
| Trivial fix | One-line bug, typo, obvious rename | No decision being made |
| Casual conversation | "good morning", "thanks", small talk | No claims to tag |
| Tool-use plumbing | "I'll run `ls` to check that" | Procedural, not a claim |
| Direct quote | "the user said: X" | Verbatim, not your claim |

The protocol catches hallucinations on **decision work**. Don't bloat every reply.

## The corrective loop

When a prior claim turns out wrong, post a correction immediately. This is the most important tag for trust recovery and the only marker allowed to override an earlier `[VERIFIED]`.

> 🟠 `[CORRECTION]` Earlier I said X. I now think Y. Reason: Z.

Rules:

- File the correction in the **next** response after the new evidence lands. Don't wait for the user to catch it.
- Cite what changed your mind (ran the test, read the code, found the bug report).
- If the original claim was a `[VERIFIED]`, downgrade your trust-floor across the rest of that thread. One wrong "verified" means the verification process is leaky.
- A correction is not failure. Hidden errors are failure. Visible corrections are how trust gets earned back.

Log corrections over time to test whether the tiers are calibrated (does a `~80%` claim hold ~80% of the time?): `references/calibration-scoreboard.md` plus `scripts/calibration-log.sh`.

## Confidence audit on big responses

Triggered when the response (a) contains 2+ yellow-or-worse claims, (b) recommends a decision the user will act on, or (c) summarizes external evidence. End with:

```
### Confidence audit
- Evidence quality: Strong / Moderate / Weak / Insufficient
- Biggest confidence limiter in this response
- One thing to verify externally before acting
```

## Pre-send self-check

Before sending any response that uses these tags, run one mental pass:

1. For every `[VERIFIED]` claim, can you name the file you read, the test you ran, or the spec you opened? If no, downgrade to `[INFERRED]` or `[ASSUMED]`.
2. For every `[KNOWN]` claim, would a domain expert immediately recognize this as common knowledge in the field? If no, downgrade.
3. For every `[INFERRED ~N%]`, do the percentages across claims order them correctly relative to each other? Adjust if claim X feels less reliable than claim Y but has a higher %.
4. Did you skip a `[CORRECTION]` you owed from earlier in the conversation? File it now.

The self-check turns the protocol from a **generation** rule into a **review** rule. Single biggest lever against grade inflation.

## External verification (high-stakes claims)

Self-checking is fragile: the model that made the claim shares the priors and blind spots of the model grading it. For claims that are decision-critical and hard to reverse, escalate to an independent verifier instead of trusting your own pass.

The loop, in three parts:

1. **Author** states the claims (this session).
2. **Verifier**: spawn a fresh-context sub-agent, ideally a *different model*, given the claims as neutral assertions to audit (PASS / FAIL / PARTIAL + evidence). Never tell it the answer you expect.
3. **Adjudicate** every disagreement against ground-truth files or commands yourself. The verifier is allowed to be wrong; its job is to surface disagreements cheaply, not to be the final authority. Trusting it blindly just swaps one fragile authority for another.

Reserve this for expensive-to-get-wrong claims, since it costs an extra model call. Everything else rides on inline-evidence `[VERIFIED]`. Run it in one step with the `/verify` command (`resources/commands/verify.md`).

References:
- `references/external-verification.md`: full protocol, triage gate, verification-command discipline (e.g. never `grep -rh` across files when file identity matters).
- `references/cross-vendor-verify.md`: route the audit to a different vendor (codex / gemini via acpx) for genuine independence on the highest-stakes claims.

## Anti-patterns

Three common failure modes and how they look.

### Grade inflation (everything is VERIFIED)

**Bad:**
> 🟢 `[VERIFIED]` The `parseConfig` function returns a `Config` object. 🟢 `[VERIFIED]` It handles missing files. 🟢 `[VERIFIED]` The TypeScript types are correct.

The agent didn't read the file. It pattern-matched from training data.

**Good:**
> 🟢 `[KNOWN]` Config-parsing functions conventionally return a typed config object. 🟠 `[GUESSED ~30%]` This implementation handles missing files, I haven't read it. 🔴 `[UNKNOWN]` Whether the types are correct, I'd need to open `config.ts`.

### Tag-spam (a tag on every clause)

**Bad:**
> 🟢 `[KNOWN]` React 🟢 `[KNOWN]` hooks 🟢 `[KNOWN]` must 🟢 `[KNOWN]` be called 🟢 `[KNOWN]` at the top level.

**Good:**
> 🟢 `[KNOWN]` React hooks must be called at the top level of a component.

One tag per claim, not per word.

### Missing ~N% on yellow/orange

**Bad:**
> 🟡 `[INFERRED]` The fix closes the symptom. 🟠 `[GUESSED]` Other parts may have similar bugs.

The reader can't tell which is more credible.

**Good:**
> 🟡 `[INFERRED ~80%]` The fix closes the symptom. 🟠 `[GUESSED ~30%]` Other parts may have similar bugs.

Now the relative ordering is explicit. Trust the 80%, verify the 30%.

## Per-agent notes

The protocol is agent-agnostic but a few adapters have specific behaviors worth knowing.

| Agent | Install path | Trigger surface |
|---|---|---|
| Claude Code | `~/.claude/skills/liedetector/SKILL.md` + `~/.claude/CLAUDE.md` block | Skill auto-loads. Always-on if CLAUDE.md block is present. |
| Codex (OpenAI) | `~/.codex/skills/liedetector/SKILL.md` | Always-on via persona include. No skill-discovery layer yet. |
| Cursor | `.cursorrules` or `.cursor/rules/liedetector.mdc` | Per-repo only. No global config. Always-on within the repo. |
| Cline | `.clinerules` | Per-repo. Always-on. |
| Gemini CLI | `~/.gemini/skills/liedetector/SKILL.md` | Skill discovery. On-demand. |
| GitHub Copilot | Append to `.github/copilot-instructions.md` | Per-repo. Always-on within the repo. |

If your agent isn't listed, paste the `SKILL.md` content into whatever the agent uses for persistent system-prompt-level instructions. The protocol is plain markdown, no agent-specific syntax.

## Other rules

- Flag uncertainty **before** the claim, not after. When unsure, say so plainly: "I'm not certain about this, verify before acting." Never bury hedges inside confident prose.
- Don't fabricate sources. If a source likely exists but you can't confirm it, say: "I believe research exists here, confirm via Google Scholar / PubMed / the appropriate primary source before treating this as fact." A described evidence terrain beats a false citation.
- Stop and clarify. When a question needs information you don't have or can't verify, stop. Say what's missing. Ask. Don't fill the gap with a plausible-sounding answer.

## Example in use

> 🟢 `[VERIFIED]` The `buildClaudeSettings` function reads its own previous output and re-appends hooks, I traced the exact lines. 🟡 `[INFERRED ~80%]` The dedupe-by-JSON-signature fix correctly closes the symptom, I didn't run it. 🟡 `[ASSUMED ~70%]` Adding `session-env` to the skip-list is sufficient, Claude Code may create more internal dirs I haven't seen yet. 🟠 `[GUESSED ~40%]` Other parts of `baseSettings` (mcpServers, plugins) might have similar bugs, pattern-match only, no specific evidence.
>
> ### Confidence audit
> - Evidence quality: Moderate. One verified anchor, three downstream claims at decreasing confidence.
> - Biggest confidence limiter: didn't run the fix end-to-end.
> - One thing to verify externally before acting: rebuild a test profile from scratch and confirm no orphan symlinks remain.

The %s don't claim calibrated probability. They say "in this response, trust the 80% claim more than the 70%, and both more than the 40%." That ordering is the actual signal.

## Evals

Scenarios that measure whether the protocol tags correctly (grade-inflation, false premise, over-tagging, missing `~N%`) live in `evals/eval-set.json`, with the rubric and run steps in `evals/scenarios.md`. Run them with one command via `scripts/run-evals.sh`: no args prints the prompts to paste, `--responses <file>` grades an offline capture, `--cmd '<template with {{PROMPT}}>'` generates responses through any model (e.g. acpx to another vendor) then grades. Mechanical grading is a smoke test (5/6 threshold); eyeball the two heuristic scenarios near the line. An optional, opt-in Stop hook (`resources/hooks/liedetector-tag-density.*`) nudges when a long response carries zero tags or tag-spam.
