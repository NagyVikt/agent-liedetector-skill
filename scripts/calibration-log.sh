#!/usr/bin/env bash
# liedetector/scripts/calibration-log.sh — append one calibration record to the log.
#
# Usage:
#   bash calibration-log.sh <TAG> <NOTE>
#
# TAG  — the confidence tag that was overridden, e.g. VERIFIED, INFERRED~80, GUESSED~30
# NOTE — free text: what was claimed and what turned out to be true
#
# Output file: ${HOME}/.config/cue/liedetector-calibration.log (JSONL)
# Each line: {"ts":"<ISO8601>","tag":"<TAG>","note":"<NOTE>"}
#
# Run with `bash` — no chmod needed.
set -eu

LOG_DIR="${HOME}/.config/cue"
LOG_FILE="${LOG_DIR}/liedetector-calibration.log"

usage() {
  printf 'Usage: bash %s <TAG> <NOTE>\n' "$(basename "$0")" >&2
  printf '  TAG  e.g. VERIFIED, INFERRED~80, GUESSED~30\n' >&2
  printf '  NOTE free text — what was claimed, what was true\n' >&2
  exit 1
}

[ "${1:-}" = "" ] && usage
[ "${2:-}" = "" ] && usage

TAG="$1"
NOTE="$2"
TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$LOG_DIR"

# Escape backslashes and double-quotes for minimal JSONL safety.
safe_tag="$(printf '%s' "$TAG"  | sed 's/\\/\\\\/g; s/"/\\"/g')"
safe_note="$(printf '%s' "$NOTE" | sed 's/\\/\\\\/g; s/"/\\"/g')"

printf '{"ts":"%s","tag":"%s","note":"%s"}\n' \
  "$TS" "$safe_tag" "$safe_note" >> "$LOG_FILE"

printf 'Logged to %s\n' "$LOG_FILE"
