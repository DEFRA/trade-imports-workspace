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

None — the skill owns no tools/ scripts. The recipes in the frontend repo are
the instructions; the ladder is plain npm scripts. Adding a dispatcher or
helpers here would duplicate what the repo already owns (patterns.md §2 trap).

## 8. Triggers

- "add a field to the frontend"
- "add a page to the frontend"
- "add a section to the frontend"
- "add a collection to the frontend"
- "change the frontend"
- "frontend-change <add-field|add-page|add-section|add-collection>"

**Disambiguation:** Targets a REAL frontend repo (today src/server/app in trade-imports-animals-frontend), not the prototype — prototype-element owns prototypes/standalone/live-animals and journey-builder owns the prototype spec/build loop. Distinct from the ticket skill (generic plan/implement for a Jira ticket): frontend-change is the recipe-following implementation path for frontend element changes regardless of ticket. No keyword overlap with built-in /init.
