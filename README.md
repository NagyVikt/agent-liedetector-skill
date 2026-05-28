<br>

<h1 align="center">🕵️ agent-liedetector-skill</h1>

<p align="center">
  <strong>Make your AI coding agent tell you when it's lying.</strong>
</p>

<p align="center">
  <sub>One install. Every response gets a confidence tag. You stop trusting hallucinations.</sub>
</p>

<br>

<p align="center">
  <a href="https://www.npmjs.com/package/agent-liedetector-skill"><img src="https://img.shields.io/npm/v/agent-liedetector-skill?style=flat-square&label=npm&color=1d1d1f&labelColor=f5f5f7" alt="npm"></a>&nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-1d1d1f?style=flat-square&labelColor=f5f5f7" alt="MIT"></a>&nbsp;
  <img src="https://img.shields.io/badge/works_with-Claude_Code-cc785c?style=flat-square&logo=anthropic&logoColor=white" alt="Claude Code">&nbsp;
  <img src="https://img.shields.io/badge/works_with-Codex-000000?style=flat-square&logo=openai&logoColor=white" alt="Codex">&nbsp;
  <img src="https://img.shields.io/badge/works_with-Cursor-000000?style=flat-square&logo=cursor&logoColor=white" alt="Cursor">
</p>

<br>

```bash
npx agent-liedetector-skill install
```

That's it. Next session, every research- or decision-relevant claim your agent makes will carry a tag like 🟢 `[VERIFIED]`, 🟡 `[INFERRED ~80%]`, 🟠 `[GUESSED ~30%]`, or 🔴 `[UNKNOWN]`.

<br>

---

## the problem.

Large language models confabulate. They sound confident whether they checked the source or made it up. By the time you notice the bug they introduced, you've already shipped it.

The conventional fixes don't work:

- Asking "are you sure?" — they just rephrase the same wrong answer with more hedging
- "Cite your sources" — they fabricate plausible-looking citations
- "Be honest about uncertainty" — they bury it inside confident prose

## the fix.

A **7-tag confidence protocol** baked into the agent's system prompt. Every claim that matters gets a tag based on *how* the agent came to believe it:

| Tier | Tag | Meaning | What you do |
|---|---|---|---|
| 🟢 | `[VERIFIED]` | Checked the source firsthand this session | Trust it |
| 🟢 | `[KNOWN]` | Well-documented public fact (RFC, spec, mainstream API) | Trust it |
| 🟡 | `[INFERRED]` | Logical deduction from verified premises | Spot-check |
| 🟡 | `[ASSUMED]` | Taken as true to make progress | Override if it matters |
| 🟠 | `[GUESSED]` | Pattern-match guess, no direct evidence | Treat as hypothesis |
| 🟠 | `[STALE]` | True at training cutoff, may have moved | Re-check current docs |
| 🔴 | `[UNKNOWN]` | Outside reliable knowledge | Refused to fabricate. Hand off |

Plus optional **decile-snapped calibration** on yellow/orange tags: `🟡 [INFERRED ~80%]`, `🟠 [GUESSED ~30%]`. The `~` signals it's a rough self-estimate, not a calibrated probability.

<br>

---

## before & after.

**Without agent-liedetector-skill:**

> The `buildClaudeSettings` function deduplicates hooks before writing them to settings.json. The schema's `Inheritance merges all three with concat + dedupe` rule guarantees this.

*Sounds confident. Is it true? You'd have to read the code to find out.*

**With agent-liedetector-skill:**

> 🟢 `[VERIFIED]` The `buildClaudeSettings` function reads its own previous output and re-appends hooks — I traced the exact lines. 🟡 `[INFERRED ~80%]` The dedupe-by-JSON-signature fix correctly closes the symptom — I didn't run the tests. 🟠 `[GUESSED ~40%]` Other parts of `baseSettings` (mcpServers, plugins) might have similar bugs — pattern-match only, no specific evidence.

*Now you know which line to trust, which to verify, and which is hand-waving.*

<br>

---

## install.

### Option 1 — npx (recommended)

```bash
npx agent-liedetector-skill install
```

