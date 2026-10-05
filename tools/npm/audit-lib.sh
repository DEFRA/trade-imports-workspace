#!/bin/bash
# Shared helpers for the audit-ci tooling. Sourced, never run:
#
#   source "$SCRIPT_DIR/audit-lib.sh"
#
# Used by audit-baseline.sh and audit-allowlist-add.sh. Each repo keeps
# its allowlist in a comment-free audit-ci.jsonc at its root, so plain
# jq can read it here and in the repo's CI "Check audit allowlist" step.

AUDIT_WORKSPACE="$HOME/git/defra/trade-imports-workspace"
AUDIT_CONFIG_FILE="audit-ci.jsonc"
AUDIT_GHSA_PATTERN='^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$'

# Per-ticket, per-repo state directory under workareas/.
audit_state_dir() {
    local run_id="$1" repo="$2"
    echo "$AUDIT_WORKSPACE/workareas/npm-upgrades/$run_id/$repo"
}

# The repo checkout, de-symlinked so npm never rewrites the lockfile
# relative to a symlinked workspace path. An explicit path (from
# --repo-path) wins over repos/<repo>.
audit_resolve_repo_path() {
    local repo="$1" override="${2:-}"
    local path="${override:-$AUDIT_WORKSPACE/repos/$repo}"
    if [[ ! -d "$path" ]]; then
        echo "Repo not found: $path" >&2
        return 1
    fi
    (cd "$path" && pwd -P)
}

# Fail with a clear message unless the repo has a jq-readable
# audit-ci.jsonc. A comment in the file is the usual cause.
audit_require_config() {
    local repo_path="$1"
    local config="$repo_path/$AUDIT_CONFIG_FILE"
    if [[ ! -f "$config" ]]; then
        echo "No $AUDIT_CONFIG_FILE in $repo_path. Adopt audit-ci first." >&2
        return 1
    fi
    if ! jq -e '.allowlist | type == "array"' "$config" >/dev/null 2>&1; then
        echo "$config is not comment-free JSON with an allowlist array. Remove any comments so jq can read it." >&2
        return 1
    fi
}

audit_today() {
    date -u +%F
}

# A UTC date N days or N months from today, on BSD (macOS) or GNU date.
#   audit_date_from_today 90 days
#   audit_date_from_today 3 months
audit_date_from_today() {
    local n="$1" unit="$2" flag
    if date -u -v+1d +%F >/dev/null 2>&1; then
        case "$unit" in
            days) flag="d" ;;
            months) flag="m" ;;
            *) echo "Unknown date unit: $unit" >&2; return 1 ;;
        esac
        date -u -v+"${n}${flag}" +%F
    else
        date -u -d "+${n} ${unit}" +%F
    fi
}

# jq program: npm audit v2 report -> one row per GHSA with the
# vulnerable package, its highest severity and every vulnerable range.
# shellcheck disable=SC2016
AUDIT_JQ_ADVISORIES='
  def rank: {"info": 0, "low": 1, "moderate": 2, "high": 3, "critical": 4}[.] // 0;
  [.vulnerabilities // {} | .[] | .via[] | objects
   | {ghsa: (.url | split("/") | last), package: .name, severity, range, title}]
  | group_by(.ghsa)
  | map({
      ghsa: .[0].ghsa,
      package: .[0].package,
      severity: (map(.severity) | max_by(rank)),
      severity_rank: (map(.severity | rank) | max),
      ranges: (map(.range) | unique),
      title: .[0].title
    })
'

# jq program: audit-ci.jsonc -> one row per allowlist entry, with
# whether audit-ci will honour it today. audit-ci ignores an entry
# that is not active, or whose expiry is not after today.
# shellcheck disable=SC2016
AUDIT_JQ_ALLOWLIST='
  [.allowlist[]
   | if type == "string" then {id: ., active: true, notes: null, expiry: null}
     else to_entries[0] | {id: .key, active: (.value.active == true), notes: .value.notes, expiry: .value.expiry}
     end
   | .effective = (.active and (
       .expiry == null
       or ((.expiry | type) == "string" and (.expiry | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")) and .expiry > $today)))]
'

# Lowest severity rank the config fails on (audit-ci's "high": true
# fails on high and critical). 99 when no level is set.
# shellcheck disable=SC2016
AUDIT_JQ_THRESHOLD='
  [({"low": 1, "moderate": 2, "high": 3, "critical": 4} | to_entries[]) as $l
   | select(.[$l.key] == true) | $l.value] | min // 99
'

# Marker audit-allowlist-add.sh writes into an entry's notes when a
# fixed version exists but a parent package pins the vulnerable range.
AUDIT_BLOCKED_MARKER="Fix blocked upstream:"

# For each advisory row ({ghsa, package, ranges}) on stdin as a JSON
# array, print the same rows with installed versions and the lowest
# published version outside every vulnerable range that is newer than
# a vulnerable installed version (fixed_version, or null).
audit_fix_check() {
    local repo_path="$1"
    node "$(dirname "${BASH_SOURCE[0]}")/audit-fix-check.mjs" "$repo_path"
}
