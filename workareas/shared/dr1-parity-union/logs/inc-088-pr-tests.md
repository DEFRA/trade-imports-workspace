## What broke

EUDPA-378 (increment inc-088, frontend PR
[DEFRA/trade-imports-animals-frontend#234](https://github.com/DEFRA/trade-imports-animals-frontend/pull/234))
makes the "Number of animals" box on the consignment-details page
save-blocking, one rule per commodity line, with the message "Enter the
number of animals". Before that change the page accepted a blank count
and handed straight back to the task list; the notification was only
refused much later, at the review gate.

Four E2E tests relied on that blank save to reach the page they were
actually testing. They now sit on the consignment-details page with the
error summary showing, and time out on the next assertion. From the
frontend PR's E2E run
([shard 1 of 3](https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/33756040602)),
`test-results/.../error-context.md` shows the page holding with:

```
- alert:
  - heading "There is a problem" [level=2]
  - list:
    - listitem:
      - link "Enter the number of animals":
        - /url: "#numberOfAnimalsQuantity-0"
```

Failing tests:

- `tests/e2e/features/additional-details-scope.spec.ts:4` — unweaned-animals scope
- `tests/e2e/features/animal-identifiers-conditional.spec.ts:4` — typed identifier surface
- `tests/e2e/features/animal-identifiers-conditional.spec.ts:61` — free-text fallbacks
- `tests/e2e/features/cph-scope.spec.ts:4` — CPH scope

## What changed

- `page-objects/notification/consignment-details-page.ts` — new
  `fillEveryAnimalCount(count)`, which fills the count on every commodity
  line the page is showing. The two scope specs add a line per pass, so
  the page carries the earlier lines too, and `numberOfAnimals` is
  ambiguous under strict mode once a second line is there.
- `tests/e2e/features/cph-scope.spec.ts`,
  `tests/e2e/features/additional-details-scope.spec.ts` — their
  `addCommodity` helpers fill every count before saving; the stale
  comments claiming the counts are submit-enforced are corrected.
- `tests/e2e/features/animal-identifiers-conditional.spec.ts` — both
  tests declare a count of 2 before saving. Two rather than one so the
  identifier form stays open after the first record is committed; at the
  declared count the maximum-reached state replaces the form, which is
  `animal-identifiers-cap.spec.ts`'s subject, not this spec's.

No assertion is relaxed, skipped or removed. Each spec still proves the
same scope and identifier-surface behaviour; it just answers a question
the page now insists on.

## Verification

`npm run typecheck` and `npm run lint` clean. All four tests run green
locally against the stack with the frontend on the branch image
`defradigital/trade-imports-animals-frontend:feat-eudpa-378-frontend-lets-a-user-leave-every-number`
(confirmed to carry the new `requiredIntegerInRange` rule):

```
4 passed (12.8s)
```

## Provenance

- Increment: inc-088 (`workareas/shared/dr1-parity-union/backlog.json`)
- Ticket: EUDPA-378
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#234
- Same branch name in both repos, per workspace rule 2 (cross-repo branch parity).
