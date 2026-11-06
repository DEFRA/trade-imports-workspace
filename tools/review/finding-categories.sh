#!/bin/bash
# Finding categories for review and code-style items. Source this file.

FUNCTIONAL_CATEGORIES=(correctness security error-handling coverage-gap)
CODE_QUALITY_CATEGORIES=(naming comments structure duplication logging test-readability history)
DESIGN_CATEGORIES=(design)

refuse_category_outside() {
    local category="$1"
    shift
    local allowed
    for allowed in "$@"; do
        [[ "$category" == "$allowed" ]] && return 0
    done
    echo "--category must be one of: $*. Got \"$category\"." >&2
    exit 1
}
