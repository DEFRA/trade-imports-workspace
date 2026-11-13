#!/bin/bash
# Behaviour test for review-set-status.sh and the note message of review-mark.sh.
#
# Usage: bash tools/review/review-set-status.test.sh
#
# Builds a throwaway review workarea and checks that review-set-status.sh sets the
# status, adds a --note after the notes already there instead of replacing them,
# does not add the same note twice, leaves notes alone without --note or with an
# empty one, and reports a note only when it adds one. Also checks review-mark.sh
# reports "Notes set" only when given --note.
# Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"
SET_STATUS="$SCRIPT_DIR/review-set-status.sh"
MARK="$SCRIPT_DIR/review-mark.sh"

TICKET="EUDPA-99997"
REPO="trade-imports-animals-backend"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$TICKET"
ITEMS="$REVIEW_DIR/items.$REPO.json"

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

field() { jq -r --argjson id "$1" ".items[] | select(.id == \$id) | .$2 // \"<null>\"" "$ITEMS"; }

cleanup() { rm -rf "$REVIEW_DIR"; }
trap cleanup EXIT

if [[ -e "$REVIEW_DIR" ]]; then
    echo "Refusing to run: $REVIEW_DIR already exists" >&2
    exit 1
fi
mkdir -p "$REVIEW_DIR"

cat > "$ITEMS" <<'EOF'
{
  "items": [
    { "id": 1, "disposition": "Fix", "status": "Not Done", "notes": "Use saveWithStatus" },
    { "id": 2, "disposition": "Fix", "status": "Not Done", "notes": null }
  ]
}
EOF

echo "Adds a note after the decision already there"
output=$("$SET_STATUS" "$TICKET" --repo "$REPO" --item 1 --status Done --note "abc1234")
check "the status is Done" "$(field 1 status)" "Done"
check "the decision and the SHA are both kept" "$(field 1 notes)" "Use saveWithStatus; abc1234"
check "the output reports the note" "$output" "Updated #1 in $REPO: Status=Done, Note added"

echo "Does not add the same note twice"
"$SET_STATUS" "$TICKET" --repo "$REPO" --item 1 --status Done --note "abc1234" > /dev/null
check "the notes are unchanged" "$(field 1 notes)" "Use saveWithStatus; abc1234"

echo "Adds a later note after the earlier ones"
"$SET_STATUS" "$TICKET" --repo "$REPO" --item 1 --status Failed --note "tests red" > /dev/null
check "all three notes are kept in order" "$(field 1 notes)" "Use saveWithStatus; abc1234; tests red"

echo "Writes the note alone when the item has none"
"$SET_STATUS" "$TICKET" --repo "$REPO" --item 2 --status Done --note "def5678" > /dev/null
check "the notes hold only the SHA" "$(field 2 notes)" "def5678"

echo "Leaves notes alone without --note"
output=$("$SET_STATUS" "$TICKET" --repo "$REPO" --item 2 --status "Not Done")
check "the status changes" "$(field 2 status)" "Not Done"
check "the notes are unchanged" "$(field 2 notes)" "def5678"
check "the output reports no note" "$output" "Updated #2 in $REPO: Status=Not Done"

echo "Leaves notes alone with an empty --note"
"$SET_STATUS" "$TICKET" --repo "$REPO" --item 2 --status Done --note "" > /dev/null
check "the notes are unchanged" "$(field 2 notes)" "def5678"

echo "Leaves the disposition alone"
check "the disposition is still Fix" "$(field 1 disposition)" "Fix"

echo "review-mark.sh reports a note only when given one"
output=$("$MARK" "$TICKET" --repo "$REPO" --item 2 --disposition Fix)
check "no note reported without --note" "$output" "Marked #2 in $REPO: Disposition=Fix, Status=Not Done"
output=$("$MARK" "$TICKET" --repo "$REPO" --item 2 --disposition Fix --note "Agreed")
check "a note is reported with --note" "$output" "Marked #2 in $REPO: Disposition=Fix, Status=Not Done, Notes set"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
