const fence = '```'

/**
 * The Step 0 section of a new skill with a dispatcher.
 *
 * @param {string} name
 * @returns {string}
 */
export const step0Block = (name) => `
## Step 0: Start

${fence}bash
~/git/defra/trade-imports-workspace/tools/${name}/start-${name}.sh TODO_ARGS
${fence}

First stdout line is \`MODE: <BRANCH>\`. Branch on it.`

/**
 * The worker references section of a new skill with fan-out.
 *
 * @param {string} name
 * @param {string[]} workers
 * @returns {string}
 */
export const workerBlock = (name, workers) => `
## Worker references

| Persona | Used in | Artifact |
|---|---|---|
${workers.map((worker) => `| \`references/${worker}.md\` | TODO step | TODO artifact |`).join('\n')}

Spawn idiom — Task tool, \`subagent_type: general-purpose\`,
prompt begins:

${fence}
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/${name}/references/<NAME>.md.

<per-spawn context>
${fence}`

/**
 * The State section of a new skill that keeps JSON state.
 *
 * @param {string} name
 * @returns {string}
 */
export const stateBlock = (name) => `
## State

Canonical state is JSON at
\`~/git/defra/trade-imports-workspace/workareas/${name}/<id>/state.json\`.
Schema: \`assets/${name}-schema.md\`. Mutated only via \`tools/${name}/*.sh\`
helpers (atomic \`jq ... > tmp; mv tmp file\`).`

/**
 * A new skill's SKILL.md. Each block is the text of its section, or empty
 * when the skill does not have it; an empty block still leaves its line.
 *
 * @param {object} args
 * @param {string} args.name
 * @param {string} args.purpose
 * @param {string} args.disambiguation
 * @param {string[]} args.phrases
 * @param {string[]} args.helpers
 * @param {string} args.workerSection
 * @param {string} args.stateSection
 * @param {string} args.step0Section
 * @returns {string}
 */
export const skillMarkdown = ({
  name,
  purpose,
  disambiguation,
  phrases,
  helpers,
  workerSection,
  stateSection,
  step0Section
}) => `---
name: ${name}
description: '${purpose} Triggers: ${phrases.map((phrase) => `"${phrase}"`).join(', ')}. ${disambiguation} TODO — refine description and add NOT-for clauses pointing at neighbouring skills.'
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

## Path conventions

Cross-workspace paths use the literal home-relative form —
\`~/git/defra/trade-imports-workspace/tools/<domain>/\`,
\`~/git/defra/trade-imports-workspace/docs/best-practices/\`,
\`~/git/defra/trade-imports-workspace/workareas/\`. Bash
expands \`~\` automatically. Skill-internal references stay
relative (\`references/<NAME>.md\`, \`assets/<NAME>.md\`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [\`docs/agent-skills.md\`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
${phrases.map((phrase) => `| "${phrase}" | TODO — section name |`).join('\n')}

NOT for TODO — name out-of-scope cases pointing at the right
neighbouring skill.
${workerSection}
${stateSection}
${step0Section}

## Step 1: TODO

<!-- TODO: per-step instructions. -->

## Completion output

${fence}
${name} complete for <id>.

Summary:
- TODO key metric

Next: TODO hint.
${fence}

## Scripts cheat-sheet

All under \`~/git/defra/trade-imports-workspace/tools/${name}/\`:

| Script | Purpose |
|---|---|
${helpers.map((helper) => `| \`${helper}.sh\` | TODO — one-line purpose |`).join('\n')}
`

/**
 * A fan-out worker's reference stub.
 *
 * @returns {string}
 */
export const workerReferenceMarkdown =
  () => `TODO — one-paragraph statement of what this worker does and what
single artifact it produces.

## Bash call hygiene

**Rule: one command per Bash call.** The allowlist matcher sees
the whole command string; chains and pipes don't match the prefix
rule even when each piece would.

- No \`&&\` / \`;\` / \`|\` between commands — separate Bash calls.
- No \`cd <dir> && cmd\` — use \`cmd -C <dir>\` (git), full paths to
  binaries, or \`--prefix\` / \`-f\` flags.
- No \`find ... -exec\` — use Glob + Read.
- No \`$VAR\` in LLM-typed Bash — use literal
  \`~/git/defra/trade-imports-workspace/...\` paths.
- No \`/Users/<you>/git/...\` resolved form — type the \`~/\` form.
- No \`python3 -c\` for JSON — use \`jq\`.
- No \`awk\` / \`sed -n\` / \`grep -n\` for file inspection — use Read
  with offset+limit.

Full rule table:
\`~/git/defra/trade-imports-workspace/docs/agent-skills.md\`.

## Inputs

TODO — describe the per-spawn context the parent provides.

## Workflow

TODO — numbered steps. Read X, decide Y, write Z.

## Return value

TODO — one-line summary the parent aggregates.
`

/**
 * The state schema stub of a skill that keeps JSON state.
 *
 * @param {string} name
 * @returns {string}
 */
export const stateSchemaMarkdown = (name) => `# ${name} state JSON shape

Canonical state file:
\`~/git/defra/trade-imports-workspace/workareas/${name}/<id>/state.json\`.

Mutated only via \`tools/${name}/*.sh\` helpers. The markdown view
is regenerated by \`render-${name}.sh\` whenever the JSON changes.

## Schema

${fence}jsonc
{
  "id": "<id>",
  "created_at": "2026-05-26T...",
  "items": [
    {
      "id": 1,
      "TODO": "TODO — fill in the per-item shape"
    }
  ]
}
${fence}

## Field rules

- TODO — document each field, validation rules, and which helper
  mutates it.
`

/**
 * A helper script stub that refuses to run until someone writes it.
 *
 * @param {string} helper
 * @returns {string}
 */
export const helperStubScript = (helper) => `#!/bin/bash
# TODO — one-line purpose of this helper.
# Boundary (only if this helper has a sibling) — TODO: when to use this vs that sibling.
#
# Usage:
#   ${helper}.sh --run-id <id> [TODO other flags]
#
# Atomic mutations: write to .tmp then mv.

set -e

RUN_ID=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --run-id) RUN_ID="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,9p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

[[ -z "$RUN_ID" ]] && { echo "Missing --run-id" >&2; exit 1; }

# TODO — implement.
echo "TODO: ${helper}.sh not yet implemented" >&2
exit 1
`
