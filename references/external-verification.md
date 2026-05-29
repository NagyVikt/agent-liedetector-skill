# External verification — the three-party loop

Asking a model to check itself is fragile: the grader inherits the author's
priors and blind spots. A wrong `[VERIFIED]` stays wrong because the same
reasoning that produced it also reviews it. The fix is an independent verifier
plus a source-of-truth adjudication step.

## When to escalate (triage gate)

Don't run this on every response — it costs an extra model call and a fresh
context window. Escalate only when all three hold:

1. **Decision-relevant** — the user will act on the claim.
2. **Hard to reverse** — being wrong is expensive (data loss, shipped bug,
   wrong architecture call, a "done" that wasn't).
3. **Mechanically checkable** — a fresh agent can confirm it by reading files
   or running commands, not by re-deriving your judgment.

If any fails, skip the loop and rely on inline-evidence `[VERIFIED]` instead.
In minimal-safe-mode, ask before spawning a sub-agent.

## The loop

1. **Author** makes the claims.
2. **Verifier** — spawn a sub-agent with a *different model* where possible
   (e.g. sonnet when the author is opus) and **no shared context**. Hand it the
   claims as neutral assertions: "verify each, return PASS / FAIL / PARTIAL +
   the evidence you observed." Never reveal the answer you expect, and tell it
   several may be false so it doesn't rubber-stamp.
3. **Adjudicate** — for every FAIL or PARTIAL, re-check the file or command
   yourself with absolute paths before issuing a `[CORRECTION]`. The verifier
   surfaces disagreements; the source settles them. The verifier can be wrong
   (it can hallucinate a finding), so trusting it blindly just relocates the
   fragility.

## Verifier prompt shape

- Self-contained: it has none of your context. State the repo path, the exact
  commands to run, and the file paths.
- Neutral: "audit these assertions," not "confirm these are correct."
- Bounded: ask for a terse PASS/FAIL/PARTIAL list with one evidence line each.
- Read-only: tell it not to edit anything.

## Verification-command discipline

Most false `[VERIFIED]` claims come from sloppy verification, not bad faith:

- **Never `grep -rh` across multiple files** when file identity matters — `-h`
  suppresses the filename, so a match in fileB gets credited to fileA. Grep
  each file separately, or use `-H` (force filename) and read the line.
- **Use absolute paths.** A drifted shell cwd makes `grep`/`sed` read the wrong
  file (or none) and silently report nothing.
- **Quote the output, don't paraphrase it.** Paste the line you saw; a remembered
  line is an `[INFERRED]`, not a `[VERIFIED]`.

## Worked example

Author (opus) asserted nine facts about a repo. An independent sonnet auditor
flagged two as FAIL. Adjudicating against the files:

- One FAIL was **real** — the author claimed `code-review/SKILL.md` had an
  `allowed-tools` line, but a `grep -rh` over two files had hidden the filename;
  the line actually came from `investigate/SKILL.md`. The self-check rated it
  `[VERIFIED]` and missed it. The external check caught it. → `[CORRECTION]`.
- One FAIL was a **verifier hallucination** — it claimed an em dash on a line
  that had none. Re-reading the file disproved it. Trusting the verifier here
  would have shipped a false correction.

Lesson: neither self-check nor verifier-trust is sufficient. Only
adjudication-against-source closes the loop.
