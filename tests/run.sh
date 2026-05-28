#!/usr/bin/env bash
# Reference runner for skill-eval fixtures.
# This is a SKELETON. Wire it up to your LLM provider before running.
set -euo pipefail

FIXTURES="${@:-tests/fixtures/*.yaml}"
SKILL_MD="$(dirname "$0")/../SKILL.md"

if [ ! -f "$SKILL_MD" ]; then
  echo "❌ SKILL.md not found at $SKILL_MD"
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}${OPENAI_API_KEY:-}" ]; then
  cat <<EOF
⚠ No provider API key set. This runner is a SKELETON.
  Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment, then implement
  the call_model function below to send (system=SKILL.md, user=prompt) and
  return the response body. The fixture matcher logic is already implemented.
EOF
  exit 1
fi

# ----------------------------------------------------------------------------
# IMPLEMENT THIS FUNCTION for your provider of choice:
# Input:  $1 = system prompt path, $2 = user prompt string
# Output: model response on stdout
# ----------------------------------------------------------------------------
call_model() {
  local system_file="$1"
  local user_prompt="$2"
  echo "STUB: implement call_model() for your LLM provider" >&2
  return 1
}

# Matcher: checks fixture expectations against model output.
match_fixture() {
  local fixture_file="$1"
  local response="$2"
  local id; id=$(yq -r '.id' "$fixture_file")
  local fail=0

  # must_include_one_of (at least one must appear)
  local must_one; must_one=$(yq -r '.expect.must_include_one_of[]?' "$fixture_file" 2>/dev/null || true)
  if [ -n "$must_one" ]; then
    local hit=0
    while IFS= read -r needle; do
      [ -z "$needle" ] && continue
      if echo "$response" | grep -qF -- "$needle"; then hit=1; break; fi
    done <<< "$must_one"
    if [ "$hit" -eq 0 ]; then fail=1; echo "  ✗ missing all of must_include_one_of"; fi
  fi

  # must_not_include (none may appear)
  local must_not; must_not=$(yq -r '.expect.must_not_include[]?' "$fixture_file" 2>/dev/null || true)
  while IFS= read -r needle; do
    [ -z "$needle" ] && continue
    if echo "$response" | grep -qF -- "$needle"; then
      fail=1; echo "  ✗ unexpectedly contains: $needle"
    fi
  done <<< "$must_not"

  if [ "$fail" -eq 0 ]; then echo "  ✓ $id"; else echo "  ✗ $id FAILED"; fi
  return "$fail"
}

pass=0; total=0
for f in $FIXTURES; do
  [ -f "$f" ] || continue
  total=$((total+1))
  prompt=$(yq -r '.prompt // .prompt_turn_1' "$f")
  response=$(call_model "$SKILL_MD" "$prompt")
  if match_fixture "$f" "$response"; then pass=$((pass+1)); fi
done

echo ""
echo "─────────────────────────────"
echo "Result: $pass/$total fixtures passed"
echo "─────────────────────────────"
[ "$pass" -eq "$total" ]
