#!/bin/bash
# Behaviour test for the verdict share-review.sh posts on each PR.
#
# Usage: bash tools/review/share-review.verdict.test.sh
#
# Builds a throwaway review workarea with three PRs: one with nothing open,
# one with a Major item open and one with only a Minor item open. Checks
# that each PR's verdict comes from its own items, that the other PRs not
# APPROVED are named as possible blockers, and that a ticket with nothing
# open anywhere posts a plain APPROVED. Exits 0 when every check passes,
# 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"
SHARE="$SCRIPT_DIR/share-review.sh"

TICKET="EUDPA-99995"
CLEAN_REPO="trade-imports-workspace"
FAILING_REPO="trade-imports-animals-backend"
MINOR_REPO="trade-imports-plants-backend"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$TICKET"

failures=0

check_line() {
    local what="$1" file="$2" want="$3"
    local got
    got=$(grep -m1 '^\*\*Verdict:\*\*' "$file")
    if [[ "$got" == "$want" ]]; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: wanted '$want', got '$got'"
        failures=$((failures + 1))
    fi
}

verdict_of() {
    local repo="$1" pr="$2" out body
    out=$("$SHARE" "$TICKET" --repo "$repo" --pr "$pr" --comment-only --summary --dry-run 2>&1)
    body=$(grep -oE '/[^ ]+share-review-[^ ]+' <<<"$out" | head -1)
    if [[ -z "$body" || ! -f "$body" ]]; then
        echo "  FAIL  rendered no body for $repo#$pr. Got: $out" >&2
        return
    fi
    echo "$body"
}

items_with() {
    local severity="$1" status="$2"
    jq -n --arg severity "$severity" --arg status "$status" '{
      items: [
        { id: 1, severity: "Major", issue: "closed", disposition: "Fix", status: "Done", notes: "abc1234" },
        { id: 2, severity: $severity, issue: "the one that varies", disposition: "Fix", status: $status, notes: null }
      ]
    }'
}

cleanup() { rm -rf "$REVIEW_DIR"; }
trap cleanup EXIT

if [[ -e "$REVIEW_DIR" ]]; then
    echo "Refusing to run: $REVIEW_DIR already exists" >&2
    exit 1
fi
mkdir -p "$REVIEW_DIR"

cat > "$REVIEW_DIR/review-index.md" <<'EOF'
# Code Review: EUDPA-99995

**Verdict:** FAIL
**Notes:** fixture notes.
EOF

cat > "$REVIEW_DIR/.review-meta.json" <<EOF
{
  "ticket": "$TICKET",
  "prs": [
    { "repo": "$FAILING_REPO", "pr": 123, "commit": "aaaaaaaa", "state": "open" },
    { "repo": "$MINOR_REPO", "pr": 14, "commit": "bbbbbbbb", "state": "open" },
    { "repo": "$CLEAN_REPO", "pr": 209, "commit": "cccccccc", "state": "open" }
  ]
}
EOF

items_with Minor Done      > "$REVIEW_DIR/items.$CLEAN_REPO.json"
items_with Major "Not Done" > "$REVIEW_DIR/items.$FAILING_REPO.json"
items_with Minor "Not Done" > "$REVIEW_DIR/items.$MINOR_REPO.json"

echo "A PR with nothing open, beside PRs that are not approved"
body=$(verdict_of "$CLEAN_REPO" 209)
check_line "is approved and names both others" "$body" \
    "**Verdict:** APPROVED, potentially blocked by DEFRA/$FAILING_REPO#123 and DEFRA/$MINOR_REPO#14. Merge this PR with caution."

echo "A PR with a Major item open"
body=$(verdict_of "$FAILING_REPO" 123)
check_line "fails first and names the other" "$body" \
    "**Verdict:** FAIL. Also potentially blocked by DEFRA/$MINOR_REPO#14."

echo "A PR with only a Minor item open"
body=$(verdict_of "$MINOR_REPO" 14)
check_line "is approved with changes and names the failing PR" "$body" \
    "**Verdict:** APPROVED WITH CHANGES, potentially blocked by DEFRA/$FAILING_REPO#123. Merge this PR with caution."

