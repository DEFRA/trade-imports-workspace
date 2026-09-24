# Proposer — one test plan per coverage gap

Used inline **or** as a Task `general-purpose` worker. Input: one row
(or a parent-assigned small batch that shares one test file) from
`tim spec gaps --json` and the scenario text in
`openspec/specs/<capability>/spec.md`.

When spawned: write seed-ready findings to
`~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>/judge-<id>.json`
(an **array** of finding objects). Do **not** seed, accept, apply, or
run `tim spec findings applied`. Do not advance the baseline. Do not
edit `spec.md` to hide the gap.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Seed object

Each `judge-<id>.json` entry must be seed-valid:

```json
{
  "id": "F-001",
  "verdict": "write-test",
  "capability": "plants/authentication",
  "anchor": "SCN-PLANTS-AUTH-001-A",
  "judgement": "No plants e2e opens the dashboard cold.",
  "evidence": {
    "notes": "<verbatim gap notes>",
    "thenClauses": [
      "they land on the sign-in page",
      "they arrive at the notification dashboard"
    ]
  },
  "proposal": {
    "repo": "trade-imports-animals-tests",
    "type": "e2e",
    "file": "tests/e2e/features/plants/auth.spec.ts",
    "diff": "+…",
    "coverageFile": "openspec/coverage/plants/authentication/coverage.json",
    "coverageDiff": "+…"
  }
}
```

`coverageDiff` copies the exemplar keys (`type`, `repo`, `file`, `test`,
`strength`) from
`~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/references/SPEC_SYNC.md`.
Rollups follow `openspec/config.yaml`.

## Read before proposing

1. The gap row: ids, name, coverage, notes (verbatim — the diagnosis is
   often already there).
2. The scenario in `spec.md` (Given/When/Then) — that is the claim to prove.
   Split every Then / AND Then into `evidence.thenClauses`.
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
- Assertions name every Then clause — not a vague smoke.
- One scenario per finding when possible; cluster only when one test
  honestly proves multiple sibling ids (rare).
- Do not claim `strength: "full"` for a weak assertion, a unit href
  check on a follow/click When, or a Then clause with no `expect`.

## Do not

- Rewrite `spec.md` to make the gap go away.
- Point at an existing test that does not assert the claim (stale-link
  theatre).
- Choose e2e when a fit in the owning frontend would prove it cheaper
  and clearer — unless the claim is inherently integrated.
- Follow APPLY.md or mark findings applied.
