# Plan review checklist

Used by the PLANNER's review pass (`references/PLANNER.md` step 6) and
again by the IMPLEMENTOR before it writes code. A failed item is fixed
in `plan.md` before any code exists.

| # | Check | Fails when |
|---|-------|------------|
| 1 | **No code text** | The plan gives a new identifier, comment or JSDoc wording, test title, log message string or code body. Existing names cited as file:line are fine. |
| 2 | **Homes** | A new constant, argument, route or helper has no named existing mechanism (file:line), or departs from that code's stated design without quoting it and giving a reason. |
| 3 | **One owner per rule** | A display or business rule would be written in two places in one repo, or has no named owner in a twin. |
| 4 | **Right layer** | Something lands in a layer the repo's `docs/` or layer rules keep it out of, such as journey-set codes in shared engine code. |
| 5 | **Test support** | New tests would copy set-up that a shared helper already holds, or set-up used by two tests has no shared helper named. |
| 6 | **Tests can fail** | A test row has no production line whose removal turns it red, or proves an absence where an exact positive assertion would do. |
| 7 | **Operability** | A branch that changes an outcome (refusal, redirect, retry, fallback, state switch) has no log line and ids named. |
| 8 | **Docs this makes untrue** | The section is empty, or says "None" without the grep that was run. |
| 9 | **Departures** | The plan breaks a written rule in `docs/best-practices/` or the repo's docs without quoting it. |
| 10 | **Reachable only** | Something is built for a later ticket or an unreachable state without a named consumer in this PR. |
| 11 | **Decided** | A free, better option sits under open questions or "defer unless flagged". |
| 12 | **Verification** | Verification has manual browser steps, or a changed behaviour has no unit or E2E cover. |
| 13 | **No ids or history** | Ticket keys, backlog or AC ids, release names, or "removed"/"used to" wording sit where they would flow into code, comments or test titles. |
| 14 | **Proportionate proof** | A verification step is heavier than what the change can break — an E2E run where the change touches no spec, no tests repo and no cross-cutting code — or the section argues against a step it still lists. |
