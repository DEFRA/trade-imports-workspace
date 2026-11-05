#!/bin/bash
# Shared by the review scripts' batch mode (--from FILE): one call writes
# many entries, all or nothing.
#
# Source it; it defines functions only.
#
#   batch_args FILE JQ_PATH
#       Prints the object at JQ_PATH in FILE as NUL-separated flag/value
#       pairs for the single-entry script: {"best_practice": "x"} becomes
#       --best-practice x. Null values are left out.
#
#   batch_snapshot TARGET...
#       Records the current state of each target file (present or absent)
#       so batch_restore can put it back. Call it before the first write.
#
#   batch_restore
#       Puts every snapshotted target back as it was: restores a copy, or
#       deletes a file the batch created.

batch_args() {
    jq -j "$2"' | to_entries[] | select(.value != null)
        | "--\(.key | gsub("_"; "-"))\u0000\(.value | tostring)\u0000"' "$1"
}

BATCH_SNAPSHOT_DIR=""
BATCH_TARGETS=()

batch_snapshot() {
    BATCH_SNAPSHOT_DIR=$(mktemp -d)
    BATCH_TARGETS=()
    local target i=0
    for target in "$@"; do
        BATCH_TARGETS+=("$target")
        if [[ -f "$target" ]]; then
            cp "$target" "$BATCH_SNAPSHOT_DIR/$i"
        fi
        i=$((i + 1))
    done
}

batch_restore() {
    local i
    for ((i = 0; i < ${#BATCH_TARGETS[@]}; i++)); do
        if [[ -f "$BATCH_SNAPSHOT_DIR/$i" ]]; then
            cp "$BATCH_SNAPSHOT_DIR/$i" "${BATCH_TARGETS[$i]}"
        else
            rm -f "${BATCH_TARGETS[$i]}"
        fi
    done
    rm -rf "$BATCH_SNAPSHOT_DIR"
}

batch_done() {
    rm -rf "$BATCH_SNAPSHOT_DIR"
}

# batch_run SCRIPT ID FROM_FILE
#   Runs SCRIPT ID <entry flags> once per entry of the JSON list in
#   FROM_FILE. Prints each run's output, in order, only when every entry
#   succeeds. On the first failure it restores the snapshot, says which
#   entry failed and why, and returns 1. Snapshot the targets first.
batch_run() {
    local script="$1" id="$2" from="$3"
    local count i out outputs="" args
    count=$(jq 'length' "$from")
    for ((i = 0; i < count; i++)); do
        args=()
        while IFS= read -r -d '' a; do args+=("$a"); done < <(batch_args "$from" ".[$i]")
        if ! out=$(bash "$script" "$id" "${args[@]}" 2>&1); then
            batch_restore
            echo "Entry $((i + 1)) of $count failed: $out" >&2
            echo "Nothing written: all $count entries rolled back." >&2
            return 1
        fi
        outputs+="$out"$'\n'
    done
    batch_done
    printf '%s' "$outputs"
}

# batch_check_list FROM_FILE
#   Refuses a missing file, invalid JSON, or anything but a non-empty list.
batch_check_list() {
    local from="$1"
    [[ -f "$from" ]] || { echo "No such file: $from" >&2; return 1; }
    jq -e 'type == "array" and length > 0' "$from" > /dev/null 2>&1 \
        || { echo "$from must hold a non-empty JSON list" >&2; return 1; }
}
