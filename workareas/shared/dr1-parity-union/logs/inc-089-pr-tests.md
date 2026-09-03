## What broke

Frontend PR [DEFRA/trade-imports-animals-frontend#239](https://github.com/DEFRA/trade-imports-animals-frontend/pull/239)
(EUDPA-392, increment inc-089) renames the commodity package-count label from
`Number of packages (optional)` to `Number of packages (when required)`, to match
Design release 1.

The `ConsignmentDetailsPage` page object still looked the field up by the old
label:

```ts
get numberOfPackages(): Locator {
  return this.page.getByLabel('Number of packages (optional)');
}
```

So on that PR the workspace E2E run
([33795997278](https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/33795997278))
failed 75 tests across the three shards — every journey that fills in a commodity
line, plus everything downstream of it (persistence round-trips, transit scope,
hub/CYA). The logs show the cause on each one:

```
- waiting for getByLabel('Number of packages (optional)')
```

## What changed

One line: point `numberOfPackages` at `Number of packages (when required)`.

No test was weakened, skipped or deleted — the locator now names the label the
application renders.

## Verified

- `npm run typecheck` — clean
- `npm run lint` — clean
- No other reference to the old label anywhere in this repo
  (`hub-groups-and-cya-rows.spec.ts` asserts the summary-row key
  `Number of packages`, which the rename does not touch).

## Belongs to

- Ticket: EUDPA-392
- Increment: inc-089 (dr1-parity-union backlog)
- Paired with: DEFRA/trade-imports-animals-frontend#239 — same branch name,
  per the cross-repo branch parity rule. Both need to land.
