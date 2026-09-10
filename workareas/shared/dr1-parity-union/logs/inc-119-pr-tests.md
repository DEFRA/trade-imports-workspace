## What broke

The E2E shard on the frontend PR
[DEFRA/trade-imports-animals-frontend#305](https://github.com/DEFRA/trade-imports-animals-frontend/pull/305)
went red:

```
✘ tests/e2e/pages/transited-countries.spec.ts:36:3
  Transited countries page › shows an error summary when submitted empty
  expect(getByRole('heading', { name: 'There is a problem' })).toBeVisible()
  element(s) not found
```

That test asserts the rule the frontend PR deliberately removes. Design
release 1 asks rail and road consignments which countries they will travel
through, and accepts no answer: the handler saves an empty list and the
section's completeness check returns true. The frontend now matches — the
transit-countries obligation keeps `inScope: true` for rail and road but drops
`status: 'mandatory'`, and the "Select at least one country the consignment
will travel through" message goes with it.

The E2E run took the tests image `:latest` ("Tests image: latest (no branch
tag)"), because this repo had no branch of the same name, so the suite
asserting the old rule ran against the new frontend.

## What changed

- `tests/e2e/pages/transited-countries.spec.ts` — `shows an error summary when
  submitted empty` is replaced by the behaviour that took its place:
  continuing with no country saves the empty list, moves on to the transporter
  page, and the list is still empty on return. The error-summary case now
  covers the error the page can still produce — pressing **Add country** with
  no country chosen, which shows "Enter a country to add".
- `tests/a11y/notification-journey-error-state.spec.ts` — the walk-through
  reaches the transit-countries error state through **Add country** rather
  than **Save and continue**, which no longer produces one.

No assertion was weakened: the same page still has to show a GOV.UK error
summary, through the one route that can still raise one.

## Where it belongs

Increment inc-119 of the Design release 1 parity run. Ticket EUDPA-548.
Cross-repo branch parity: same branch name as the frontend PR, per CLAUDE.md
rule 2.

## Verification

- `npm run typecheck` — clean
- `npm run lint` — clean
- The E2E proof is the frontend PR's own shard, re-run once this branch's
  tests image is published.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
