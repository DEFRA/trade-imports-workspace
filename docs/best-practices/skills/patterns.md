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
- No `cd <dir> && cmd` — use `-C` (git), `--prefix` (npm) or `-f`
  (mvn).
- Never pipe a test run. Redirect it to a file and Read the file:
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > <workarea>/test.log 2>&1`,
  not `... test | tail -40`. A piped run reports the trimmer's exit
  code, so a red run reads as green. `guard-bash.sh` denies it.
- Format and lint through the repo's named npm script
  (`npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run format`).
  Never a `node_modules/.bin/` binary and never `npx`: prettier run
  by path from outside the repo formats differently from the repo's
  own script, and the pre-commit hook rejects the result.
- No `find ... -exec`. Run a plain `find ~/git/... -name X`, then Read.
- No Grep or Glob tools in a spawned agent. Search with one unpiped
  Bash `grep -rn`; find files with one unpiped `find`.
- No `VAR=x cmd` prefixes; they do not match the allowlist.
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

## 5. What every agent prompt carries

**Question:** Does the skill, workflow or script spawn agents
(`general-purpose` Task subagents following `references/<NAME>.md`,
Workflow `agent()` calls, Codex briefs, ad-hoc spawns)? If yes, each
prompt carries three things. Spawned agents read only their prompt and
the files it names: not the parent `SKILL.md`, and not the user's auto
memory.

1. **The GUARD RAILS block, first.** The rail list is in
   [`docs/agent-skills.md`](../../agent-skills.md) → "Spawning agents".
   A worker reference file opens with a one-line pointer to it and to
   "Bash call hygiene". Point, don't inline, so copies cannot drift.
2. **The house rules, for every agent that writes or reviews code,
   tests or templates.** The prompt says: "Before you start, read
   `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`
   in full." This holds for skill personas, Workflow scripts and
   one-off scripts alike. Rule files under `.claude/rules/` load only
   when an agent happens to read a matching path, and Codex loads
   none, so a prompt that does not name the file leaves the agent
   without the rules.
3. **An explicit `model`**, chosen by the table in "Spawning agents".

Bad, from an ad-hoc fix workflow: a brief that says "match animals' doc
comment" and names no rules file; the agent copied the ticket key into
the code. Good: GUARD RAILS first, then the line telling the agent to
read `code-quality.md` in full, then the task.

**Pattern-fit trap:** if the skill has no fan-out (the parent session
follows the reference inline), the pointer is optional; the parent
already has the rules. Any spawn at all needs all three.

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

**A lean skill has a narrow scope, not short prose.** When a skill is
"too fat", split what it does (one element or one increment, then
stop), never the detail of how it does it. Never trim instructions to
hit a line count.

## Judging a skill, workflow or tool design

- **Judge options on how well they run, every time they run:** output
  quality, correctness, report quality, Claude and Codex parity, and
  whether the run stays inside the guard rails. Tooling is built once
  and run many times.
- **Never weigh build cost.** No "fewest changes", "smallest diff",
  "reuse", "cheapest" or "least work" angle for a designer, and no such
  dimension for a judge. "Take the best of what we have" means reuse
  proven ideas, not minimise the diff. Cutting a fixed cost paid on
  every run is a fair criterion; implementation effort is not.
- **Do not shrink the output to fit a channel.** A platform limit, such
  as the Artifact size ceiling, is a fact about one channel: pick a
  channel that carries the best output.
- **No gold-plating.** Scope is what was asked. A mechanism earns its
  place only against a failure that has happened, or one the requested
  behaviour cannot work without. Bad: a tooling programme that gave
  every critic's imagined risk its own mechanism and grew to a 468 KB
  design. Good: a few CLI commands and prompt files that meet the ask.
- **Rails before features in a new sub-project.** Phase 0 of a new CLI,
  package or repo folder is its agent rails: `CLAUDE.md` (tests first,
  behavioural tests, library-first integrations, plain English for user
  text, the best-practices it inherits), `.claude/settings.json` with
  its hooks, and `.claude/skills/` where repeated tasks are already
  clear. Feature code starts in phase 1. `tim/` is the model.

## Cross-cutting conventions

- **Path conventions** — literal
  `~/git/defra/trade-imports-workspace/...` in LLM-typed
  prose. No env vars. See
  [`docs/agent-skills.md`](../../agent-skills.md).
- **Worker fan-out** — `subagent_type: general-purpose` with a
  `Follow the instructions in ~/git/.../references/<NAME>.md.`
  prompt. Not custom subagent types (they trigger the no-write
  guardrail). Every spawn prompt carries the three items in §5.
- **Rendered markdown from JSON** — when state is JSON, the
  markdown view (e.g. `## Items` table) is generated by a
  `render-X.sh` helper. Hand-edits to the markdown are overwritten.
- **Cross-skill conventions** live under
  `docs/best-practices/...` — single source of truth for things
  multiple skills cite.
