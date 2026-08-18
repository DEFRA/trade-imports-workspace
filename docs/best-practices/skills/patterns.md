# Workspace skill patterns — the 8-pattern checklist

Workspace skills under `~/git/defra/trade-imports-workspace/.claude/skills/`
share a small vocabulary of shapes. Each pattern is a judgment call,
not a default — the same skill rarely uses all of them. This doc is
the canonical reference cited by `skill-creator` (CREATE mode applies
it, AUDIT mode checks it) and by anyone reviewing a skill by hand.

Companion docs in this directory:

- [`anti-patterns.md`](anti-patterns.md) — known mis-applications,
  one entry per recurring trap.
- [`scaffold-template.md`](scaffold-template.md) — the `SKILL.md`
  skeleton CREATE mode emits.

## 1. State as canonical JSON (or not)

**Question:** What state does the skill produce, and is it queried by
downstream tooling?

- **JSON-canonical** if: there's a list of N items the skill or the
  user wants to filter / aggregate / mutate by helper (review items,
  upgrade packages, style findings). The walker pattern only makes
  sense over a JSON list.
- **Prose-canonical** if: the artifact is a narrative the user reads
  end-to-end and nothing queries (a plan, a Jira description, a
  refinement verdict report, a how-it-works doc). Don't promote to
  JSON.

**Pattern-fit trap:** it's tempting to add a JSON sidecar "for
queryability" everywhere. Only do it when there is an actual query.

## 2. Scripts call other scripts (single dispatcher)

**Question:** Does the LLM run multiple sequential deterministic
commands at session start (fetch X, then fetch Y, then mkdir Z, then
write W)? If yes, those collapse into one `start-<skill>.sh` (or
`prepare-<skill>.sh`) dispatcher.

The dispatcher's first stdout line is conventionally `MODE: <NAME>`
so the parent session knows which branch to follow.

**Pattern-fit trap:** if the workflow has only 1-2 deterministic
setup steps, a dispatcher is overkill. Inline in `SKILL.md` is fine.

## 3. Pre-baked context at prepare time

**Question:** Do workers (fan-out subagents) or the parent session
fetch the same data multiple times? If yes, bake it once at prepare-
time into `workareas/<skill>/<ticket>/...`.

Examples: per-repo best-practices bundles, PR diff caches, per-
version CHANGELOG sections.

**Pattern-fit trap:** don't pre-bake speculative context. Only what
the workflow actually reads on the hot path.

## 4. Bash call hygiene (LLM-typed commands)

The hard rules, all enforced via the project allowlist:

- One command per Bash call. No `&&` / `;` / `|` chains.
- No `cd <dir> && cmd` — use `-C` (git), `--prefix` (npm), `-f`
  (mvn), or direct paths to binaries
  (`<dir>/node_modules/.bin/...`).
- No `find ... -exec`. Use Glob + Read for find-then-read.
- No env vars (`$VAR`) in LLM-typed Bash — Claude Code prompts on
  expansion. Use literal
  `~/git/defra/trade-imports-workspace/...` paths.
- No `/Users/<you>/git/...` resolved form either — the matcher
  treats `~/git/...` and `/Users/.../git/...` as different prefixes.
- No `python3 -c` for JSON — use `jq` or workspace helpers.
- No `awk` / `sed -n` / `grep -n` to inspect files — use Read with
  offset+limit.
- Filter at the script (`--filter`, `--file`, `--repo` flag), not
  at the pipe.

This is workspace-wide; the full rule table lives in
[`docs/agent-skills.md`](../../agent-skills.md) → "Bash call
hygiene". Skill prose must comply; AUDIT mode flags violations.

## 5. Hygiene pointer inside worker personas

