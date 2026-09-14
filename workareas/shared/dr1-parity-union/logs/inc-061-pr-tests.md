## What broke

The frontend PR for this increment
([DEFRA/trade-imports-animals-frontend#332](https://github.com/DEFRA/trade-imports-animals-frontend/pull/332))
changes the row label inside the check-answers card
"Contact address for this consignment" from the shared generic `address`
string ("Address") to a new `contactAddress` string ("Contact address"),
matching DR1.

`tests/e2e/features/hub-groups-and-cya-rows.spec.ts:110` looked the row up by
its old exact key:

```ts
await expect(value(contactAddress, 'Address')).toContainText('Animal and Plant Health Agency')
```

`value()` filters `.govuk-summary-list__row` by `getByText(key, { exact: true })`,
so with the label renamed the row locator resolved to nothing and the
assertion timed out after 5s. That failed the frontend PR's E2E job on the
original run and on retry #1 (1 failed / 86 passed).

Note for the record: the failure is the **row** label, not the card title.
The card title "Contact address for this consignment" is unchanged by the
frontend commit, and the `summaryCard(...)` lookup on line 109 still matches.

## What changed

One line — the spec now looks the row up by its new key `'Contact address'`.
No assertion is weakened, skipped or removed: the value check on
"Animal and Plant Health Agency" is untouched, and nothing else in the spec
moves.

Verified locally with `npm run typecheck` and `npm run lint` (both clean).
The behavioural proof is the frontend PR's E2E job, which runs this spec
against the PR image and picks this branch up by name.

## Where it belongs

- Increment: `inc-061`
- Ticket: EUDPA-591
- Paired with: DEFRA/trade-imports-animals-frontend#332 (same branch name,
  cross-repo branch parity)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
