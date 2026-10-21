# Planner — produce an implementation plan

Role: Analyse the ticket and record the decisions an implementor needs.
**No implementation work.**

A plan holds **decisions, homes and owners**. It never writes code
text: no new names, comments, JSDoc or Javadoc, test titles, log
message strings or code bodies. The implementor chooses those, against
the house rules in
`~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`.
Plans that write code text are the main way poor names, stale comments
and history get into this codebase: the implementor copies them and
nobody reviews them.

Mark uncertainty with `[ASSUMPTION]` and `[NEEDS VERIFICATION]`.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Workflow

### 1. Gather Context

One dispatch — fetches the ticket, comments, Confluence references, and
(if `--repos` is passed) per-repo detect-tech + best-practices bundles.
Reads `workareas/ticket-planning/EUDPA-XXXXX/{ticket.md,.plan-meta.json,best-practices/<repo>.md}`
when done.

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-plan.sh EUDPA-XXXXX
```

Or, if the affected repos are already known up front:

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-plan.sh EUDPA-XXXXX --repos trade-imports-animals-frontend,trade-imports-animals-backend
```

### 2. Explore Codebase

Find: similar functionality, services involved, integration points,
configuration, and the **existing owner** of every rule or mechanism
the ticket touches. Read each owner's own docs and comments; if it
states a design, the plan follows it or quotes it and says why not.

Read the repo's `docs/`, recipes (`add-a-*.md` and similar) and layer
rules before deciding where anything goes.

Tech + best-practices are already baked in `.plan-meta.json` and
`best-practices/<repo>.md` for the repos you passed. If you discover
further repos in scope, re-run `prepare-plan.sh --repos` to refresh.

### 3. Decide

When a cleaner option costs nothing extra — same complexity, no new
dependency, a documented framework feature — choose it now. Do not
park it as "consider later" or "defer unless the reviewer flags it".
Keep open questions for genuine trade-offs that need a person to
decide.

Example: a plan read a file upload with
`new ByteArrayResource(file.getBytes())` and listed
`MultipartFile.getResource()` as a later alternative. The alternative
streams from disk and already reports the file name and length. It had
no downside, so it was the plan.

### 4. Create Plan

Create: `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md`

```markdown
# Implementation Plan: EUDPA-XXXXX

**Ticket:** [Summary]
**Date:** [Date]
**Confidence:** High (clear examples) / Medium (some extrapolation) / Low (significant assumptions)

## Summary
[2-3 sentences: what changes for the user or the system]

## Repositories & Tech Stack

| Repository | Changes | Technologies | Best Practices |
|------------|---------|--------------|----------------|

## Decisions
### D1. [The decision, in one sentence]
**Why:** [Reason]
**Option not taken:** [Only for a genuine trade-off; say what it would cost]

## Homes
[For each new constant, registry entry, argument, route or helper: the
existing mechanism it goes through, with file:line. Describe its job,
not its name. If it departs from what that code says about its own
design, quote the code and give the reason.]

| What it does | Goes through | Departure (if any) |
|--------------|--------------|--------------------|

## Rule owners
[One function owns each display or business rule. Name the existing
owner (file:line) or the module a new one belongs in. For twin repos,
one owner in each twin.]

## Test support
[The shared helper each new test extends: for example
`engine/test-support.js`, `fit/<set>-journey.js`,
`flows/<domain>/journey.ts`, or the repo's integration-test base
class. Set-up used by two tests goes in the shared helper.]

## Tests
[Each test as the behaviour it proves plus the production line whose
removal turns it red. No titles or bodies.]

| Behaviour proved | Fails without (file:line) | Test file |
|------------------|---------------------------|-----------|

## Operability
[Every branch that changes an outcome — refusal, redirect, retry,
fallback, state switch — and the ids its log line must carry. No
message text.]

## Docs this makes untrue
[The grep you ran over recipes, `docs/`, JSDoc, Javadoc and test names
for the behaviour you change, and an edit for each hit. Or "None"
plus the grep.]

## Departures from written rules
[Quote the rule, give the reason. Or "None".]

## Verification
[Unit tests, lint, and the E2E suite (`npm run test:docker-compose` in
the tests repo). If a behaviour has no E2E cover, add or extend a spec
in Tests above. No manual browser steps.]

## Configuration
| Variable/Flag | Purpose | Where Defined |
|---------------|---------|---------------|

## Open questions
[Only trade-offs that need a person to decide.]

| Question | Options and cost | Severity |
|----------|------------------|----------|

## References
- `path/to/Similar.java` - [What it does]

## Deferred to caller ticket
- [What it would be, and which ticket has the real caller.]
```

### 5. Scope-in-caller gate

Before finalising the plan, walk every new export, function, module,
config key and regex change against this question:

> *Does an in-tree caller land in the same PR that consumes this?*

If the answer is "no", "a future ticket", "so `EUDPA-XXX` can consume it",
or "as groundwork for X" — the item **does not ship in this PR**. Move
it to `## Deferred to caller ticket` and let the ticket with the real
caller add it. This applies to functions **and** to smaller pieces of
speculative defence (regex characters that guard shapes no in-tree
code produces, config keys nothing reads, branches for states the
service cannot reach yet).

Rationale: CLAUDE.md's *"don't design for hypothetical future
requirements"*. "Blocks EUDPA-YYY" in a Jira ticket is a dependency
relationship, not an implementation directive — YYY needs the
delimiter / schema decision, not helper functions.

**Worked example (EUDPA-349):**
A plan proposed format and parse helpers in `bridge/fulfilment-id.js`
"as groundwork for EUDPA-333". No in-tree caller existed. The composite
public shape was in scope (the ticket AC says the format), but the
helpers were not — EUDPA-333 adds them when it wires the shape into a
URL boundary. The plan then added `:` to a `FIELD_UNSAFE` regex purely
to defend that same speculative shape. This gate catches both.

### 6. Review the plan

Before any code exists, run a separate review pass over `plan.md`
against
`~/git/defra/trade-imports-workspace/.claude/skills/ticket/assets/plan-review-checklist.md`.
Read the plan as a reviewer would, not as its author: open each
file:line it cites and each owner it names. Fix every failed item in
the plan, then record the result under `## Plan review` at the foot of
`plan.md`: each item passed, or what you changed.

Review stays at full strength. Never skip an item because the plan
"looks simple".

## Output

```
Plan created: ~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md
Repos: [list] | Decisions: [X] | Confidence: [level]
Items needing verification: [X]
Plan review: [passed / N items fixed]
```

## Don'ts

- Don't implement — plan only.
- Don't write code text: no new names, comments, test titles, log
  strings or code bodies. Describe the job; the implementor names it.
- Don't defer a better option that costs nothing. Decide.
- Don't skip uncertainty markers.
- Don't add a second mechanism beside an existing owner. Route through
  the owner, or quote its design and say why not.
- Don't propose new exports, functions, modules, or regex tweaks
  without naming the in-tree caller they land with in this PR
  (see the Scope-in-caller gate above). "Groundwork for EUDPA-XXX"
  is not a caller.
- Don't write manual browser checks into Verification. Add or extend
  an E2E spec.
- Don't carry ticket keys, backlog ids or "removed" wording into
  anything the implementor will turn into code or test titles. State
  the end state.
