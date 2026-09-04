## What broke

`frontend / E2E Tests` on [trade-imports-animals-frontend#247](https://github.com/DEFRA/trade-imports-animals-frontend/pull/247) went red (run 33885727188, shard `e2e (1, 3)`):

```
[e2e] › tests/e2e/features/animal-identifiers-conditional.spec.ts:4:3
Error: locator.selectOption: Test timeout of 30000ms exceeded.
  - waiting for getByLabel('Country')
> 50 |     await pages.page.getByLabel('Country').selectOption('United Kingdom');
```

Failed on the first run and on retry #1; 1 failed, 59 passed.

The frontend PR removes the mandatory "Country" select from the animal permanent
address block, because Design release 1 asks for eight fields and no country: the
page has already said the address is somewhere the animal will permanently reside
and can be checked by APHA, so there is nothing to choose. The E2E spec still
filled that select, so it waited the full 30 seconds for a control that is no
longer rendered.

## What changed

`tests/e2e/features/animal-identifiers-conditional.spec.ts`:

- Removed the `getByLabel('Country').selectOption('United Kingdom')` step from
  the permanent-address fill. The eight remaining fields are untouched and still
  commit the record.
- Added `await expect(pages.page.getByLabel('Country')).toHaveCount(0)` alongside
  the other field-visibility assertions, so the spec now proves the block carries
  no country control rather than merely no longer touching one.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run format:check` in this repo — all clean.
- `npm run test:fit -- .../commodities/fit/identification.fit.spec.js` in the
  frontend on the same branch — 38 passed, including the whole permanent-address
  validation set, confirming the block renders and validates with eight fields
  and no country.

## Increment

Increment inc-066, ticket EUDPA-400. Pairs with
[trade-imports-animals-frontend#247](https://github.com/DEFRA/trade-imports-animals-frontend/pull/247)
and must merge with it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YNp6QZFGArtcNsfecKgWLo
