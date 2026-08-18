# Team Workflow — Software & QA Engineering

## Repos

The authoritative repo map is the root [`CLAUDE.md`](../CLAUDE.md). Most tickets touch a
frontend, its backend and the matching test suite — for the animals service that is:

- `repos/trade-imports-animals-frontend` — user-facing web application
- `repos/trade-imports-animals-backend` — API / business logic service
- `repos/trade-imports-animals-tests` — end-to-end / integration test suite

Other services in the workspace follow the same shape. A single ticket may span all three;
coordinate cross-repo changes through the tests and workspace repos.


## Ticket Lifecycle

1. **Refinement** — Dev + QA agree acceptance criteria, edge cases, and test approach. Tickets that feel larger than ~3 days are split now. Tickets that would benefit from pairing are flagged here — see Pairing below. → marked **Ready for dev** and added to the JIRA board.
2. **In Progress** — Try and keep to one feature ticket per person, or a pair on a flagged ticket. Branch named per [git-conventions.md](./git-conventions.md). Developers should update any tests in `trade-imports-animals-tests` that have broken as a result of their changes.
3. **Code Review** — Aim for small PRs against `main`, clear description, tests added, CI green. See merge strategy under [Pull Requests heading of git-conventions.md](./git-conventions.md#pull-requests) 
4. **QA Verification** — Verified against acceptance criteria either in docker or deployed environments. New tests added or updated in `trade-imports-animals-tests` as needed.  Bugs go back to In Progress.
   1. It's a developer's responsibility to add the automated tests to the ticket, where they've done the dev work. 
   2. QA to review the automated tests. QA could also pair with the developer on the creation of the tests, if needed.
5. **Done** — Merged, deployed, criteria met, docs updated (if applicable).

## Pairing

Pairing is decided deliberately, not by accident. During **Refinement**, flag a ticket as a pairing candidate when it is:

- **High risk or high blast radius** — touches critical paths, auth, data integrity.
- **Architecturally unfamiliar** — no clear approach yet, or sets a pattern others will follow.
- **Knowledge-siloed** — only one person currently understands the area; pairing spreads it.
- **Good for onboarding** — pairs a newer team member with someone experienced.

A pair picks up a flagged ticket when it reaches **In Progress**. Pairing is a recommendation from refinement, not an obligation — the team confirms it when the ticket is pulled.

Alternatively, a ticket flagged for a pairing candidate can be picked up by a pair and do a technical spec/design of the implementation. This spec could then be fed into an AI for feedback and implementation.

We don't know which approach is best, but we do want to explicitly spread knowledge within the team. We'll try an approach, discuss the pros and cons, and then adopt or reject it.

## Definition of Ready
Clear testable acceptance criteria · dependencies identified · test approach agreed · feels like the development should take ~3 days or less · pairing need considered.

## Definition of Done
Reviewed & merged · tests added and passing · QA verified · docs updated · no new lint/pipeline regressions.

## Rules
- **Keep tickets small** — a ticket may span the frontend, backend, and tests repos, but anything that feels larger than ~3 days should be split. Split oversized tickets at refinement; if a ticket turns out bigger than expected once work starts, stop and have a conversation rather than letting it sprawl.
- **Limit WIP for feature tickets** — finish before starting.
- **Blockers are loud** — raise immediately, not at stand-up.
- **Flaky tests are bugs** — quarantine + ticket within 24h.
- **Break the build, fix the build** — red `main` is top priority.
- **Review PRs promptly. Name drop if not reviewed within 2h.**
- **Re-refine, don't drift** — scope change means pause and have a conversation to agree new scope.
- All changes via PR (unless it's a devx improvement to workspace repo); `main` is protected.
