#!/bin/bash
# Behaviour test for the review scripts' batch mode: review-add-item.sh
# --from, review-mark.sh --from and file-review-write.sh.
#
# Usage: bash tools/review/batch-writes.test.sh
#
# Builds a throwaway review workarea, then checks that a batch writes every
# entry in one call, and that a batch with one bad entry writes nothing and
# leaves other files alone. Exits 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

TICKET="EUDPA-99998"
REPO="trade-imports-address-book"
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

[[ -e "$REVIEW_DIR" ]] && { echo "$REVIEW_DIR already exists; refusing to overwrite it" >&2; exit 1; }
scratch=$(mktemp -d)
trap 'rm -rf "$REVIEW_DIR" "$scratch"' EXIT
mkdir -p "$REVIEW_DIR"

placeholder() {
    bash "$SCRIPT_DIR/file-review-init.sh" "$TICKET" --repo "$REPO" --file "$1" \
        --commit abc123 --pr 21 --mode FRESH > /dev/null
}

review_json() {
    echo "$REVIEW_DIR/file-reviews/$REPO/${1//\//_}.review.json"
}

echo "review-add-item.sh --from"

cat > "$scratch/items.json" <<EOF
[
  {"repo": "$REPO", "file": "src/A.java", "line": 3, "severity": "Major",
   "category": "naming", "issue": "first", "fix": "Must: x."},
  {"repo": "$REPO", "file": "src/B.java", "line": 7, "severity": "Minor",
   "category": "structure", "issue": "second", "fix": "Must: y.",
   "best_practice": "java/modern-java.md"}
]
EOF
out=$(bash "$SCRIPT_DIR/review-add-item.sh" "$TICKET" --from "$scratch/items.json")
check "prints one new id per item, in order" "$(tr '\n' ' ' <<< "$out")" "1 2 "
check "both items written" "$(jq '.items | length' "$ITEMS")" "2"
check "best_practice field becomes --best-practice" "$(jq -r '.items[1].best_practice' "$ITEMS")" "java/modern-java.md"

cat > "$scratch/bad-items.json" <<EOF
[
  {"repo": "$REPO", "file": "src/C.java", "line": 1, "severity": "Major",
   "category": "naming", "issue": "fine", "fix": "Must: z."},
  {"repo": "$REPO", "file": "src/D.java", "line": 1, "severity": "Huge",
   "category": "naming", "issue": "bad severity", "fix": "Must: z."}
]
EOF
bash "$SCRIPT_DIR/review-add-item.sh" "$TICKET" --from "$scratch/bad-items.json" > /dev/null 2>&1
check "a bad item fails the batch" "$?" "1"
check "a bad item rolls back the good one before it" "$(jq '.items | length' "$ITEMS")" "2"

other_items="$REVIEW_DIR/items.trade-imports-new-repo.json"
cat > "$scratch/new-repo.json" <<EOF
[
  {"repo": "trade-imports-new-repo", "file": "a.js", "line": 1, "severity": "Major",
   "category": "naming", "issue": "fine", "fix": "Must: z."},
  {"repo": "trade-imports-new-repo", "file": "b.js", "line": 1, "severity": "Major",
   "category": "not-a-category", "issue": "bad", "fix": "Must: z."}
]
EOF
bash "$SCRIPT_DIR/review-add-item.sh" "$TICKET" --from "$scratch/new-repo.json" > /dev/null 2>&1
check "an items file the failed batch created is removed" "$([[ -e "$other_items" ]] && echo present || echo absent)" "absent"

echo '[]' > "$scratch/empty.json"
bash "$SCRIPT_DIR/review-add-item.sh" "$TICKET" --from "$scratch/empty.json" > /dev/null 2>&1
check "an empty list is refused" "$?" "1"

echo "review-mark.sh --from"

cat > "$scratch/marks.json" <<EOF
[
  {"repo": "$REPO", "item": 1, "disposition": "Fix"},
  {"repo": "$REPO", "item": 2, "disposition": "Merged", "note": "merged into #1"}
]
EOF
bash "$SCRIPT_DIR/review-mark.sh" "$TICKET" --from "$scratch/marks.json" > /dev/null
check "first mark applied" "$(jq -r '.items[0].disposition + "/" + .items[0].status' "$ITEMS")" "Fix/Not Done"
check "second mark applied with its note" "$(jq -r '.items[1].disposition + "/" + .items[1].notes' "$ITEMS")" "Merged/merged into #1"

