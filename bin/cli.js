#!/usr/bin/env node
/**
 * agent-liedetector-skill — install / uninstall / status
 *
 * Drops the liedetector skill into ~/.claude/skills/liedetector/SKILL.md
 * and (with consent) appends the always-on protocol to ~/.claude/CLAUDE.md.
 *
 * Pure Node stdlib. No deps. Works under `npx agent-liedetector-skill <cmd>`
 * and `npx liedetector <cmd>` (short alias).
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const readline = require("node:readline");

const PKG_ROOT = path.resolve(__dirname, "..");
const SKILL_SRC = path.join(PKG_ROOT, "SKILL.md");

// Support material SKILL.md links to (references/, scripts/, evals/, and the
// resources/ verify-command + tag-density hook). Copied alongside SKILL.md so
// the v0.3.0 external-verification / evals links resolve in an install, not
// just when browsing the repo. Only dirs that exist in the package are copied.
const SUPPORT_DIRS = ["references", "scripts", "evals", "resources"];

const CLAUDE_HOME = path.join(os.homedir(), ".claude");
const SKILL_TARGET_DIR = path.join(CLAUDE_HOME, "skills", "liedetector");
const SKILL_TARGET = path.join(SKILL_TARGET_DIR, "SKILL.md");
const CLAUDE_MD = path.join(CLAUDE_HOME, "CLAUDE.md");

const MARKER_START = "<!-- agent-liedetector-skill:start -->";
const MARKER_END = "<!-- agent-liedetector-skill:end -->";

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function log(msg) { process.stdout.write(msg + "\n"); }
function warn(msg) { process.stderr.write(c.yellow("⚠  " + msg) + "\n"); }
function err(msg) { process.stderr.write(c.red("✗  " + msg) + "\n"); }
function ok(msg) { process.stdout.write(c.green("✓  ") + msg + "\n"); }

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

function readSkillBody() {
  if (!fs.existsSync(SKILL_SRC)) {
    err(`SKILL.md not found at ${SKILL_SRC} — package is corrupt.`);
    process.exit(1);
  }
  return fs.readFileSync(SKILL_SRC, "utf8");
}

function claudeMdBlock(skillBody) {
  // Strip YAML frontmatter from the skill body before embedding into CLAUDE.md.
  const stripped = skillBody.replace(/^---[\s\S]*?---\s*/m, "").trim();
  return [
    MARKER_START,
    "",
    "## Integrity Protocol (agent-liedetector-skill)",
    "",
    "Applies to every research- or decision-relevant response. Skip the protocol entirely on trivial requests (one-line fixes, simple lookups, casual conversation) per the \"When NOT to use\" rules below. When you do tag, the ~N% on yellow and orange is required, not optional.",
    "",
    stripped,
    "",
    MARKER_END,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdInstall(opts) {
  const skillBody = readSkillBody();

  // 1. Install the skill file.
  if (opts.dryRun) {
    log(c.dim("would write: ") + SKILL_TARGET);
  } else {
    ensureDir(SKILL_TARGET_DIR);
    fs.writeFileSync(SKILL_TARGET, skillBody);
    ok(`skill installed → ${c.dim(SKILL_TARGET)}`);
  }

  // 1b. Install support material (references/, scripts/, evals/, resources/)
  // so SKILL.md's links resolve in the installed skill dir.
  for (const dir of SUPPORT_DIRS) {
    const src = path.join(PKG_ROOT, dir);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(SKILL_TARGET_DIR, dir);
    if (opts.dryRun) {
      log(c.dim("would copy: ") + dest + path.sep);
    } else {
      fs.cpSync(src, dest, { recursive: true });
      ok(`${dir}/ installed → ${c.dim(dest)}`);
    }
  }

  // 2. Optionally append the always-on block to ~/.claude/CLAUDE.md.
  if (opts.skillOnly) {
    log(c.dim("--skill-only: leaving ~/.claude/CLAUDE.md untouched"));
    log("");
    log("To enable globally on every Claude Code session, run:");
    log(`  ${c.bold("npx agent-liedetector-skill install --global")}`);
    return;
  }

  const block = claudeMdBlock(skillBody);
  const existing = fs.existsSync(CLAUDE_MD) ? fs.readFileSync(CLAUDE_MD, "utf8") : "";

  if (existing.includes(MARKER_START)) {
    if (opts.dryRun) {
      log(c.dim("would replace existing block in: ") + CLAUDE_MD);
      return;
    }
    const re = new RegExp(`${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}\\n?`, "m");
    const updated = existing.replace(re, block);
    fs.writeFileSync(CLAUDE_MD, updated);
    ok(`refreshed CLAUDE.md block → ${c.dim(CLAUDE_MD)}`);
    return;
  }

  let proceed = opts.global;
  if (!opts.global && !opts.dryRun) {
    log("");
    log("The always-on protocol applies to every Claude Code response, not just");
    log("when the skill is triggered. It adds ~200 tokens to the system prompt.");
    log("");
    const ans = await prompt("Append to ~/.claude/CLAUDE.md? [y/N] ");
    proceed = ans === "y" || ans === "yes";
  }

  if (!proceed) {
    if (opts.dryRun) log(c.dim("would skip CLAUDE.md append (no --global)"));
    else log(c.dim("skipped CLAUDE.md append. Re-run with --global to enable globally."));
    return;
  }

  if (opts.dryRun) {
    log(c.dim("would append block to: ") + CLAUDE_MD);
    return;
  }

  ensureDir(CLAUDE_HOME);
  const separator = existing && !existing.endsWith("\n\n") ? "\n\n" : "";
  fs.writeFileSync(CLAUDE_MD, existing + separator + block);
  ok(`always-on protocol enabled → ${c.dim(CLAUDE_MD)}`);
  log("");
  log("Open a new Claude Code session to activate. Every response will now");
  log("carry confidence tags on research- or decision-relevant claims.");
}

function cmdUninstall(opts) {
  let removedAnything = false;

  if (fs.existsSync(SKILL_TARGET)) {
    if (opts.dryRun) {
      log(c.dim("would delete: ") + SKILL_TARGET);
    } else {
      fs.rmSync(SKILL_TARGET_DIR, { recursive: true, force: true });
      ok(`skill removed → ${c.dim(SKILL_TARGET_DIR)}`);
    }
    removedAnything = true;
  }

  if (fs.existsSync(CLAUDE_MD)) {
    const existing = fs.readFileSync(CLAUDE_MD, "utf8");
    if (existing.includes(MARKER_START)) {
      if (opts.dryRun) {
        log(c.dim("would strip block from: ") + CLAUDE_MD);
      } else {
        const re = new RegExp(`\\n*${escapeRe(MARKER_START)}[\\s\\S]*?${escapeRe(MARKER_END)}\\n*`, "m");
        const updated = existing.replace(re, "\n").replace(/\n{3,}/g, "\n\n");
        fs.writeFileSync(CLAUDE_MD, updated);
        ok(`always-on block removed → ${c.dim(CLAUDE_MD)}`);
      }
      removedAnything = true;
    }
  }

  if (!removedAnything) {
    warn("nothing to uninstall — agent-liedetector-skill wasn't installed.");
  }
}

function cmdStatus() {
  const skillInstalled = fs.existsSync(SKILL_TARGET);
  const claudeMdHasBlock =
    fs.existsSync(CLAUDE_MD) && fs.readFileSync(CLAUDE_MD, "utf8").includes(MARKER_START);

  log("");
  log(c.bold("agent-liedetector-skill — status"));
  log("");
  log(`  skill (~/.claude/skills/liedetector/SKILL.md): ${skillInstalled ? c.green("installed") : c.dim("not installed")}`);
  log(`  always-on block in ~/.claude/CLAUDE.md:        ${claudeMdHasBlock ? c.green("active") : c.dim("inactive")}`);
  log("");

  if (!skillInstalled && !claudeMdHasBlock) {
    log(c.dim("  → run `npx agent-liedetector-skill install` to enable"));
  } else if (skillInstalled && !claudeMdHasBlock) {
    log(c.dim("  → skill loads on demand. Add `--global` to install for always-on."));
  } else if (skillInstalled && claudeMdHasBlock) {
    log(c.dim("  → fully enabled. Every Claude Code response will carry confidence tags."));
  }
  log("");
}

function cmdHelp() {
  log("");
  log(c.bold("🕵️  agent-liedetector-skill"));
  log("");
  log("Confidence-calibration tags for every AI agent response.");
  log("");
  log(c.bold("Usage:"));
  log("  npx agent-liedetector-skill <command> [options]");
  log("  npx liedetector <command> [options]            (short alias)");
  log("");
  log(c.bold("Commands:"));
  log("  install              install the skill; prompt to enable globally");
  log("  install --global     install + auto-append to ~/.claude/CLAUDE.md");
  log("  install --skill-only install only the skill, leave CLAUDE.md alone");
  log("  uninstall            remove the skill and the CLAUDE.md block");
  log("  status               show what's installed");
  log("  help                 show this message");
  log("");
  log(c.bold("Flags:"));
  log("  --dry-run            print what would happen, write nothing");
  log("");
  log(c.bold("Example:"));
  log("  npx agent-liedetector-skill install");
  log("  → drops SKILL.md into ~/.claude/skills/liedetector/");
  log("  → asks if you want every response tagged");
  log("");
  log("More: https://github.com/NagyVikt/agent-liedetector-skill");
  log("");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function parseArgs(argv) {
  const cmd = argv[2] ?? "help";
  const flags = new Set(argv.slice(3));
  return {
    cmd,
    global: flags.has("--global"),
    skillOnly: flags.has("--skill-only"),
    dryRun: flags.has("--dry-run"),
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  switch (opts.cmd) {
    case "install":
      await cmdInstall(opts);
      break;
    case "uninstall":
    case "remove":
      cmdUninstall(opts);
      break;
    case "status":
      cmdStatus();
      break;
    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;
    default:
      err(`unknown command: ${opts.cmd}`);
      cmdHelp();
      process.exit(1);
  }
}

main().catch((e) => {
  err(e.message || String(e));
  process.exit(1);
});
