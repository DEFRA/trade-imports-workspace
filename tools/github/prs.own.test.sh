#!/bin/bash
# Behaviour test for prs.sh --own.
#
# Usage: bash tools/github/prs.own.test.sh
#
# Puts a fake `gh` first on PATH that answers the search with the ticket's
# own PRs plus PRs for other tickets that only mention it, then checks that
# --own keeps the own PRs, names each one left out on stderr, and that
# without --own every search hit is still returned.
# Exits 0 when every check passes, 1 if any fails.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRS="$SCRIPT_DIR/prs.sh"

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

fake_bin=$(mktemp -d)
trap 'rm -rf "$fake_bin"' EXIT

cat > "$fake_bin/gh" << 'EOF'
#!/bin/bash
if [[ "$1 $2" == "search prs" ]]; then
    cat << 'JSON'
[
  {"number":21,"title":"feat(EUDPA-674): publish metrics","repository":{"name":"trade-imports-address-book","nameWithOwner":"DEFRA/trade-imports-address-book"},"url":"u21","state":"open","createdAt":"t"},
  {"number":199,"title":"service-observability builds metrics one way","repository":{"name":"trade-imports-workspace","nameWithOwner":"DEFRA/trade-imports-workspace"},"url":"u199","state":"open","createdAt":"t"},
  {"number":300,"title":"EUDPA-368: Map missing frontend fields","repository":{"name":"trade-imports-animals-frontend","nameWithOwner":"DEFRA/trade-imports-animals-frontend"},"url":"u300","state":"merged","createdAt":"t"},
  {"number":43,"title":"EUDPA-6740: npm security sweep","repository":{"name":"trade-imports-ins-frontend","nameWithOwner":"DEFRA/trade-imports-ins-frontend"},"url":"u43","state":"merged","createdAt":"t"}
]
JSON
    exit 0
fi
if [[ "$1 $2" == "pr view" ]]; then
    case "$3" in
        21)  echo "feat/EUDPA-674-observability" ;;
        199) echo "feat/eudpa-674-observability" ;;
        300) echo "feature/EUDPA-368-notification-field-mapping" ;;
        43)  echo "chore/EUDPA-6740-npm-security-sweep" ;;
    esac
    exit 0
fi
exit 1
EOF
chmod +x "$fake_bin/gh"

echo "prs.sh --own"
stderr_file="$fake_bin/stderr"
own=$(PATH="$fake_bin:$PATH" bash "$PRS" EUDPA-674 json --own 2> "$stderr_file")
check "keeps the PR with the key in its title and branch" \
    "$(jq -r '[.[].number] | sort | map(tostring) | join(",")' <<< "$own")" "21,199"
check "names the other ticket's PR on stderr" \
    "$(grep -c 'Left out trade-imports-animals-frontend#300' "$stderr_file")" "1"
check "treats EUDPA-6740 as another ticket, not EUDPA-674" \
    "$(grep -c 'Left out trade-imports-ins-frontend#43' "$stderr_file")" "1"

echo "prs.sh without --own"
all=$(PATH="$fake_bin:$PATH" bash "$PRS" EUDPA-674 json 2> /dev/null)
check "returns every search hit" "$(jq 'length' <<< "$all")" "4"

if [[ "$failures" -gt 0 ]]; then
    echo "$failures check(s) failed"
    exit 1
fi
echo "All checks passed"
