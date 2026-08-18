#!/bin/bash
# Dispatch the skill-creator skill from a trigger phrase.
#
# Usage:
#   start-skill-creator.sh "<trigger phrase>"
#
# Parses the trigger and emits one of:
#
#   MODE: CREATE
#   {"name": "<name>", "decisions_path": ".../decisions.json"}
#
#   MODE: AUDIT_ONE
#   {"name": "<name>", "skill_md_path": "...", "output_path": "..."}
#
#   MODE: AUDIT_ALL
#   {"targets": [{"name": "...", "skill_md_path": "...", "output_path": "..."}, ...]}
#
# The parent session branches on the first stdout line, then
# follows the relevant flow in SKILL.md.

set -e

TRIGGER="${1:-}"
[[ -z "$TRIGGER" ]] && { echo "Usage: $0 \"<trigger phrase>\"" >&2; exit 1; }

WS="$HOME/git/defra/trade-imports-workspace"
SKILLS_DIR="$WS/.claude/skills"
AUDITS_DIR="$WS/workareas/skills-audit"
INTERVIEWS_DIR="$WS/workareas/skill-creator"

mkdir -p "$AUDITS_DIR" "$INTERVIEWS_DIR"

# Normalise trigger to lowercase for matching.
trigger_lc=$(echo "$TRIGGER" | tr '[:upper:]' '[:lower:]')

extract_name() {
    # Strip trailing punctuation; require kebab-case.
    local n="$1"
    n="${n%[.,;!?]}"
    case "$n" in
        *[!a-z0-9-]*|-*|"") return 1 ;;
    esac
    echo "$n"
}

mode=""
name=""

# CREATE triggers (most specific first).
for prefix in "scaffold skill " "skill-create " "new workspace skill "; do
    if [[ "$trigger_lc" == "$prefix"* ]]; then
        candidate="${trigger_lc#$prefix}"
        candidate="${candidate%% *}"
        if name=$(extract_name "$candidate"); then
            mode="CREATE"
            break
        fi
    fi
done

# AUDIT single-skill triggers.
if [[ -z "$mode" ]]; then
    for prefix in "audit skill " "review skill "; do
        if [[ "$trigger_lc" == "$prefix"* ]]; then
            candidate="${trigger_lc#$prefix}"
            candidate="${candidate%% *}"
            if name=$(extract_name "$candidate"); then
                mode="AUDIT_ONE"
                break
            fi
        fi
    done
fi

# AUDIT fan-out trigger (no name).
if [[ -z "$mode" ]]; then
    case "$trigger_lc" in
        "audit skills"|"audit all skills")
            mode="AUDIT_ALL" ;;
    esac
fi

if [[ -z "$mode" ]]; then
    cat >&2 <<EOF
Could not parse trigger: $TRIGGER

Recognised forms:
  CREATE:    "scaffold skill <name>" | "skill-create <name>" | "new workspace skill <name>"
  AUDIT one: "audit skill <name>" | "review skill <name>"
  AUDIT all: "audit skills"

<name> must be kebab-case ([a-z][a-z0-9-]+).
EOF
    exit 1
fi

case "$mode" in
    CREATE)
        # Refuse to overwrite existing skill.
        if [[ -d "$SKILLS_DIR/$name" ]]; then
            echo "Skill already exists at $SKILLS_DIR/$name — refusing to overwrite." >&2
            echo "Pick a different name, or delete the existing scaffold first." >&2
            exit 1
        fi
        mkdir -p "$INTERVIEWS_DIR/$name"
        decisions="$INTERVIEWS_DIR/$name/decisions.json"
        now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        if [[ ! -f "$decisions" ]]; then
            jq -n \
                --arg name "$name" \
                --arg now "$now" \
                '{
                    name: $name,
                    started_at: $now,
                    answered_at: null,
                    scaffolded_at: null,
                    answers: {}
                }' > "$decisions.tmp"
            mv "$decisions.tmp" "$decisions"
        fi
        echo "MODE: CREATE"
        jq -nc \
            --arg name "$name" \
            --arg path "$decisions" \
            '{name: $name, decisions_path: $path}'
        ;;

    AUDIT_ONE)
        skill_md="$SKILLS_DIR/$name/SKILL.md"
        if [[ ! -f "$skill_md" ]]; then
            echo "No skill at $skill_md — nothing to audit." >&2
            exit 1
        fi
        out="$AUDITS_DIR/$name.md"
        echo "MODE: AUDIT_ONE"
        jq -nc \
            --arg name "$name" \
            --arg sm "$skill_md" \
            --arg out "$out" \
            '{name: $name, skill_md_path: $sm, output_path: $out}'
        ;;

    AUDIT_ALL)
        targets=()
        for d in "$SKILLS_DIR"/*/; do
            n=$(basename "$d")
            # Exclude skill-creator itself.
            [[ "$n" == "skill-creator" ]] && continue
            [[ -f "$d/SKILL.md" ]] || continue
            targets+=("$n")
        done
        if [[ ${#targets[@]} -eq 0 ]]; then
            echo "No skills to audit under $SKILLS_DIR (excluding skill-creator)." >&2
            exit 1
        fi
        echo "MODE: AUDIT_ALL"
        jq -nc --argjson dummy 0 \
            --arg skills_dir "$SKILLS_DIR" \
            --arg audits_dir "$AUDITS_DIR" \
            --argjson names "$(printf '%s\n' "${targets[@]}" | jq -R . | jq -s .)" \
            '{
                targets: ($names | map({
                    name: .,
                    skill_md_path: ($skills_dir + "/" + . + "/SKILL.md"),
                    output_path: ($audits_dir + "/" + . + ".md")
                }))
            }'
        ;;
esac
