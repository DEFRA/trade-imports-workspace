#!/bin/bash
# Behaviour test for ac-table.sh and verify-consistency.sh.
#
# Usage: bash tools/review/review-gates.test.sh
#
# Builds a throwaway review workarea, then checks how test reviewers'
# acceptance-criteria files merge into one table, and when the consistency
# gate counts a repo as done. Exits 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

ID="EUDPA-99996"
REPO_A="trade-imports-address-book"
REPO_B="trade-imports-ins-tests"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$ID"

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

[[ -e "$REVIEW_DIR" ]] && { echo "$REVIEW_DIR already exists; refusing to overwrite it" >&2; exit 1; }
trap 'rm -rf "$REVIEW_DIR"' EXIT
mkdir -p "$REVIEW_DIR/ac" "$REVIEW_DIR/file-reviews/$REPO_A" "$REVIEW_DIR/file-reviews/$REPO_B"

echo "ac-table.sh"

bash "$SCRIPT_DIR/ac-table.sh" "$ID" > /dev/null 2>&1
check "no ac files exits 1" "$?" "1"

cat > "$REVIEW_DIR/ac/address-book-java-tests-1.json" <<'EOF'
[
  {"criterion": "AC10: the address is saved", "evidence": []},
  {"criterion": "AC2: an empty postcode is refused",
   "evidence": [{"file": "src/test/java/PostcodeTest.java", "line": 12, "test": "refuses | empty"}]},
  {"criterion": "AC1: the page shows the address", "evidence": []}
]
EOF
cat > "$REVIEW_DIR/ac/ins-tests-e2e-1.json" <<'EOF'
[
  {"criterion": "AC1: page shows the address",
   "evidence": [{"file": "tests/address.spec.js", "line": 30, "test": "shows the address"}]},
  {"criterion": "AC2: an empty postcode is refused",
   "evidence": [{"file": "src/test/java/PostcodeTest.java", "line": 12, "test": "refuses | empty"}]},
  {"criterion": "AC10: the address is saved", "evidence": []},
  {"criterion": "Works on mobile", "evidence": []}
]
EOF

json=$(bash "$SCRIPT_DIR/ac-table.sh" "$ID" --json)
check "criteria merge by AC label" "$(jq length <<< "$json")" "4"
check "AC order is numeric, unlabelled last" \
    "$(jq -r 'map(.criterion[0:4]) | join(",")' <<< "$json")" "AC1:,AC2:,AC10,Work"
check "first group's wording is kept" "$(jq -r '.[0].criterion' <<< "$json")" "AC1: the page shows the address"
check "evidence from another group counts" "$(jq '.[0].evidence | length' <<< "$json")" "1"
check "the same test is listed once" "$(jq '.[1].evidence | length' <<< "$json")" "1"
check "no evidence anywhere stays empty" "$(jq '.[2].evidence | length' <<< "$json")" "0"

table=$(bash "$SCRIPT_DIR/ac-table.sh" "$ID")
check "table has a header and one row per criterion" "$(wc -l <<< "$table" | tr -d ' ')" "6"
check "a proved criterion says Yes" "$(sed -n 3p <<< "$table" | cut -d'|' -f4 | tr -d ' ')" "Yes"
check "an unproved criterion says No" "$(sed -n 5p <<< "$table" | cut -d'|' -f4 | tr -d ' ')" "No"
check "a pipe in a test title is escaped" "$(grep -c 'refuses \\| empty' <<< "$table")" "1"

echo "verify-consistency.sh"

jq -n --arg a "$REPO_A" --arg b "$REPO_B" \
    '{id: "EUDPA-99996", themes: ["code", "consistency"], prs: [{repo: $a, pr: 1}, {repo: $b, pr: 2}]}' \
    > "$REVIEW_DIR/.review-meta.json"
echo "# Consistency Check" > "$REVIEW_DIR/file-reviews/$REPO_A/_consistency-check.md"
echo "# Consistency Check" > "$REVIEW_DIR/file-reviews/$REPO_B/_consistency-check.md"

gate() { bash "$SCRIPT_DIR/verify-consistency.sh" "$ID" --json | jq -c "$1"; }

check "without a consistency folder the markdown is enough" "$(gate .complete)" "true"

mkdir -p "$REVIEW_DIR/consistency"
check "with the folder, a repo with no items list is pending" \
    "$(gate .pending_repos)" "[\"$REPO_A\",\"$REPO_B\"]"

echo '[]' > "$REVIEW_DIR/consistency/$REPO_A.items.json"
echo '{"not": "a list"}' > "$REVIEW_DIR/consistency/$REPO_B.items.json"
check "an empty list passes, an object does not" "$(gate .pending_repos)" "[\"$REPO_B\"]"

echo '[{"repo": "r", "file": "f", "line": 1}]' > "$REVIEW_DIR/consistency/$REPO_B.items.json"
check "every repo with a list is complete" "$(gate .complete)" "true"

: > "$REVIEW_DIR/file-reviews/$REPO_A/_consistency-check.md"
check "an items list without the markdown is still pending" "$(gate .pending_repos)" "[\"$REPO_A\"]"

if [[ "$failures" -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
