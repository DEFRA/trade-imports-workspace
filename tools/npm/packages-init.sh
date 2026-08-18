#!/bin/bash
# Initialise packages.{repo}.json for one repo from an ncu JSON object.
#
# Usage:
#   packages-init.sh --run-id TICKET --repo REPO --repo-path PATH \
#                    --strategy STRATEGY --ncu-version VERSION \
#                    [--ncu-json JSON_STRING | --ncu-file PATH] \
#                    [--force]
#
# Reads ncu's --jsonUpgraded output (an object of { package: target })
# and builds the consolidated state file. Determines upgrade_type and
# dependency_type by reading package.json under --repo-path.
#
# Preserves prior classification / status / context fields on re-run
# (matching by package name); only the package list and discovered_at
# are refreshed. Use --force to wipe and re-seed.

set -e

RUN_ID=""
REPO=""
REPO_PATH=""
STRATEGY="latest"
NCU_VERSION=""
NCU_JSON=""
NCU_FILE=""
FORCE=0

usage() {
    cat <<EOF >&2
Usage: $0 --run-id TICKET --repo REPO --repo-path PATH --strategy LEVEL --ncu-version VER (--ncu-json JSON | --ncu-file PATH) [--force]
EOF
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        --repo) REPO="$2"; shift 2 ;;
        --repo-path) REPO_PATH="$2"; shift 2 ;;
        --strategy) STRATEGY="$2"; shift 2 ;;
        --ncu-version) NCU_VERSION="$2"; shift 2 ;;
        --ncu-json) NCU_JSON="$2"; shift 2 ;;
        --ncu-file) NCU_FILE="$2"; shift 2 ;;
        --force) FORCE=1; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1" >&2; usage ;;
    esac
done

[[ -z "$RUN_ID" ]] && usage
[[ -z "$REPO" ]] && usage
[[ -z "$REPO_PATH" ]] && usage
[[ -z "$NCU_VERSION" ]] && usage

if [[ -n "$NCU_FILE" ]]; then
    [[ -f "$NCU_FILE" ]] || { echo "ncu file not found: $NCU_FILE" >&2; exit 1; }
    NCU_JSON=$(cat "$NCU_FILE")
fi
[[ -z "$NCU_JSON" ]] && { echo "--ncu-json or --ncu-file required" >&2; usage; }

PKG_JSON="$REPO_PATH/package.json"
[[ -f "$PKG_JSON" ]] || { echo "package.json not found: $PKG_JSON" >&2; exit 1; }

WORKSPACE_DIR="$HOME/git/defra/trade-imports-workspace/workareas/npm-upgrades/$RUN_ID/$REPO"
mkdir -p "$WORKSPACE_DIR"
TARGET="$WORKSPACE_DIR/packages.${REPO}.json"

# Build new packages array from ncu output.
new_packages=$(jq -n \
    --argjson ncu "$NCU_JSON" \
    --slurpfile pkg "$PKG_JSON" \
    '
    def upgrade_type(cur; tgt):
        (cur | sub("^[\\^~>=< ]+"; "") | split(".")) as $c
        | (tgt | sub("^[\\^~>=< ]+"; "") | split(".")) as $t
        | if ($c[0] // "0") != ($t[0] // "0") then "major"
          elif ($c[1] // "0") != ($t[1] // "0") then "minor"
          else "patch" end;

    def dep_type($name):
        if (($pkg[0].dependencies // {}) | has($name)) then "dependencies"
        elif (($pkg[0].devDependencies // {}) | has($name)) then "devDependencies"
        else "dependencies" end;

    def clean(v): v | sub("^[\\^~>=< ]+"; "");

    [ $ncu | to_entries[] |
        ($pkg[0].dependencies[.key] // $pkg[0].devDependencies[.key] // .value) as $cur_raw
        | {
            package: .key,
            current: clean($cur_raw),
            target: clean(.value),
            upgrade_type: upgrade_type($cur_raw; .value),
            dependency_type: dep_type(.key),
            classification: null,
            risk: null,
            safe_for_automation: null,
            rationale: null,
            files_affected: null,
            changes_required_summary: null,
            changelog_url: null,
            migration_guide_url: null,
            implementation_status: null,
            failure_reason: null,
            commit_sha: null,
            completed_at: null,
            demoted_from_auto: false,
            context_baked: null,
            context_missing: []
          }
    ]
    ')

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ -f "$TARGET" ]] && [[ "$FORCE" != "1" ]]; then
    # Merge: preserve prior per-package state, refresh discovery header.
    jq -n \
        --slurpfile prior "$TARGET" \
        --argjson new "$new_packages" \
        --arg ticket "$RUN_ID" \
        --arg repo "$REPO" \
        --arg now "$NOW" \
        --arg strategy "$STRATEGY" \
        --arg ncu_version "$NCU_VERSION" \
        '
        ($prior[0].packages // []) as $prior_pkgs
        | $new | map(
            . as $n
            | ($prior_pkgs | map(select(.package == $n.package)) | .[0]) as $p
            | if $p == null then $n
              else
                $n
                | .classification = $p.classification
                | .risk = $p.risk
                | .safe_for_automation = $p.safe_for_automation
                | .rationale = $p.rationale
                | .files_affected = $p.files_affected
                | .changes_required_summary = $p.changes_required_summary
                | .changelog_url = $p.changelog_url
                | .migration_guide_url = $p.migration_guide_url
                | .implementation_status = $p.implementation_status
                | .failure_reason = $p.failure_reason
                | .commit_sha = $p.commit_sha
                | .completed_at = $p.completed_at
                | .demoted_from_auto = $p.demoted_from_auto
                | .context_baked = $p.context_baked
                | .context_missing = $p.context_missing
              end
          ) as $merged
        | {
            ticket: $ticket,
            repo: $repo,
            discovered_at: $now,
            strategy: $strategy,
            ncu_version: $ncu_version,
            packages: $merged
          }' > "$TARGET.tmp"
else
    jq -n \
        --argjson new "$new_packages" \
        --arg ticket "$RUN_ID" \
        --arg repo "$REPO" \
        --arg now "$NOW" \
        --arg strategy "$STRATEGY" \
        --arg ncu_version "$NCU_VERSION" \
        '{
            ticket: $ticket,
            repo: $repo,
            discovered_at: $now,
            strategy: $strategy,
            ncu_version: $ncu_version,
            packages: $new
        }' > "$TARGET.tmp"
fi

mv "$TARGET.tmp" "$TARGET"
echo "$TARGET"
