#!/bin/bash
# Behaviour test for render-items.sh --write.
#
# Usage: bash tools/review/render-items.write.test.sh
#
# Builds a throwaway review workarea and checks that --write replaces a
# stale items table, fills the paste-here comment, falls back to the
# Repository Verdict heading, keeps the rest of the summary as it was,
# and refuses a summary it has nowhere to write into.
# Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"
RENDER="$SCRIPT_DIR/render-items.sh"

TICKET="EUDPA-99998"
REPO="trade-imports-animals-frontend"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$TICKET"
SUMMARY="$REVIEW_DIR/review.$REPO.md"

failures=0

check() {
    local what="$1" got="$2" want="$3"
    if [[ "$got" == "$want" ]]; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: wanted '$want', got '$got'"
        failures=$((failures + 1))
    fi
}

cleanup() { rm -rf "$REVIEW_DIR"; }
trap cleanup EXIT

if [[ -e "$REVIEW_DIR" ]]; then
    echo "Refusing to run: $REVIEW_DIR already exists" >&2
    exit 1
fi
mkdir -p "$REVIEW_DIR"

cat > "$REVIEW_DIR/items.$REPO.json" <<'EOF'
{
  "items": [
    { "id": 1, "file": "src/a.js", "line": 3, "severity": "Major", "category": "naming",
      "issue": "First issue", "fix": "Must: rename it.", "disposition": "Fix", "status": "Done", "notes": "" },
    { "id": 2, "file": "src/b.js", "line": 9, "severity": "Minor", "category": "comments",
      "issue": "Second issue", "fix": "Must: trim it.", "disposition": "Discuss", "status": "Not Done", "notes": "Ask design" }
  ]
}
EOF

expected_table=$("$RENDER" "$TICKET" --repo "$REPO")

table_in_summary() { awk '/^\| # \| File \|/ { t = 1 } t && /^\|/ { print; next } t { exit }' "$SUMMARY"; }

echo "Replaces a stale table"
cat > "$SUMMARY" <<'EOF'
## Risk Assessment
**Overall Risk:** Low

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/a.js | 3 | Major | naming | First issue | rename it. |  |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
EOF
"$RENDER" "$TICKET" --repo "$REPO" --write > /dev/null
check "the table is the rendered one" "$(table_in_summary)" "$expected_table"
check "the table appears once" "$(grep -c '^| # | File |' "$SUMMARY")" "1"
check "the verdict is kept" "$(grep -c '^\*\*Status:\*\* NEEDS ATTENTION$' "$SUMMARY")" "1"
check "the risk section is kept" "$(sed -n 2p "$SUMMARY")" "**Overall Risk:** Low"
check "a blank line still separates the table from the verdict" \
    "$(grep -B1 '^## Repository Verdict' "$SUMMARY" | head -1)" ""

echo "Writing twice changes nothing"
before=$(cat "$SUMMARY")
"$RENDER" "$TICKET" --repo "$REPO" --write > /dev/null
check "the summary is unchanged" "$(cat "$SUMMARY")" "$before"

echo "Fills the paste-here comment"
cat > "$SUMMARY" <<'EOF'
## Risk Assessment
**Overall Risk:** Low

<!-- paste output of `render-items.sh EUDPA-XXXXX --repo {repo}` here.
     Full schema and `|` escape rules: assets/items-table.md.
     Disposition / Status / Notes start blank — walker fills them. -->

## Repository Verdict
EOF
"$RENDER" "$TICKET" --repo "$REPO" --write > /dev/null
check "the table is the rendered one" "$(table_in_summary)" "$expected_table"
check "the comment is gone" "$(grep -c 'paste output of' "$SUMMARY")" "0"

echo "Falls back to the Repository Verdict heading"
cat > "$SUMMARY" <<'EOF'
## Risk Assessment
**Overall Risk:** Low

## Repository Verdict
EOF
"$RENDER" "$TICKET" --repo "$REPO" --write > /dev/null
check "the table is the rendered one" "$(table_in_summary)" "$expected_table"
check "the table comes before the verdict" \
    "$(grep -n '^| # | File |\|^## Repository Verdict' "$SUMMARY" | cut -d: -f2 | cut -c1-5 | tr '\n' ' ')" "| # | ## Re "

echo "Refuses a summary with nowhere to write"
printf '## Summary\nNothing else.\n' > "$SUMMARY"
if "$RENDER" "$TICKET" --repo "$REPO" --write > /dev/null 2>&1; then
    check "exits non-zero" "0" "non-zero"
else
    check "exits non-zero" "non-zero" "non-zero"
fi
check "the summary is untouched" "$(cat "$SUMMARY")" "$(printf '## Summary\nNothing else.')"

echo "Without --write it only prints"
"$RENDER" "$TICKET" --repo "$REPO" > /dev/null
check "the summary is untouched" "$(cat "$SUMMARY")" "$(printf '## Summary\nNothing else.')"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
