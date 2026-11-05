#!/bin/bash
# Behaviour test for plan-groups.sh and write-briefs.sh.
#
# Usage: bash tools/review/review-groups.test.sh
#
# Builds a throwaway review workarea with files of several types across two
# repos, then checks how files are routed, split and given guides, and what
# each brief holds. Exits 0 when every check passes, 1 otherwise.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$HOME/git/defra/trade-imports-workspace"

ID="EUDPA-99997"
JAVA_REPO="trade-imports-address-book"
TESTS_REPO="trade-imports-ins-tests"
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
mkdir -p "$REVIEW_DIR/.diffs"

echo '{"id": "EUDPA-99997", "prs": []}' > "$REVIEW_DIR/.review-meta.json"
printf '# EUDPA-99997\n\n## Acceptance criteria\n\n- AC1: the thing works\n' > "$REVIEW_DIR/ticket.md"

add_file() {
    local repo="$1" file="$2" body="$3"
    mkdir -p "$(dirname "$REVIEW_DIR/repos/$repo/$file")"
    printf '%s\n' "$body" > "$REVIEW_DIR/repos/$repo/$file"
    bash "$SCRIPT_DIR/file-review-init.sh" "$ID" --repo "$repo" --file "$file" \
        --commit abc123 --pr 21 --mode FRESH > /dev/null
    printf 'diff --git a/%s b/%s\n+changed line in %s\n' "$file" "$file" "$file" >> "$REVIEW_DIR/.diffs/$repo.diff"
}

for name in Kilo Alpha Juliet Bravo India Charlie Hotel Delta Golf Echo Foxtrot; do
    body="class $name {}"
    [[ "$name" == "Alpha" ]] && body="import com.mongodb.client.MongoClient; class Alpha {}"
    add_file "$JAVA_REPO" "src/main/java/app/$name.java" "$body"
done
add_file "$JAVA_REPO" "src/test/java/app/AlphaTest.java" "class AlphaTest {}"
add_file "$JAVA_REPO" "src/test/java/app/NOTES.md" "notes"
add_file "$JAVA_REPO" "package-lock.json" "{}"
add_file "$JAVA_REPO" ".github/workflows/ci.yml" "on: push"
add_file "$JAVA_REPO" "page-objects/home.ts" "export const home = 1"
add_file "$TESTS_REPO" "page-objects/home.ts" "export const home = 1"
add_file "$JAVA_REPO" "src/main/java/app/Reviewed.java" "class Reviewed {}"
bash "$SCRIPT_DIR/file-review-set-verdict.sh" "$ID" --repo "$JAVA_REPO" \
    --file "src/main/java/app/Reviewed.java" --verdict SAFE --reason "done" > /dev/null

group_files() {
    jq -r --arg id "$1" '.groups[] | select(.id == $id) | .files | map(split("/") | last) | join(" ")' "$REVIEW_DIR/groups.json"
}

group_of() {
    jq -r --arg repo "$1" --arg file "$2" \
        '.groups[] | select(.repo == $repo and (.files | index($file))) | .type' "$REVIEW_DIR/groups.json"
}

echo "plan-groups.sh"
bash "$SCRIPT_DIR/plan-groups.sh" "$ID" > /dev/null
check "plan exits cleanly" "$?" "0"

check "11 Java source files split 6 and 5, not 10 and 1" \
    "$(jq -r '[.groups[] | select(.type == "java-source") | .files | length] | join(",")' "$REVIEW_DIR/groups.json")" "6,5"
check "first group holds the first six by path" \
    "$(group_files "$JAVA_REPO--java-source--1")" "Alpha.java Bravo.java Charlie.java Delta.java Echo.java Foxtrot.java"
check "second group holds the rest" \
    "$(group_files "$JAVA_REPO--java-source--2")" "Golf.java Hotel.java India.java Juliet.java Kilo.java"
check "a Java test goes to java-tests" "$(group_of "$JAVA_REPO" src/test/java/app/AlphaTest.java)" "java-tests"
check "the first matching route wins: a .md under src/test is skills-docs" \
    "$(group_of "$JAVA_REPO" src/test/java/app/NOTES.md)" "skills-docs"