echo "An item nobody has walked counts as open"
jq '.items[1].disposition = null | .items[1].status = null' "$REVIEW_DIR/items.$MINOR_REPO.json" > "$REVIEW_DIR/tmp.json"
mv "$REVIEW_DIR/tmp.json" "$REVIEW_DIR/items.$MINOR_REPO.json"
body=$(verdict_of "$MINOR_REPO" 14)
check_line "is still approved with changes" "$body" \
    "**Verdict:** APPROVED WITH CHANGES, potentially blocked by DEFRA/$FAILING_REPO#123. Merge this PR with caution."

echo "A ticket with nothing open anywhere"
items_with Major Done > "$REVIEW_DIR/items.$FAILING_REPO.json"
items_with Minor Done > "$REVIEW_DIR/items.$MINOR_REPO.json"
body=$(verdict_of "$CLEAN_REPO" 209)
check_line "posts a plain APPROVED" "$body" "**Verdict:** APPROVED"

check_has() {
    local what="$1" file="$2" needle="$3"
    if [[ -f "$file" ]] && grep -qF -- "$needle" "$file"; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: '$needle' not in '$file'"
        failures=$((failures + 1))
    fi
}

check_lacks() {
    local what="$1" file="$2" needle="$3"
    if [[ -f "$file" ]] && ! grep -qF -- "$needle" "$file"; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: '$needle' is in '$file', or there is no body"
        failures=$((failures + 1))
    fi
}

echo "A summary with nothing open and nothing merged"
check_has   "says every Fix item is done" "$body" "Every **Fix** item for this repo is **Done** on this branch."
check_lacks "points at no columns a summary lacks" "$body" "Status and Notes columns"
check_lacks "mentions no Merged items" "$body" "**Merged**"
check_has   "counts two items in the plural" "$body" "_2 items in this repo."

echo "A summary with a Merged item"
jq '.items += [{ id: 3, severity: "Minor", issue: "folded", disposition: "Merged", status: "—", notes: "merged into #1" }]' \
    "$REVIEW_DIR/items.$CLEAN_REPO.json" > "$REVIEW_DIR/tmp.json"
mv "$REVIEW_DIR/tmp.json" "$REVIEW_DIR/items.$CLEAN_REPO.json"
body=$(verdict_of "$CLEAN_REPO" 209)
check_has "says what Merged items are" "$body" "**Merged** items are sub-findings folded into those Fix items."

echo "A repo with one item"
jq '{items: [.items[0]]}' "$REVIEW_DIR/items.$CLEAN_REPO.json" > "$REVIEW_DIR/tmp.json"
mv "$REVIEW_DIR/tmp.json" "$REVIEW_DIR/items.$CLEAN_REPO.json"
body=$(verdict_of "$CLEAN_REPO" 209)
check_has "counts one item in the singular" "$body" "_1 item in this repo. Its issue"

echo "A summary told the PR's head"
out=$("$SHARE" "$TICKET" --repo "$CLEAN_REPO" --pr 209 --comment-only --summary --head dddddddd44444444 --dry-run 2>&1)
body=$(grep -oE '/[^ ]+share-review-[^ ]+' <<<"$out" | head -1)
check_has "says the commits after the review have not been reviewed" "$body" \
    '**PR head:** `dddddddd`. The commits after `cccccccc` are counted below by the items they closed, but have not been reviewed.'
out=$("$SHARE" "$TICKET" --repo "$CLEAN_REPO" --pr 209 --comment-only --summary --head cccccccc --dry-run 2>&1)
body=$(grep -oE '/[^ ]+share-review-[^ ]+' <<<"$out" | head -1)
check_lacks "says nothing more when the head is the reviewed commit" "$body" "**PR head:**"

echo
if (( failures == 0 )); then
    echo "All checks passed."
    exit 0
fi
echo "$failures check(s) failed."
exit 1
