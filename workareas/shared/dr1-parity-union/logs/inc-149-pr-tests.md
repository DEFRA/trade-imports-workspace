## What broke

The frontend change for EUDPA-577 (DEFRA/trade-imports-animals-frontend#318, increment `inc-149`)
makes the Check your answers page render its Documents section unconditionally. Documents are
optional, so nothing uploaded is the ordinary case: the section now stands with an empty
"Uploaded documents" card and its Change link, so a trader who has uploaded nothing still sees
documents named on the page they are told to check, and still has a route to the upload page.

Two specs in this repo still asserted the old behaviour — that the section is dropped when the
collection is empty — and so failed the frontend PR's E2E run:

- `tests/e2e/features/hub-groups-and-cya-rows.spec.ts:50` — `'4. Documents'` heading expected count 0, received 1
- `tests/e2e/pages/notification-view-states.spec.ts:18` — the same, on the DRAFT view state

## What changed

Both specs now assert the new, intended behaviour rather than the old one:

- the `4. Documents` heading is visible
- the `Uploaded documents` summary card carries the empty line "You have not added any documents yet."
- on the completed journey, the `Change documents` link is offered

No assertion was weakened, skipped or removed — each `toHaveCount(0)` became a positive
assertion about what the page must now show.

## Where it belongs

- Ticket: EUDPA-577
- Increment: `inc-149` (dr1 parity union, slice `review`)
- Paired frontend PR: https://github.com/DEFRA/trade-imports-animals-frontend/pull/318
- Same branch name in both repos, per the workspace cross-repo branch-parity rule — the frontend
  E2E workflow probes for a branch-tagged `trade-imports-animals-tests` image, so these specs only
  reach that run once this branch publishes one.

## Verification

- `npm run typecheck` — clean
- `eslint` on both changed specs — clean
- `prettier --check` on both changed specs — clean
- The frontend unit and FIT suites covering the same behaviour pass on PR #318.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
