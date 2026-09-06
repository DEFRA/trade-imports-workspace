#!/bin/bash
# Target resolution for the build loop. Sourced, not executed.
#
# The loop used to hardcode prototypes/standalone/live-animals, which was
# promoted into src/server/app and no longer exists — four scripts broke at
# once. The target is data now, so the next promotion is a one-line edit to
# targets.json rather than a sweep through the scripts.
#
#   source "$WORKSPACE/tools/journey-builder/target-profile.sh"
#   load_target "$RUN_ID" "$TARGET_FLAG"
#
# Sets: TARGET_ID, TARGET_REPO (absolute), TARGET_SCOPE, TARGET_SPEC_DIR,
#       TARGET_IMPLEMENTOR, TARGET_COMMIT_PATHS (array),
#       TARGET_VERIFY_UNIT / _FORMAT / _LINT / _E2E (empty means skip),
#       TARGET_JOURNEY_ID, TARGET_SPEC_BRANCH_SUFFIX,
#       TARGET_SOURCES (compact JSON array, drives prepare-digest.sh), and
#       TARGET_REMOVE_SECTIONS (compact JSON array) /
#       TARGET_REPOINT_FIXTURES (true|false) for backlog-generate.sh's tail.

load_target() {
    local run_id="$1"
    local explicit="$2"
    local targets_file="$WORKSPACE/tools/journey-builder/targets.json"

    [[ -f "$targets_file" ]] || { echo "Error: $targets_file not found" >&2; return 1; }

    local backlog="$WORKSPACE/workareas/journey-builder/$run_id/backlog.json"
    local meta="$WORKSPACE/workareas/journey-builder/$run_id/.digest-meta.json"

    TARGET_ID="$explicit"
    if [[ -z "$TARGET_ID" && -f "$backlog" ]]; then
        TARGET_ID="$(jq -r '.target // empty' "$backlog")"
    fi
    if [[ -z "$TARGET_ID" && -f "$meta" ]]; then
        TARGET_ID="$(jq -r '.target // empty' "$meta")"
    fi
    if [[ -z "$TARGET_ID" ]]; then
        TARGET_ID="$(jq -r '.default' "$targets_file")"
    fi

    jq -e --arg id "$TARGET_ID" '.targets | has($id)' "$targets_file" >/dev/null || {
        echo "Error: unknown target '$TARGET_ID'. Known: $(jq -r '.targets | keys | join(", ")' "$targets_file")" >&2
        return 1
    }

    local profile
    profile="$(jq -c --arg id "$TARGET_ID" '.targets[$id]' "$targets_file")"

    local repo_rel
    repo_rel="$(jq -r '.repo' <<<"$profile")"
    TARGET_REPO="$WORKSPACE/$repo_rel"
    TARGET_SCOPE="$(jq -r '.scope' <<<"$profile")"
    TARGET_SPEC_DIR="$(jq -r '.specDir // empty' <<<"$profile")"
    TARGET_IMPLEMENTOR="$(jq -r '.implementorSkill // empty' <<<"$profile")"

    TARGET_COMMIT_PATHS=()
    while IFS= read -r path; do
        [[ -n "$path" ]] && TARGET_COMMIT_PATHS+=("$path")
    done < <(jq -r '.commitPaths[]? ' <<<"$profile")

    TARGET_VERIFY_UNIT="$(jq -r '.verify.unit // empty' <<<"$profile")"
    TARGET_VERIFY_FORMAT="$(jq -r '.verify.format // empty' <<<"$profile")"
    TARGET_VERIFY_LINT="$(jq -r '.verify.lint // empty' <<<"$profile")"
    TARGET_VERIFY_E2E="$(jq -r '.verify.e2e // empty' <<<"$profile")"

    TARGET_JOURNEY_ID="$(jq -r '.journeyId // empty' <<<"$profile")"
    TARGET_SPEC_BRANCH_SUFFIX="$(jq -r '.specBranchSuffix // empty' <<<"$profile")"
    TARGET_SOURCES="$(jq -c '.sources // []' <<<"$profile")"

    # Absent backlogTail means an empty tail, which is what a greenfield set
    # wants: no vendored sections to strip and no fixtures to re-point.
    TARGET_REMOVE_SECTIONS="$(jq -c '.backlogTail.removeSections // []' <<<"$profile")"
    TARGET_REPOINT_FIXTURES="$(jq -r '.backlogTail.repointTestFixtures // false' <<<"$profile")"
}
