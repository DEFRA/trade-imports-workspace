#!/bin/bash
# Behaviour test for share-review.sh's --refresh and --head options.
#
# Usage: bash tools/review/share-review.refresh.test.sh
#
# Builds a throwaway review workarea with two re-reviews recorded, then checks
# that --refresh renders the counts under a re-review heading naming the first
# reviewed commit and the latest re-reviewed one, counts items nobody has
# walked as open, that --head notes commits
# the re-review did not read only when the head is past it, that --head is
# refused without one PR and --refresh, and that a repo with no re-review is
# refused. Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"
SHARE="$SCRIPT_DIR/share-review.sh"

TICKET="EUDPA-99996"
REPO="trade-imports-animals-backend"
UNREVIEWED_REPO="trade-imports-plants-backend"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$TICKET"

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
    if grep -qF -- "$needle" "$file"; then
        echo "  ok    $what"
    else
        echo "  FAIL  $what: '$needle' not in $file"
        failures=$((failures + 1))
    fi
}

check_absent() {
    local what="$1" file="$2" needle="$3"
    if grep -qF -- "$needle" "$file"; then
        echo "  FAIL  $what: '$needle' is in $file"
        failures=$((failures + 1))
    else
        echo "  ok    $what"
    fi
}

rendered_body() { grep -oE '/[^ ]+share-review-[^ ]+' <<<"$1" | head -1; }

cleanup() { rm -rf "$REVIEW_DIR"; }
trap cleanup EXIT

if [[ -e "$REVIEW_DIR" ]]; then
    echo "Refusing to run: $REVIEW_DIR already exists" >&2
    exit 1
fi
mkdir -p "$REVIEW_DIR"

cat > "$REVIEW_DIR/review-index.md" <<'EOF'
# Code Review: EUDPA-99996

**Verdict:** APPROVED — fixture verdict for the refresh test.
EOF

cat > "$REVIEW_DIR/.review-meta.json" <<EOF
{
  "ticket": "$TICKET",
  "prs": [
    { "repo": "$REPO", "pr": 1, "commit": "aaaaaaaa11111111", "state": "open" },
    { "repo": "$UNREVIEWED_REPO", "pr": 2, "commit": "dddddddd44444444", "state": "open" }
  ],
  "re_reviews": [
    { "changes": [{ "repo": "$REPO", "pr": 1, "reviewed_commit": "aaaaaaaa11111111", "current_commit": "bbbbbbbb22222222" }] },
    { "changes": [{ "repo": "$REPO", "pr": 1, "reviewed_commit": "bbbbbbbb22222222", "current_commit": "cccccccc33333333" }] }
  ]
}
EOF

cat > "$REVIEW_DIR/items.$REPO.json" <<'EOF'
{
  "items": [
    { "id": 1, "severity": "Major", "issue": "Fixed item issue text", "disposition": "Fix", "status": "Done", "notes": "abc1234" },
    { "id": 2, "severity": "Minor", "issue": "Open item issue text", "disposition": "Fix", "status": "Not Done", "notes": null },
    { "id": 3, "severity": "Major", "issue": "Declined item issue text", "disposition": "Won't Fix", "status": "—", "notes": "no evidence" },
    { "id": 4, "severity": "Minor", "issue": "Unwalked item issue text", "disposition": null, "status": null, "notes": null }
  ]
}
EOF
cp "$REVIEW_DIR/items.$REPO.json" "$REVIEW_DIR/items.$UNREVIEWED_REPO.json"

echo "Renders the outcome under a re-review heading"
out=$("$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --refresh --dry-run 2>&1)
check "exits zero" "$?" "0"
body=$(rendered_body "$out")
if [[ -z "$body" || ! -f "$body" ]]; then
    echo "  FAIL  rendered no body. Got: $out"
    failures=$((failures + 1))
else
    check_contains "has the re-review heading"          "$body" "# Code re-review — $TICKET"
    check_contains "carries the verdict"                "$body" "fixture verdict for the refresh test"
    check_contains "names the first reviewed commit"    "$body" '**First reviewed at:** `aaaaaaaa`'
    check_contains "names the latest re-review"         "$body" '**Re-reviewed at:** `cccccccc`'
    check_contains "counts the fixed items"             "$body" "| Done / Fix | 1 |"
    check_contains "counts the declined items"          "$body" "| — / Won't Fix | 1 |"
    check_contains "counts the unwalked items"          "$body" "| Not walked | 1 |"
    check_contains "counts unwalked items as open"      "$body" "| Minor | 2 | 2 |"
    check_contains "says how many remain open"          "$body" "2 item(s) remain open in this repo."
    check_absent   "carries no per-item rows"           "$body" "Fixed item issue text"
    check_absent   "notes no head without --head"       "$body" "**PR head:**"
    rm -f "$body"
fi

echo "Notes the commits after the re-review when the head is past it"
out=$("$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --refresh --head eeeeeeee55555555 --dry-run 2>&1)
check "exits zero" "$?" "0"
body=$(rendered_body "$out")
if [[ -n "$body" && -f "$body" ]]; then
    check_contains "names the head and what was not re-reviewed" "$body" \
        '**PR head:** `eeeeeeee`. The commits after `cccccccc` are counted below by the items they closed, but have not been re-reviewed.'
    rm -f "$body"
else
    echo "  FAIL  rendered no body. Got: $out"
    failures=$((failures + 1))
fi

echo "Says nothing more when the head is the re-reviewed commit"
out=$("$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --refresh --head cccccccc33333333 --dry-run 2>&1)
body=$(rendered_body "$out")
if [[ -n "$body" && -f "$body" ]]; then
    check_absent "notes no head" "$body" "**PR head:**"
    rm -f "$body"
else
    echo "  FAIL  rendered no body. Got: $out"
    failures=$((failures + 1))
fi

echo "Refuses --head without one PR and --refresh"
"$SHARE" "$TICKET" --repo "$REPO" --comment-only --refresh --head eeeeeeee --dry-run > /dev/null 2>&1
check "refused without --pr" "$?" "1"
"$SHARE" "$TICKET" --repo "$REPO" --pr 1 --comment-only --head eeeeeeee --dry-run > /dev/null 2>&1
check "refused without --refresh" "$?" "1"

echo "Refuses a repo with no re-review recorded"
out=$("$SHARE" "$TICKET" --repo "$UNREVIEWED_REPO" --pr 2 --comment-only --refresh --dry-run 2>&1)
check "exits non-zero" "$?" "1"
if grep -qF "No re-review recorded for $UNREVIEWED_REPO" <<<"$out"; then
    echo "  ok    names the repo"
else
    echo "  FAIL  did not name the repo. Got: $out"
    failures=$((failures + 1))
fi

echo
if (( failures == 0 )); then
    echo "All checks passed."
    exit 0
fi
echo "$failures check(s) failed."
exit 1