check "a lockfile is skipped, not grouped" \
    "$(jq -r '.skipped | map(.file + ":" + .type) | join(",")' "$REVIEW_DIR/groups.json")" "package-lock.json:lockfile"
check "a repo-scoped route applies in its repo" "$(group_of "$TESTS_REPO" page-objects/home.ts)" "e2e"
check "and not in another repo" "$(group_of "$JAVA_REPO" page-objects/home.ts)" "node-source"
check "a file with a verdict is left out" \
    "$(jq -r '[.groups[].files[]] | index("src/main/java/app/Reviewed.java") // "absent"' "$REVIEW_DIR/groups.json")" "absent"
check "a group carries its agent" \
    "$(jq -r '.groups[] | select(.type == "java-tests") | .agent' "$REVIEW_DIR/groups.json")" "review-java-tests"

mongo_guide="docs/best-practices/java/spring-data-mongodb.md"
check "a content guide is added to the group whose file matches" \
    "$(jq -r --arg g "$mongo_guide" '.groups[] | select(.id | endswith("java-source--1")) | .guides | index($g) != null' "$REVIEW_DIR/groups.json")" "true"
check "and not to a group whose files do not" \
    "$(jq -r --arg g "$mongo_guide" '.groups[] | select(.id | endswith("java-source--2")) | .guides | index($g) != null' "$REVIEW_DIR/groups.json")" "false"
check "a file under a dot folder is planned" "$(group_of "$JAVA_REPO" .github/workflows/ci.yml)" "infra"
check "a path guide is added for a workflow file" \
    "$(jq -r '.groups[] | select(.type == "infra") | .guides | join(",")' "$REVIEW_DIR/groups.json")" "docs/best-practices/github-actions.md"

bash "$SCRIPT_DIR/plan-groups.sh" "$ID" --max 4 > /dev/null
check "--max 4 splits 11 files 4, 4 and 3" \
    "$(jq -r '[.groups[] | select(.type == "java-source") | .files | length] | join(",")' "$REVIEW_DIR/groups.json")" "4,4,3"

bash "$SCRIPT_DIR/plan-groups.sh" "$ID" --max 0 > /dev/null 2>&1
check "--max 0 is refused" "$?" "1"

echo "write-briefs.sh"
bash "$SCRIPT_DIR/plan-groups.sh" "$ID" > /dev/null
bash "$SCRIPT_DIR/write-briefs.sh" "$ID" --max-file-bytes 30 > /dev/null
check "brief writing exits cleanly" "$?" "0"

brief="$REVIEW_DIR/briefs/$JAVA_REPO--java-source--1.md"
check "one brief per group" \
    "$(find "$REVIEW_DIR/briefs" -name '*.md' | wc -l | tr -d ' ')" "$(jq '.groups | length' "$REVIEW_DIR/groups.json")"
check "the brief lists a section for each of its files" "$(grep -c '^## File: ' "$brief")" "6"
check "the brief carries each file's diff" "$(grep -c '^+changed line in src/main/java/app/Bravo.java$' "$brief")" "1"
check "the brief carries the file at the reviewed commit" "$(grep -c '^class Bravo {}$' "$brief")" "1"
check "a file over the size cap is pointed at, not copied" "$(grep -c 'Too large to copy here' "$brief")" "1"
check "the brief carries the ticket" "$(grep -c 'AC1: the thing works' "$brief")" "1"
check "the brief carries the group's content guide" "$(grep -c "### Source: \`$mongo_guide\`" "$brief")" "1"
check "shared parts come before the group's own" \
    "$(grep -n -E '^## (House rules|Ticket|Guides|Your group)$' "$brief" | cut -d: -f2 | tr '\n' '|')" \
    "## House rules|## Ticket|## Guides|## Your group|"

rm "$REVIEW_DIR/groups.json"
bash "$SCRIPT_DIR/write-briefs.sh" "$ID" > /dev/null 2>&1
check "briefs refuse to run without groups.json" "$?" "1"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "all checks passed"