Drops the `liedetector` skill into `~/.claude/skills/liedetector/SKILL.md` (where Claude Code's skill loader picks it up) and offers to append the always-on protocol to `~/.claude/CLAUDE.md` so it applies to every session, not just when triggered.

**Variants:**

```bash
npx agent-liedetector-skill install --global     # also write to ~/.claude/CLAUDE.md without asking
npx agent-liedetector-skill install --skill-only # only install the skill, don't touch CLAUDE.md
npx agent-liedetector-skill uninstall            # remove both
npx agent-liedetector-skill status               # check what's installed
```

Idempotent — safe to re-run. The CLAUDE.md modifications are wrapped in `<!-- agent-liedetector-skill:start -->` ... `<!-- agent-liedetector-skill:end -->` markers so uninstall is precise.

A short alias is registered too: `npx liedetector install` does the same thing.

### Option 2 — manual copy

If you don't want to run a script, just copy `SKILL.md` into your agent's skill directory:

| Agent | Where to copy `SKILL.md` |
|---|---|
| Claude Code | `~/.claude/skills/liedetector/SKILL.md` |
| Codex | `~/.codex/skills/liedetector/SKILL.md` |
| Cursor | Paste contents into `.cursorrules` (whole repo) or `.cursor/rules/liedetector.mdc` (per repo) |
| Cline | Paste contents into `.clinerules` |
| Gemini CLI | `~/.gemini/skills/liedetector/SKILL.md` |
| GitHub Copilot | Append to `.github/copilot-instructions.md` |

### Option 3 — via cue profile

If you use [cue / cuecards](https://github.com/opencue/cuecards), add to any profile:

```yaml
# profiles/<your-profile>/profile.yaml
persona_includes:
  - integrity-protocol     # cue ships this snippet built-in
```

<br>

---

## how it works.

The protocol gets injected into the agent's system prompt as a persona snippet. Claude Code reads `~/.claude/CLAUDE.md` on every session start, so the rules are in context before you type anything. The skill (`~/.claude/skills/liedetector/SKILL.md`) is the discoverable reference document — when you ask "what does `[ASSUMED]` mean?", the agent loads the skill and explains.

No daemon. No background process. No telemetry. Just markdown files in your agent's config directory.

<br>

---

## why the calibration % matters.

LLM self-reported probabilities are notoriously miscalibrated as **absolute** values — `~70%` doesn't truly mean "right 7 times out of 10."

But **relative ordering** across claims in the same response IS meaningful. "I'm `~80%` on X, `~50%` on Y" tells you which to verify first. That's the actual signal.

To prevent false precision, all percentages snap to deciles (20/30/40/60/80/90) — never `~67%` or `~73%`. And the leading `~` is non-negotiable so no one mistakes it for a measured statistic.

<br>

---

## faq.

<details>
<summary><b>Does this slow my agent down?</b></summary>

No. The protocol adds ~200 tokens to the system prompt — one-time cost per session, imperceptible vs the agent's own context budget.
</details>

<details>
<summary><b>Does the percentage actually mean anything?</b></summary>

As an absolute probability, no — LLM self-calibration is unreliable at fine resolution. As a *relative ordering* across claims in the same response, yes. If the agent tags claim A as ~80% and claim B as ~40%, you can trust that the agent finds A more credible than B. That's the signal worth acting on.
</details>

<details>
<summary><b>What if it tags everything as VERIFIED?</b></summary>

The protocol explicitly forbids grade inflation: "If you didn't actually check, it isn't `[VERIFIED]`." And when in doubt between two tiers, the rule is to **downgrade by default** — false confidence hurts more than false hedging. If you notice the agent abusing `[VERIFIED]`, paste the SKILL.md content into the chat and ask it to recalibrate.
</details>

<details>
<summary><b>Why these 7 tags and not 4 or 10?</b></summary>

4 tags lose distinctions that matter (e.g. "I read the code" vs "training-data fact" are very different epistemic states). 10+ tags become hard to remember. 7 is the sweet spot — split along two axes (*how* the agent came to believe it × *how strongly* to trust it) without overflowing working memory.
</details>

<details>
<summary><b>Does this work outside Claude Code?</b></summary>

Yes — the protocol is agent-agnostic. Copy `SKILL.md` content into any LLM system prompt and it works. The bundled install script defaults to Claude Code paths; manual install instructions for Codex, Cursor, Cline, Gemini, and Copilot are above.
</details>

<details>
<summary><b>How is this different from "just asking the model to be honest"?</b></summary>

"Be honest" is too abstract — the model interprets it as "add hedging language" and otherwise behaves the same. The 7-tag protocol gives it a **structured vocabulary** for being honest. Each tag has a precise definition; the model knows which to apply because the definitions distinguish them by *evidence type*, not vibes. Structured uncertainty beats prose hedging.
</details>

<details>
<summary><b>Does it send telemetry?</b></summary>

No. agent-liedetector-skill is a pure markdown injection — it writes two files into your agent's config dir and exits. Nothing leaves your machine.
</details>

<br>

---

## credits.

The 7-tag protocol was developed inside the [cue / cuecards](https://github.com/opencue/cuecards) profile manager as a baseline persona snippet (`resources/personas/integrity-protocol.md`) for AI coding agents. This repo extracts it as a standalone, npx-installable skill so anyone can adopt it without adopting cue.

If you find this useful, also check out:

- [cue / cuecards](https://github.com/opencue/cuecards) — full agent profile manager with per-directory profiles, skill discovery, and 33 pre-built expert agent loadouts
- [claude-mem](https://github.com/thedotmack/claude-mem) — persistent cross-session memory for Claude Code

<br>

---

## contributing.

```bash
git clone https://github.com/NagyVikt/agent-liedetector-skill.git
cd agent-liedetector-skill
node bin/cli.js install --dry-run    # see what install would do without writing
```

| Want to | How |
|---|---|
| Suggest a new tag | Open an issue with the proposed name + definition + use case |
| Improve a tag definition | PR against `SKILL.md` |
| Add an agent adapter | PR against `bin/cli.js` install path resolution |
| Report a bug | [Open an issue](https://github.com/NagyVikt/agent-liedetector-skill/issues) |

License: [MIT](./LICENSE).
