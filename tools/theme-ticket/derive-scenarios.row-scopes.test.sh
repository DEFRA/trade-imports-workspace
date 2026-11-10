#!/bin/bash
# Behaviour test for derive-scenarios.sh on a theme delivered as several tickets.
#
# Usage: bash tools/theme-ticket/derive-scenarios.row-scopes.test.sh
#
# Builds a throwaway workspace git repo in which a theme's rows commit scoped by
# their Jira keys, not by the theme, then checks that derive-scenarios refuses
# the theme while tickets.json lists no row scopes for it, counts every row's
# scenarios once tickets.json lists those keys, and still counts a scenario
# once after a later row commit moves it.
# Exits 0 when every check passes, 1 when any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DERIVE="$SCRIPT_DIR/derive-scenarios.sh"
SPEC="openspec/specs/ins/address-book/spec.md"
TICKETS="workareas/release/tickets/tickets.json"

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
        printf '# Address book\n\n## Requirements\n\n### Requirement: Addresses\n\n'
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
mkdir -p "$WORKSPACE/workareas/release/themes/address-book" "$WORKSPACE/workareas/release/tickets" "$(dirname "$WORKSPACE/$SPEC")"
cat > "$WORKSPACE/workareas/release/themes/address-book/backlog.json" <<'EOF'
{ "increments": [{ "id": "inc-1", "title": "Address list", "status": "done", "repos": ["insfrontend"] }] }
EOF
cat > "$WORKSPACE/workareas/release/sources.json" <<'EOF'
{ "repos": { "insfrontend": "repos/trade-imports-ins-frontend" } }
EOF
write_spec "The list shows addresses" SCN-A
commit "chore(KEY-1): spec the address list"
write_spec "The list shows addresses" SCN-A "An address can be deleted" SCN-B
commit "chore(KEY-2): spec deleting an address"

echo "A theme whose rows commit only by Jira key is refused without row scopes"
"$DERIVE" --workspace "$WORKSPACE" --workarea release --theme address-book > /dev/null 2>&1
check "derive exits non-zero" "$?" "1"

echo "With its keys listed as row scopes, every row's scenarios are counted"
cat > "$WORKSPACE/$TICKETS" <<'EOF'
{ "themes": {}, "rowScopes": { "address-book": ["KEY-1", "KEY-2"] } }
EOF
derived="$("$DERIVE" --workspace "$WORKSPACE" --workarea release --theme address-book)"
check "both row commits are read" "$(jq '.commits | length' <<< "$derived")" "2"
check "the theme total counts both scenarios" "$(jq '.totals.scenarios' <<< "$derived")" "2"
check "the scenarios fall to the front door" \
    "$(jq -c '[.domains.ins.scenarios[].id] | sort' <<< "$derived")" '["SCN-A","SCN-B"]'

echo "A scenario a later row commit moves is still counted once"
write_spec "An address can be deleted" SCN-B "The list shows addresses" SCN-A
commit "chore(KEY-2): order the address scenarios"
derived="$("$DERIVE" --workspace "$WORKSPACE" --workarea release --theme address-book)"
check "the theme total stays at two" "$(jq '.totals.scenarios' <<< "$derived")" "2"
check "no scenario is listed twice" \
    "$(jq '[.domains.ins.scenarios[].id] | group_by(.) | map(select(length > 1)) | length' <<< "$derived")" "0"

if [[ $failures -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
