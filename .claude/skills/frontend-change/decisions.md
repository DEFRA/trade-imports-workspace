# frontend-change skill — decisions

Recorded during CREATE interview. Update if a shape choice
changes; do not delete entries.

## 1. Purpose

Route a change to a frontend repo (today trade-imports-animals-frontend) (add a field, page, section, collection, or a general change to src/server/app) through the repo's own recipe docs — platform docs at src/server/app/docs, set/journey recipes at src/server/app/sets/live-animals/docs — following the matching recipe as a strict script, running the platform verification ladder, one increment then stop. For anyone (Sam or an agent) making frontend changes.

## 2. State shape

**Choice:** prose
**Pattern reference:** docs/best-practices/skills/patterns.md §1

## 3. Dispatcher

**Choice:** false
**Pattern reference:** patterns.md §2

## 4. Pre-baked context

**Choice:** false
**Pattern reference:** patterns.md §3

## 5. Worker fan-out

**Choice:** false
**Workers:** 
**Pattern reference:** patterns.md §5

## 6. Walker

**Choice:** false
**Pattern reference:** patterns.md §7

## 7. Helpers introduced

One: `tools/frontend-change/openspec-validate.sh`, added by EUDPA-574 for
Step 5.4. It exists because `npx` is not allowlisted in
`.claude/settings.json` while `tools/frontend-change/*` already is, and
because it pins the working directory to a named checkout — its `--root`
flag — rather than relying on the OpenSpec CLI's upward search from the
caller's cwd. `--root` is not a convenience: under `journey-builder` the
spec write lands in a worktree, and without it the helper would validate
the main checkout's copy of the same capability and pass green against a
file the increment never wrote.

Nothing else. The recipes in the frontend repo are the instructions; the
ladder is plain npm scripts. The capability lookup is a read of the two
tables in `references/SPEC_SYNC.md`, the leaf confirm is `ls`, and the
new-capability gates are two `grep -c` calls against `AREAS.md` — all on
commands already allowlisted. Scripting those would duplicate what the
repo and `AREAS.md` already own (patterns.md §2 trap).

## 8. Triggers

- "add a field to the frontend"
- "add a page to the frontend"
- "add a section to the frontend"
- "add a collection to the frontend"
- "change the frontend"
- "frontend-change <add-field|add-page|add-section|add-collection>"

**Disambiguation:** Targets a REAL frontend repo (today src/server/app in trade-imports-animals-frontend), not the prototype — prototype-element owns prototypes/standalone/live-animals and journey-builder owns the prototype spec/build loop. Distinct from the ticket skill (generic plan/implement for a Jira ticket): frontend-change is the recipe-following implementation path for frontend element changes regardless of ticket. No keyword overlap with built-in /init.

## 9. Behaviour-spec sync (EUDPA-574)

**Choice:** hybrid — Step 5 writes `openspec/specs/**/spec.md` and
`openspec/coverage/**/coverage.json` directly, using the merge technique
carried in `references/SPEC_SYNC.md`, and validates the spec write with
`openspec validate <path> --strict`.

**Why:** the increment already has a planning record (the ticket's AC, or
`journey-builder`'s `journey-spec.json`). Routing every increment through
OpenSpec's propose → apply → sync → archive lifecycle would create a second
one and cost several agent turns per increment across a backlog. A freehand
edit with no shared technique would let each increment drift from the last.
The hybrid keeps one planning system, gets the CLI's validation, and keeps
the OpenSpec dependency to one step and one call.

**Rejected:** freehand inline edit (no shared technique); full OpenSpec
lifecycle per increment (duplicate planning record, more turns).

**Deferred:** re-implementing `ticket`/`frontend-change`/`journey-builder`
onto the OpenSpec lifecycle so it *is* the planning mechanism. Strongest
long-term fix for the duplicate record, but a rewrite of three state
machines and a deeper bet on a fast-moving third-party tool. Its own ticket
if pursued.

**Consequence — two checkouts, and a two-caller rule.** The spec lives in
the workspace repo, the code in the target repo. Step 5 takes the **spec
root** as an input and writes there; it runs no `git add` and no
`git commit` on either checkout, on either path. Who commits afterwards
differs:

| Caller | Spec root | Committed by |
|---|---|---|
| Direct (a person, or the `ticket` skill) | `~/git/defra/trade-imports-workspace` | Nobody — written but uncommitted, named in the Completion output, the caller's to commit |
| `journey-builder` | the run's workspace worktree | `commit-increment.sh`, per increment, on `spec/<run-id>`; one PR at run end |

One rule cannot serve both. A single uncommitted-in-the-main-checkout rule
orphans a spec edit on every failed increment of a build run — the code
rolls back and the spec describing it does not, leaving a `spec.md`
asserting behaviour that exists in no repo. That is drift-by-assertion,
worse than the drift-by-omission §9 exists to stop, because it validates
green. It also leaves the main checkout dirty, which silently stalls
`tim`'s `--ff-only` auto-pull.

So `journey-builder` gained a workspace worktree, a second commit arm and
a matching rollback arm (EUDPA-574 step 9) — the per-target half of "for
free" holds, the plumbing half did not.