cat > "$scratch/bad-marks.json" <<EOF
[
  {"repo": "$REPO", "item": 1, "disposition": "Discuss"},
  {"repo": "$REPO", "item": 2, "disposition": "Merged"}
]
EOF
bash "$SCRIPT_DIR/review-mark.sh" "$TICKET" --from "$scratch/bad-marks.json" > /dev/null 2>&1
check "Merged without a note fails the batch" "$?" "1"
check "the failed batch leaves the first mark unchanged" "$(jq -r '.items[0].disposition' "$ITEMS")" "Fix"

echo "file-review-write.sh"

placeholder "src/A.java"
placeholder "src/B.java"
placeholder "src/Other.java"
cat > "$scratch/group.json" <<EOF
[
  {"repo": "$REPO", "file": "src/A.java", "verdict": "NEEDS_ATTENTION", "reason": "one Major",
   "findings": [
     {"line": 10, "severity": "Major", "category": "structure", "issue": "two homes", "fix": "Must: one."},
     {"line": 12, "severity": "Minor", "category": "comments", "issue": "stale", "fix": "Must: true.",
      "best_practice": "java/modern-java.md"}
   ]},
  {"repo": "$REPO", "file": "src/B.java", "verdict": "SAFE", "reason": "nothing found", "findings": []}
]
EOF
out=$(bash "$SCRIPT_DIR/file-review-write.sh" "$TICKET" --from "$scratch/group.json")
check "summary line per file" "$(wc -l <<< "$out" | tr -d ' ')" "2"
check "A has both findings" "$(jq '.todos | length' "$(review_json src/A.java)")" "2"
check "A has its verdict" "$(jq -r '.verdict' "$(review_json src/A.java)")" "NEEDS_ATTENTION"
check "A's second finding keeps its guide" "$(jq -r '.todos[1].best_practice' "$(review_json src/A.java)")" "java/modern-java.md"
check "B is SAFE with no findings" "$(jq -r '.verdict + "/" + (.todos | length | tostring)' "$(review_json src/B.java)")" "SAFE/0"
check "reviewed_at is stamped" "$(jq -r '.reviewed_at != null' "$(review_json src/B.java)")" "true"

before_other=$(cat "$(review_json src/Other.java)")
placeholder "src/C.java"
placeholder "src/D.java"
cat > "$scratch/bad-group.json" <<EOF
[
  {"repo": "$REPO", "file": "src/C.java", "verdict": "SAFE", "reason": "fine", "findings": []},
  {"repo": "$REPO", "file": "src/D.java", "verdict": "RISKY", "reason": "bad",
   "findings": [{"line": 1, "severity": "Critical", "category": "nonsense", "issue": "x", "fix": "Must: y."}]}
]
EOF
bash "$SCRIPT_DIR/file-review-write.sh" "$TICKET" --from "$scratch/bad-group.json" > /dev/null 2>&1
check "a bad finding fails the group" "$?" "1"
check "the earlier file's verdict is rolled back" "$(jq -r '.verdict' "$(review_json src/C.java)")" "null"
check "the bad file has no findings" "$(jq '.todos | length' "$(review_json src/D.java)")" "0"
check "a file outside the group is untouched" "$(cat "$(review_json src/Other.java)")" "$before_other"

cat > "$scratch/missing.json" <<EOF
[{"repo": "$REPO", "file": "src/NoPlaceholder.java", "verdict": "SAFE", "reason": "x", "findings": []}]
EOF
bash "$SCRIPT_DIR/file-review-write.sh" "$TICKET" --from "$scratch/missing.json" > /dev/null 2>&1
check "a file with no placeholder is refused" "$?" "1"
check "and no placeholder is created for it" \
    "$([[ -e "$(review_json src/NoPlaceholder.java)" ]] && echo present || echo absent)" "absent"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "all checks passed"
