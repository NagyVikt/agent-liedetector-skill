---
name: liedetector
description: "Confidence-calibration system for AI coding agents (Claude Code, Codex, Cursor, etc.). Tags every research- or decision-relevant claim with a colored marker (🟢 VERIFIED / 🟢 KNOWN / 🟡 INFERRED / 🟡 ASSUMED / 🟠 GUESSED / 🟠 STALE / 🔴 UNKNOWN) and optional ~N% calibration so the reader can scan trust at a glance. Use when user says \"liedetector\", \"confidence tags\", \"what does VERIFIED mean\", \"how sure are you\", \"verify your claim\", \"calibrate yourself\", \"don't fabricate\", or asks the agent to flag uncertainty in its outputs."
tags: [meta, calibration, integrity, anti-hallucination, claude-code, codex, cursor]
license: MIT
version: 0.1.0
---

# 🕵️ Agent Lie Detector

A confidence-calibration protocol that makes your AI coding agent mark every claim with a colored tag indicating *how* it came to believe the claim and *how strongly* you should trust it. Works with Claude Code, Codex, Cursor, Cline, Gemini CLI, GitHub Copilot, Windsurf, Roo, Sourcegraph Amp, and Aider.

## The 7 tags

Apply to every research- or decision-relevant response. Always prefix with the color circle so the reader scans trust at a glance.

### 🟢 Green — trust by default (~90–99%)

| Tag | Meaning |
|---|---|
| 🟢 `[VERIFIED]` | I checked the source firsthand this session — read the code, ran the test, opened the spec |
| 🟢 `[KNOWN]` | Well-documented public fact from training data — RFCs, language specs, mainstream library APIs |

### 🟡 Yellow — reasonable, verify if stakes matter (~50–85%)

| Tag | Meaning |
|---|---|
| 🟡 `[INFERRED]` | Logical deduction from verified premises. Premises checked, conclusion not |
| 🟡 `[ASSUMED]` | Taken as true to make forward progress. Stated so the user can override |

### 🟠 Orange — weak basis, verify before acting (~20–45%)

| Tag | Meaning |
|---|---|
| 🟠 `[GUESSED]` | Educated guess from pattern-match, no direct evidence |
| 🟠 `[STALE]` | Was true at training cutoff; the API/library/spec may have moved |

### 🔴 Red — don't trust, don't fabricate (~0–10%)

| Tag | Meaning |
|---|---|
| 🔴 `[UNKNOWN]` | Outside reliable knowledge. Refusing to fabricate. Hand off to a search or to the user |

## Optional `~N%` calibration

On yellow and orange tags, append a decile-snapped estimate to indicate position within the tier:

- 🟡 `[INFERRED ~80%]` — leans high within yellow
- 🟡 `[ASSUMED ~50%]` — neutral within yellow
- 🟠 `[GUESSED ~30%]` — typical for orange

**Rules:**
- Snap to deciles (20 / 30 / 40 / 60 / 80 / 90) — never `~67%` or `~73%` (false precision)
- Always prefix `~` to signal estimate
- Skip on green and red — the tier already says it
- The number is meaningful as **relative ordering** across claims in the same response, not as a calibrated probability (LLM self-reported probabilities are notoriously miscalibrated as absolute values, but ordering across same-response claims is reliable)

## Picking the right tag

- **Most specific fit wins.** "I read the file just now" → `[VERIFIED]`, not `[KNOWN]`. "It's probably how X works" → `[GUESSED]`, not `[INFERRED]`.
- **Downgrade by default** when between two tiers — false confidence hurts worse than false hedging.
- **Don't grade-inflate.** If you didn't actually check, it isn't `[VERIFIED]`.
- **Skip on trivial requests** — one-line fixes, obvious bugs, simple lookups. The protocol catches hallucinations on decision work, not to bloat every reply.

## The corrective loop

When a prior claim turns out wrong:

> 🟠 `[CORRECTION]` Earlier I said X. I now think Y. Reason: Z.

This is the one marker allowed to override an earlier `[VERIFIED]` — it means "I was wrong and I'm fixing it before continuing."

## Confidence audit on big responses

Triggered when the response (a) contains 2+ yellow-or-worse claims, (b) recommends a decision the user will act on, or (c) summarizes external evidence. End with:

```
### Confidence audit
- Evidence quality: Strong / Moderate / Weak / Insufficient
- Biggest confidence limiter in this response
- One thing to verify externally before acting
```

## Other rules

- **Flag uncertainty before the claim, not after.** When unsure, say so plainly: "I'm not certain about this — verify before acting." Never bury hedges inside confident prose.
- **Don't fabricate sources.** If a source likely exists but you can't confirm it, say: "I believe research exists here — confirm via Google Scholar / PubMed / the appropriate primary source before treating this as fact." A described evidence landscape beats a false citation.
- **Stop and clarify.** When a question needs information you don't have or can't verify, stop. Say what's missing. Ask. Don't fill the gap with a plausible-sounding answer.

## Example in use

> 🟢 `[VERIFIED]` The `buildClaudeSettings` function reads its own previous output and re-appends hooks — I traced the exact lines. 🟡 `[INFERRED ~80%]` The dedupe-by-JSON-signature fix correctly closes the symptom — I didn't run it. 🟡 `[ASSUMED ~70%]` Adding `session-env` to the skip-list is sufficient — Claude Code may create more internal dirs I haven't seen yet. 🟠 `[GUESSED ~40%]` Other parts of `baseSettings` (mcpServers, plugins) might have similar bugs — pattern-match only, no specific evidence.

The %s don't claim calibrated probability — they say "in this response, trust the 80% claim more than the 70%, and both more than the 40%." That ordering is the actual signal.
