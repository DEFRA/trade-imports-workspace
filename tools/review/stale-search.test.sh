#!/bin/bash
# Behaviour test for stale-search.sh.
#
# Usage: bash tools/review/stale-search.test.sh
#
# Builds a throwaway review workarea with one pinned repo clone and a
# throwaway workspace docs checkout, then checks what each search finds,
# marks and leaves out. Exits 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

ID="EUDPA-99995"
REPO="trade-imports-address-book"
REVIEW_DIR="$WORKSPACE/workareas/reviews/$ID"
DOCS_ROOT=$(mktemp -d)

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
trap 'rm -rf "$REVIEW_DIR" "$DOCS_ROOT"' EXIT

commit_all() {
    git -C "$1" add -A > /dev/null
    git -C "$1" -c user.name=test -c user.email=test@example.com commit -q -m "fixture"
}

clone="$REVIEW_DIR/repos/$REPO"
mkdir -p "$clone/src/main/java/app" "$clone/docs"
git -C "$clone" init -q
printf 'class OldPublisher {}\n' > "$clone/src/main/java/app/OldPublisher.java"
printf '# Metrics\n\nOldPublisher sends the metrics.\n' > "$clone/docs/metrics.md"
printf '{"OldPublisher": 1}\n' > "$clone/package-lock.json"
for n in 1 2 3; do
    printf 'Many %s\n' "$n" > "$clone/docs/many-$n.md"
done
commit_all "$clone"

mkdir -p "$DOCS_ROOT/docs/best-practices/java" "$DOCS_ROOT/docs/other"
git -C "$DOCS_ROOT" init -q
printf 'Use OldPublisher.\n' > "$DOCS_ROOT/docs/best-practices/java/spring-boot.md"
printf 'OldPublisher outside the searched docs.\n' > "$DOCS_ROOT/docs/other/notes.md"
commit_all "$DOCS_ROOT"

jq -n --arg repo "$REPO" '{local: null, prs: [{repo: $repo, commit: "abc123"}]}' > "$REVIEW_DIR/.review-meta.json"
bash "$SCRIPT_DIR/file-review-init.sh" "$ID" --repo "$REPO" --file "src/main/java/app/OldPublisher.java" \
    --commit abc123 --pr 21 --mode FRESH > /dev/null

search() {
    bash "$SCRIPT_DIR/stale-search.sh" "$ID" --docs-root "$DOCS_ROOT" "$@"
}

echo "stale-search.sh"
out=$(search OldPublisher)
check "a search exits cleanly" "$?" "0"
check "a hit in a repo doc is listed with its line" \
    "$(grep -c "^- $REPO \`docs/metrics.md:3\` OldPublisher sends the metrics.$" <<< "$out")" "1"
check "a hit in a file the review changed is marked" \
    "$(grep -c "^- $REPO \`src/main/java/app/OldPublisher.java:1\` \[changed\]" <<< "$out")" "1"
check "a lockfile is not searched" "$(grep -c 'package-lock.json' <<< "$out")" "0"
check "the workspace's best-practice guides are searched" \
    "$(grep -c '^- workspace `docs/best-practices/java/spring-boot.md:1` Use OldPublisher.$' <<< "$out")" "1"
check "other workspace docs are not" "$(grep -c 'docs/other/notes.md' <<< "$out")" "0"
check "the places searched are listed" \
    "$(grep -c "^- $REPO: every tracked file but lockfiles$" <<< "$out")" "1"

out=$(search "Not anywhere at all")
check "a term with no hits says so" "$(grep -c '^No hits.$' <<< "$out")" "1"

out=$(search "Many" --max-hits 2)
check "--max-hits caps the hits shown" "$(grep -c '^- .*docs/many-' <<< "$out")" "2"
check "and counts the rest" "$(grep -c '^- … and 1 more hits not shown$' <<< "$out")" "1"

out=$(search OldPublisher Many)
check "several terms are searched in one call" "$(grep -c '^## `' <<< "$out")" "2"

jq --arg repo "$REPO" '.prs += [{repo: "trade-imports-workspace", commit: "def456"}]' \
    "$REVIEW_DIR/.review-meta.json" > "$REVIEW_DIR/meta.tmp" && mv "$REVIEW_DIR/meta.tmp" "$REVIEW_DIR/.review-meta.json"
mkdir -p "$REVIEW_DIR/repos/trade-imports-workspace"
git -C "$REVIEW_DIR/repos/trade-imports-workspace" init -q
printf 'OldPublisher in the pinned workspace clone.\n' > "$REVIEW_DIR/repos/trade-imports-workspace/CLAUDE.md"
commit_all "$REVIEW_DIR/repos/trade-imports-workspace"
out=$(search OldPublisher)
check "a review of the workspace repo searches its pinned clone" \
    "$(grep -c '^- trade-imports-workspace `CLAUDE.md:1`' <<< "$out")" "1"
check "and not the docs checkout" "$(grep -c '^- workspace ' <<< "$out")" "0"

bash "$SCRIPT_DIR/stale-search.sh" "$ID" > /dev/null 2>&1
check "a search with no term is refused" "$?" "1"
bash "$SCRIPT_DIR/stale-search.sh" "$ID" OldPublisher --max-hits 0 > /dev/null 2>&1
check "--max-hits 0 is refused" "$?" "1"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "all checks passed"
