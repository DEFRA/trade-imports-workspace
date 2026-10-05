#!/bin/bash
# Drop allowlist entries from a run's allowlist.{repo}.json state file,
# after a rollback has taken them back out of audit-ci.jsonc. The
# scripted upgrades do this themselves; this is for a worker (the
# MANUAL_UPGRADE_IMPLEMENTOR) that rolls back by hand.
#
# Usage:
#   audit-allowlist-forget.sh --run-id TICKET --repo REPO --ghsa GHSA [--ghsa GHSA ...]
#
# It only edits the workarea state file. It does not touch
# audit-ci.jsonc: roll that back with git (`git checkout HEAD --`).
#
# Exit codes:
#   0  done (an entry that was not there is not an error)
#   2  usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=audit-lib.sh
source "$SCRIPT_DIR/audit-lib.sh"

RUN_ID=""
REPO=""
GHSAS=()

usage() {
    echo "Usage: $0 --run-id TICKET --repo REPO --ghsa GHSA [--ghsa GHSA ...]" >&2
    exit 2
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --ghsa) GHSAS+=("$2"); shift 2 ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" || -z "$REPO" || "${#GHSAS[@]}" -eq 0 ]] && usage
for ghsa in "${GHSAS[@]}"; do
    [[ "$ghsa" =~ $AUDIT_GHSA_PATTERN ]] || { echo "Not a GHSA id: $ghsa" >&2; exit 2; }
done

audit_forget_entries "$RUN_ID" "$REPO" "${GHSAS[@]}"
echo "Dropped ${GHSAS[*]} from $(audit_state_dir "$RUN_ID" "$REPO")/allowlist.${REPO}.json (if present)." >&2
