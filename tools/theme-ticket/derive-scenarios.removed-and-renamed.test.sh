#!/bin/bash
# Behaviour test for derive-scenarios.sh on scenarios a later commit removed or renamed.
#
# Usage: bash tools/theme-ticket/derive-scenarios.removed-and-renamed.test.sh
#
# Builds a throwaway workspace git repo in which a theme commit adds three
# scenarios and a later commit removes one and renames another, then checks that
# the removed scenario is warned about and not counted, and that the renamed one
# is counted under its current heading and steps.
# Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DERIVE="$SCRIPT_DIR/derive-scenarios.sh"
SPEC="openspec/specs/live-animals/journey-pages/arrival-details/spec.md"

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
    printf '#### Scenario: %s\n**ID**: %s\n- **GIVEN** a user\n- **THEN** %s\n\n' "$1" "$2" "$1"
}

write_spec() {
    {
        printf '# Arrival details\n\n## Requirements\n\n### Requirement: Arrival\n\n'
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

git -C "$WORKSPACE" init -q
mkdir -p "$WORKSPACE/workareas/release/themes/arrival" "$(dirname "$WORKSPACE/$SPEC")"
cat > "$WORKSPACE/workareas/release/themes/arrival/backlog.json" <<'EOF'
{ "increments": [{ "id": "inc-1", "title": "Arrival page", "status": "done", "repos": ["frontend"] }] }
EOF
cat > "$WORKSPACE/workareas/release/sources.json" <<'EOF'
{ "repos": { "frontend": "repos/trade-imports-animals-frontend" } }
EOF
write_spec "Kept as written" SCN-A "Renamed later" SCN-B "Removed later" SCN-C
commit "feat(release-arrival): Arrival page"
write_spec "Kept as written" SCN-A "Now reads this way" SCN-B
commit "docs(OTHER-1): reword arrival"

derived="$("$DERIVE" --workspace "$WORKSPACE" --workarea release --theme arrival)"
theme_sha="$(jq -r '.commits[0].sha' <<< "$derived")"

echo "A scenario added then removed is warned about and not counted"
check "the theme total leaves it out" "$(jq '.totals.scenarios' <<< "$derived")" "2"
check "the domain count leaves it out" "$(jq '.domains.animals.scenarioCount' <<< "$derived")" "2"
check "the warning names it" "$(jq -r '.warnings | join("\n")' <<< "$derived")" \
    "scenario SCN-C \"Removed later\" was added to live-animals/journey-pages/arrival-details/spec.md by $theme_sha then removed; not counted"

echo "A scenario added then renamed counts under its current heading and steps"
check "the scenarios read as they do now" \
    "$(jq -c '[.domains.animals.scenarios[] | {heading, id, missing, steps}]' <<< "$derived")" \
    '[{"heading":"Kept as written","id":"SCN-A","missing":false,"steps":[{"keyword":"GIVEN","text":"a user"},{"keyword":"THEN","text":"Kept as written"}]},{"heading":"Now reads this way","id":"SCN-B","missing":false,"steps":[{"keyword":"GIVEN","text":"a user"},{"keyword":"THEN","text":"Now reads this way"}]}]'

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
