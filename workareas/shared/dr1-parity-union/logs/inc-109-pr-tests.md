## What broke

The frontend PR for EUDPA-504 (DEFRA/trade-imports-animals-frontend#273, increment
inc-109 of the DR1 parity backlog) changes the in-card save button on the animal
identification page so its wording says what is left on the line:

- a line of one animal gets no in-card button at all — the page's own
  **Save and continue** captures that record;
- the last outstanding animal on a line reads **Save and finish**;
- anything else still reads **Save and add another**.

Three E2E specs in this repo still spoke the old wording, so two shards of the
frontend PR's E2E run went red on a control that is no longer rendered:

- `tests/e2e/pages/animal-identification.spec.ts:8` — asserted the
  **Save and add another** button was visible on a single-animal line
  (`journey.toAnimalIdentification()` declares a count of 1). Element not found.
- `tests/e2e/features/animal-identifiers-cap.spec.ts:37` — clicked
  **Save and add another** for the second of two animals, which is the last
  outstanding record and now reads **Save and finish**. `locator.click` timed out.

## What changed

- `page-objects/notification/animal-identification-page.ts` — a `saveAndFinish`
  locator alongside the existing `saveAndAddAnother`.
- `tests/e2e/pages/animal-identification.spec.ts` — the single-animal line asserts
  the in-card button is absent (`toHaveCount(0)`) and that **Save and continue**
  is what captures the record. The page-level control is still asserted, so the
  test has not been weakened — it now describes the behaviour DR1 specifies.
- `tests/e2e/features/animal-identifiers-cap.spec.ts` — the second record is
  committed through **Save and finish**. Every other assertion in that spec is
  untouched.

`tests/e2e/features/animal-identifiers-conditional.spec.ts` keeps its
**Save and add another** clicks: that line is two cats with no record saved, so
two remain outstanding and the wording is unchanged there.

Verified locally: `npm run typecheck`, `npm run lint` and `npm run format:check`
all clean.

## Where it belongs

- Ticket: EUDPA-504
- Increment: inc-109 (dr1-parity-union backlog)
- Pairs with: DEFRA/trade-imports-animals-frontend#273 — same branch name, per the
  cross-repo branch parity rule.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
