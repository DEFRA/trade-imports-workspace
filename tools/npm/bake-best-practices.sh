#!/bin/bash
# Concatenate dependency-relevant best-practice docs for one repo into
# workareas/npm-upgrades/{run-id}/{repo}/best-practices.md.
#
# Only practices that influence how an upgrade is classified or
# implemented are included; pure code-style / observability guides are
# skipped (PACKAGE_PLANNER doesn't need them).
#
# Usage: bake-best-practices.sh --run-id TICKET --repo REPO

set -e

RUN_ID=""
REPO=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        -h|--help) echo "Usage: $0 --run-id TICKET --repo REPO" >&2; exit 1 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "--run-id required" >&2; exit 1; }
[[ -z "$REPO" ]] && { echo "--repo required" >&2; exit 1; }

OUT_DIR="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/best-practices.md"
BP_BASE="$HOME/git/defra/trade-imports-workspace/docs/best-practices"

# Curate the relevant subset. Hapi + govuk-frontend influence upgrade
# risk (framework alignment); testing/playwright influence whether an
# upgrade can be auto-verified.
RELEVANT_PATHS=(
    "node/hapi.md"
    "node/govuk-frontend.md"
    "node/testing"
    "node/playwright.md"
)

TMP="$OUT.tmp"
{
    echo "# Dependency-relevant best practices for $REPO"
    echo
    echo "Concatenated at prebake time. PACKAGE_PLANNER consults these"
    echo "when classifying risk for framework-adjacent packages."
    echo
    for rel in "${RELEVANT_PATHS[@]}"; do
        full="$BP_BASE/$rel"
        if [[ -d "$full" ]]; then
            while IFS= read -r f; do
                echo
                echo "---"
                echo
                echo "## Source: \`docs/best-practices/${rel}/$(basename "$f")\`"
                echo
                cat "$f"
            done < <(find "$full" -maxdepth 1 -name '*.md' | sort)
        elif [[ -f "$full" ]]; then
            echo
            echo "---"
            echo
            echo "## Source: \`docs/best-practices/$rel\`"
            echo
            cat "$full"
        fi
    done
} > "$TMP"
mv "$TMP" "$OUT"
echo "$OUT"
