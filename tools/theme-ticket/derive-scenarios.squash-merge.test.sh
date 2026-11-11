#!/bin/bash
# Behaviour test for derive-scenarios.sh on an unthemed backlog squash-merged to main.
#
# Usage: bash tools/theme-ticket/derive-scenarios.squash-merge.test.sh
#
# Builds a throwaway workspace git repo with a backlog whose rows carry no theme,
# whose row commits sit on a feature branch, and whose main holds them as one
# squashed commit. Checks that derive-scenarios refuses main alone, reads every
# row from the unthemed backlog, reads the row commits from --commits-from and
# links each spec file to --branch.
# Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DERIVE="$SCRIPT_DIR/derive-scenarios.sh"
SPEC="openspec/specs/live-animals/journey-flow/spec.md"

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

WORKSPACE="$(mktemp -d)"
cleanup() { rm -rf "$WORKSPACE"; }
trap cleanup EXIT

scenario() {
    printf '#### Scenario: %s\n**ID**: %s\n- **GIVEN** a trader\n- **THEN** %s\n\n' "$1" "$2" "$1"
}

write_spec() {
    {
        printf '# Journey flow\n\n## Requirements\n\n### Requirement: Page order\n\n'
        while [[ $# -gt 0 ]]; do
            scenario "$1" "$2"
            shift 2
        done
    } > "$WORKSPACE/$SPEC"
}

commit() {
    git -C "$WORKSPACE" add -A
    git -C "$WORKSPACE" -c user.name=Test -c user.email=test@example.com commit -q -m "$1"
}

git -C "$WORKSPACE" init -q -b main
mkdir -p "$WORKSPACE/workareas/programme" "$(dirname "$WORKSPACE/$SPEC")"
cat > "$WORKSPACE/workareas/programme/backlog.json" <<'EOF'
{ "increments": [
  { "id": "inc-1", "title": "Page order", "status": "done", "repos": ["frontend"] },
  { "id": "inc-2", "title": "Back", "status": "done", "repos": ["frontend"] }
] }
EOF
cat > "$WORKSPACE/workareas/programme/sources.json" <<'EOF'
{ "repos": { "frontend": "repos/trade-imports-animals-frontend" } }
EOF
write_spec "The journey has one page order" SCN-A
commit "chore: start"

git -C "$WORKSPACE" checkout -q -b feat/KEY-1-flow
write_spec "The journey has one page order" SCN-A "Save and continue goes to the next page" SCN-B
commit "feat(programme-flow): Save and continue goes to the next page"
write_spec "The journey has one page order" SCN-A "Save and continue goes to the next page" SCN-B "Back goes to where the trader came from" SCN-C
commit "feat(programme-flow): Back goes to where the trader came from"

git -C "$WORKSPACE" checkout -q main
git -C "$WORKSPACE" merge -q --squash feat/KEY-1-flow
commit "KEY-1: the flow (#1)"

echo "Main alone holds no row commit after a squash merge"
"$DERIVE" --workspace "$WORKSPACE" --workarea programme --theme programme-flow --branch main > /dev/null 2>&1
check "derive exits non-zero" "$?" "1"

echo "With the row commits read from the feature branch, the links point at main"
derived="$("$DERIVE" --workspace "$WORKSPACE" --workarea programme --theme programme-flow --branch main --commits-from feat/KEY-1-flow)"
check "every row of the unthemed backlog is read" "$(jq '.rows | length' <<< "$derived")" "2"
check "both row commits are read" "$(jq '.commits | length' <<< "$derived")" "2"
check "the theme total counts both added scenarios" "$(jq '.totals.scenarios' <<< "$derived")" "2"
check "the spec link points at main" \
    "$(jq -r '.domains.animals.files[0].url' <<< "$derived")" \
    "https://github.com/DEFRA/trade-imports-workspace/blob/main/$SPEC"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
