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
because it pins the working directory to the workspace root rather than
relying on the OpenSpec CLI's upward search from the caller's cwd.

Nothing else. The recipes in the frontend repo are the instructions; the
ladder is plain npm scripts. The set→namespace lookup and the AREA-code
collision check are one `grep` each against files `grep` is already
allowlisted for — scripting those would duplicate what the repo and
`AREAS.md` already own (patterns.md §2 trap).

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

**Consequence — two checkouts.** The spec lives in the workspace repo, the
code in the target repo. Step 5.8 leaves the spec write staged-not-committed
and the Completion output names both sides. No skill commits the workspace
repo; `journey-builder`'s `commit-increment.sh` is unchanged.