**Question:** Does the skill fan out workers via `general-purpose`
Task subagents that follow `references/<NAME>.md`? If yes, every
worker reference file needs a one-line pointer to the canonical
source ([`docs/agent-skills.md`](../../agent-skills.md) → "Bash
call hygiene") — subagents only read their reference file, not the
parent `SKILL.md`. Point, don't inline: the full rule table lives
once, canonically, so copies can't drift.

**Pattern-fit trap:** if the skill has no fan-out (parent session
follows the reference inline), even the pointer is optional. Add it
by default; skip only for very small single-file references.

## 6. Idempotent + atomic helpers

**Question:** Do helper scripts mutate state files?

- Atomic mutation = `jq ... > "$tmp" && mv "$tmp" "$file"` (or
  equivalent). Never partial-write.
- Coverage / completion gates check JSON fields, not file
  presence/non-emptiness (`jq -e '.verdict != null'`, not
  `[[ -s file ]]`).
- Where re-running might re-process already-done work, add a
  `reconciled_at` / `processed_at` marker and skip files where it's
  newer than the source's `updated_at`.

**Pattern-fit trap:** for single-shot single-author flows
(ticket-creator's `draft.md`), atomicity is over-engineering.
Recognise that.

## 7. Walker UX (for N-item triage)

**Question:** Does the skill produce a list of decisions the user
needs to make one-at-a-time (findings, items, packages)? If yes,
batch the presentation: present all items in one markdown block,
take a single batch keystroke string (`FFWFFWSSF`), apply via
parallel helper calls, slow-track only `D`s.

**Pattern-fit trap:** walkers are for N items. A single artifact (a
plan, a verdict, a draft) doesn't get a walker — natural-language
approval is right.

## 8. Allowlist coverage

**Question:** Does the skill introduce new `tools/<name>/` scripts?
If yes, add:

```
Bash(~/git/defra/trade-imports-workspace/tools/<name>/*)
Bash(~/git/defra/trade-imports-workspace/tools/<name>/*:*)
```

to `.claude/settings.json`. CREATE mode generates the entries as
part of scaffolding; AUDIT mode checks for missing entries.

## Pattern 9 (companion): Prose hygiene

The 8-pattern checklist focuses on shape. A ninth axis — prose
hygiene — runs orthogonally: even a correctly-shaped skill can carry
residue. AUDIT mode evaluates it but the deliverable is a **proposed
trim diff** (per-file deletions / collapses with line refs and short
rationale), not in-place edits. Trims land via a separate
implementation pass after the user reviews.

Trim categories to scan for:

- Historical / migration residue ("previously ...", "migrated
  from ...", "used to live at ..."). Commit log owns the rationale.
- Workspace-wide content duplicated per skill — collapse to a one-
  line reference to `docs/agent-skills.md`.
- Hygiene pointer placement: workers spawned as `general-purpose`
  subagents need the one-line pointer to `docs/agent-skills.md`
  (never a re-inlined full block); parent-loaded references inherit
  `SKILL.md`.
- Over-defensive bullets making the same point.
- Verbose rationale ("why" beyond a single phrase) — belongs in
  commits / audit plans, not skill prose.
- Stale references to scripts, paths, helpers that no longer exist.
- Forward-looking notes that aren't actionable.
- Repeated examples — pick one canonical location.

**Don't cut:** anti-pattern guardrails, worker spawn-prompt
templates, per-step instructions, decision rationale that informs
edge cases, cross-skill handoff prose, concrete file/line
citations.

## Cross-cutting conventions

- **Path conventions** — literal
  `~/git/defra/trade-imports-workspace/...` in LLM-typed
  prose. No env vars. See
  [`docs/agent-skills.md`](../../agent-skills.md).
- **Worker fan-out** — `subagent_type: general-purpose` with a
  `Follow the instructions in ~/git/.../references/<NAME>.md.`
  prompt. Not custom subagent types (they trigger the no-write
  guardrail).
- **Rendered markdown from JSON** — when state is JSON, the
  markdown view (e.g. `## Items` table) is generated by a
  `render-X.sh` helper. Hand-edits to the markdown are overwritten.
- **Cross-skill conventions** live under
  `docs/best-practices/...` — single source of truth for things
  multiple skills cite.
