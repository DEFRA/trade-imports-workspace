#!/bin/bash
# Behaviour test for share-review.sh's --summary mode and its size guard.
#
# Usage: bash tools/review/share-review.summary.test.sh
#
# Builds a throwaway review workarea big enough that the full item table
# passes GitHub's comment limit, then checks that the full table is
# refused with the figures and that --summary fits and carries the counts.
# Exits 0 when every check passes, 1 on the first failure.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"
SHARE="$SCRIPT_DIR/share-review.sh"

TICKET="EUDPA-99999"
REPO="trade-imports-animals-frontend"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$TICKET"
GITHUB_COMMENT_LIMIT=65536

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

check_contains() {
    local what="$1" file="$2" needle="$3"
    if grep -qF "$needle" "$file"; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: '$needle' not in $file"
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

# A verdict line, because the body carries it.
cat > "$REVIEW_DIR/review-index.md" <<'EOF'
# Code Review: EUDPA-99999

**Verdict:** PASS — fixture verdict for the summary test.
EOF

cat > "$REVIEW_DIR/.review-meta.json" <<EOF
{
  "id": "$TICKET",
  "ticket": "$TICKET",
  "prs": [{ "repo": "$REPO", "pr": 1, "commit": "0000000", "state": "open" }]
}
EOF

# 200 items, each carrying enough prose that the full table clears the
# comment limit — which is the condition --summary exists for. Two are
# left open so the severity table has a non-zero Open column to show.
jq -n --argjson n 200 '
  {
    items: [range(0; $n) | {
      id: (. + 1),
      file: "src/server/app/feature/file-\(.).js",
      line: (. * 7 + 1),
      severity: (if . % 50 == 0 then "Critical" elif . % 3 == 0 then "Minor" else "Major" end),
      category: (["comments", "structure", "duplication", "naming", "logging"][. % 5]),
      issue: ("Item \(.): " + ("the issue text is deliberately long so that the rendered table clears the comment limit the summary mode exists to stay under. " * 3)),
      fix: ("Must: " + ("what this item must satisfy, at similar length. " * 3)),
      disposition: "Fix",
      status: (if . < 2 then "Not Done" else "Done" end),
      notes: "deadbeef"
    }]
  }' > "$REVIEW_DIR/items.$REPO.json"

echo "share-review.sh --summary"

# 1. The full table is refused, naming both figures.
full_out=$("$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --dry-run 2>&1)
check "full table exits non-zero" "$?" "1"
if grep -q "GitHub accepts $GITHUB_COMMENT_LIMIT" <<<"$full_out"; then
    echo "  ok    full table names the limit"
else
    echo "  FAIL  full table did not name the limit. Got: $full_out"
    failures=$((failures + 1))
fi
if grep -q -- "--summary" <<<"$full_out"; then
    echo "  ok    full table points at --summary"
else
    echo "  FAIL  full table did not point at --summary"
    failures=$((failures + 1))
fi

# 2. --summary renders, fits, and carries the counts.
sum_out=$("$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --summary --dry-run 2>&1)
sum_rc=$?
check "--summary exits zero" "$sum_rc" "0"

body=$(grep -oE '/[^ ]+share-review-[^ ]+' <<<"$sum_out" | head -1)
if [[ -z "$body" || ! -f "$body" ]]; then
    echo "  FAIL  --summary rendered no body. Got: $sum_out"
    failures=$((failures + 1))
else
    size=$(wc -c < "$body" | tr -d '[:space:]')
    if (( size <= GITHUB_COMMENT_LIMIT )); then
        echo "  ok    --summary body fits ($size <= $GITHUB_COMMENT_LIMIT)"
    else
        echo "  FAIL  --summary body is $size, over $GITHUB_COMMENT_LIMIT"
        failures=$((failures + 1))
    fi

    check_contains "carries the verdict"        "$body" "fixture verdict for the summary test"
    check_contains "carries the status table"   "$body" "| Status | Items |"
    check_contains "counts the closed items"    "$body" "| Done / Fix | 198 |"
    check_contains "counts the open items"      "$body" "| Not Done / Fix | 2 |"
    check_contains "carries the severity table" "$body" "| Severity | Open | Total |"
    check_contains "counts open by severity"    "$body" "| Critical | 1 | 4 |"
    check_contains "names the items file"       "$body" "items.$REPO.json"

    # The whole point: no per-item rows.
    if grep -qF "the issue text is deliberately long" "$body"; then
        echo "  FAIL  --summary leaked per-item issue text"
        failures=$((failures + 1))
    else
        echo "  ok    --summary carries no per-item rows"
    fi
    rm -f "$body"
fi

echo
if (( failures == 0 )); then
    echo "All checks passed."
    exit 0
fi
echo "$failures check(s) failed."
exit 1
