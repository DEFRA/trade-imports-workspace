## What and why

Increment `inc-107`, ticket **EUDPA-500**, DR1 parity.

DR1 asks nothing at all about identifying a commodity that has no identifier type of its own. The frontend does the opposite: a commodity on none of the four identifier allowlists (Fish, of the five the frontend offers) falls back to two free-text boxes — "Identification details" and "Animal description" — and the person must still enter one record per animal counted before the task can complete.

This drops the free-text fallback and makes the identification page conditional on there actually being something to identify.

## Changes

- **Obligations** — remove the `identificationDetails` and `description` obligations that applied by the inverse gate in `src/server/app/sets/live-animals/obligations/sections/commodities/identifiers.js`, so a commodity off all four identifier allowlists now renders no identifier fields at all.
- **Page and journey** — the animal identification page is conditional on at least one commodity line carrying a typed identifier. The controller redirects on to additional details, the journey step and its hub task row drop out.
- **Completeness** — the completeness invariants and the unit-record count rule no longer demand a record for a line that has no identifier obligation able to satisfy it (a fish line would have had no obligation able to satisfy the at-least-one-identifier rule once the fallbacks are gone).
- **Tests and fixtures** — bridge applicability, completeness, reachability, task-row, notification-mapper and characterisation fixtures updated to match, plus new invariants coverage for the no-typed-identifier case.

## Falsified by

A free-text identification or description field rendered on any DR1 identification panel, or a DR1 identification panel rendered for a commodity whose identifier list is empty.

## Scope

Frontend only. The increment branched the tests repo as well but changed nothing there, so no tests-repo PR accompanies this one.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
