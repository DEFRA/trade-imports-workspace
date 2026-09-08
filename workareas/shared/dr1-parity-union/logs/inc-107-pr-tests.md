## What broke

The frontend PR for this increment ([animals-frontend #271](https://github.com/DEFRA/trade-imports-animals-frontend/pull/271)) drops the free-text identification fallback, so a commodity on none of the identifier allowlists — Fish, of the five the service offers — is asked for nothing, and a consignment where no commodity carries a typed identifier never renders the identification page at all.

`tests/e2e/features/animal-identifiers-conditional.spec.ts` still asserted the fallback. Its second test drove a Fish-only notification to the identification page and expected the "Identification details" and "Animal description" boxes, so the workspace E2E went red on shard 1 of the frontend PR:

```
expect(pages.animalIdentification.heading).toBeVisible()
Locator: getByRole('heading', { name: 'Identification details', level: 1 })
```

The page had carried the request on instead of rendering — which is the new behaviour working, not a defect.

## What changed

- Replaced the fish free-text test with the behaviour that replaced it: a mixed **Cow + Fish** consignment renders a panel for the Cow line (its ear tag, headed "Enter details for Bos taurus") and no panel for the Fish one, with no free-text stand-in on the page.
- Added the whole-consignment case: on a **Fish-only** notification a request for the identification page carries the person on rather than rendering. Reached from the hub, the onward step is the hub, so the assertion is that the identification page is never shown and no free-text field appears — it does not pin the destination, which depends on where the request came from.
- Tightened the cats test's two fallback assertions from `toBeHidden()` to `toHaveCount(0)` — the fields no longer exist rather than being gated off — and corrected the comment that had explained them by the now-deleted `notInUnionOf` gate.

No test was weakened, skipped or deleted: the fallback assertions are replaced by assertions on the behaviour that supersedes them.

## Verification

`playwright test --config=playwright.docker-compose.config.ts tests/e2e/features/animal-identifiers-conditional.spec.ts --project=e2e` against the workspace stack running the frontend branch: **3 passed**. `npm run typecheck`, `npm run lint` and `npm run format:check` all clean.

## Where this belongs

Increment `inc-107`, ticket **EUDPA-500**. Merges with [DEFRA/trade-imports-animals-frontend#271](https://github.com/DEFRA/trade-imports-animals-frontend/pull/271) — same branch name, cross-repo branch parity.

The hub task row for identification is deliberately left alone: it still shows (as Completed) for a Fish-only consignment, and dropping it is the neighbouring increment's finding, `hub--identification-task-always-shown`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
