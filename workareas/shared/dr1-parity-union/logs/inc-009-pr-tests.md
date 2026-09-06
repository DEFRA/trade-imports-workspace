## What broke

The E2E job on the frontend PR
(DEFRA/trade-imports-animals-frontend#253, run 33923307791) failed:

```
tests/e2e/features/animal-identifiers-conditional.spec.ts:4:3
  Test timeout of 30000ms exceeded.
  Error: locator.fill: Test timeout of 30000ms exceeded.
    - waiting for getByLabel('Postal or zip code')
  > 53 | await pages.page.getByLabel('Postal or zip code').fill('BD23 1UD');
```

The frontend PR renames the two permanent address labels on the animal
identification card to match Design release 1 — "Postal or zip code"
becomes "Postcode or Zip code" and "Telephone number" becomes "Phone
number" — and adds the hint "For international numbers include the
country code" to the phone field. The E2E spec still filled the old
labels, so the two `getByLabel` locators no longer resolved.

## What changed

`tests/e2e/features/animal-identifiers-conditional.spec.ts` — the two
fills in the permanent address block now use the new labels. Nothing
else: no assertion weakened, no test skipped.

The private transporter spec (`private-transporter-scope.spec.ts`) still
uses the old labels on purpose. That form keeps its own copy of them in
the transport feature copy, which this increment does not touch; inc-116
changes them there and will bring that spec with it.

## Verification

- `npm run typecheck` — clean
- `npm run lint` — clean
- The E2E job on the frontend PR is what proves the fix end to end: the
  failing run reported `Tests image: latest (no branch tag)`, so it ran
  the old spec. With this branch pushed, the branch-tagged tests image
  is built and the frontend E2E picks it up.

## Increment and ticket

- Increment: inc-009 (dr1-parity-union backlog)
- Ticket: EUDPA-405
- Paired frontend PR: https://github.com/DEFRA/trade-imports-animals-frontend/pull/253

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01QU1nK61XsgdY25ueTiqM45
