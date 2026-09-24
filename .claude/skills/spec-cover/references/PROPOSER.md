# Proposer — one test plan per coverage gap

Used inline **or** as a Task `general-purpose` worker. Input: one row
(or a parent-assigned small batch that shares one test file) from
`tim spec gaps --json` and the scenario text in
`openspec/specs/<capability>/spec.md`.

When spawned for auto-cover: follow this file then
[`APPLY.md`](APPLY.md) for your gaps — write the test, update coverage,
lint, and drop a summary at
`~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>/judge-<id>.json`
(finding shape for the parent to seed / mark applied). Do not advance
the baseline. Do not edit `spec.md` to hide the gap.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Read before proposing

1. The gap row: ids, name, coverage, notes (verbatim — the diagnosis is
   often already there).
2. The scenario in `spec.md` (Given/When/Then) — that is the claim to prove.
3. Nearby tests in the likely repo (same feature folder, sibling fit/e2e)
   so the new test matches local style.
4. Existing links on the scenario in `coverage.json` — strengthen means
   adding or upgrading, not inventing a parallel dead link.

## Pick the suite

| Prefer | When |
|---|---|
| **fit** | Page shape, copy, field behaviour under stub services |
| **e2e** | Cross-service path, auth, lifecycle, submit refusal |
| **unit** | Pure gate / rollup / helper — never as the only witness for a product claim if fit/e2e is possible |

Repo follows the link convention already used in that capability's
coverage (animals-frontend fit, animals-tests e2e, plants-frontend, etc.).

## Verdict

- **write-test** — `none`, or partial with no usable witness
- **strengthen** — partial with a weak witness; proposal adds assertions
  or a higher-tier test and upgrades strength toward `full`
- **accept-gap** — only when covering is wrong (obsolete scenario, blocked
  dependency). Prefer improving `notes` over silent ignore. Judgement must
  say why.

## Proposal quality bar

- Title exact and stable (lint resolves exact titles).
- Assertions name the scenario's Then — not a vague smoke.
- One scenario per finding when possible; cluster only when one test
  honestly proves multiple sibling ids (rare).
- `coverageDiff` adds a link object matching SPEC_SYNC.md shape, and
  sets scenario `coverage` / `strength` consistently with rollup rules.

## Do not

- Rewrite `spec.md` to make the gap go away.
- Point at an existing test that does not assert the claim (stale-link
  theatre).
- Choose e2e when a fit in the owning frontend would prove it cheaper
  and clearer — unless the claim is inherently integrated.
