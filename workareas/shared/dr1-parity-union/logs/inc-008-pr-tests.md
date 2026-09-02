## What broke

Increment inc-008 (ticket EUDPA-366) changes the frontend so Origin of the import
draws the status strip — the blue `Draft` tag and the notification reference —
from the first request, instead of withholding both until the first answer has
been saved. Design release 1 shows them from that page onwards; the frontend did
not.

Two E2E tests in this repo still encoded the old behaviour, so the frontend PR's
E2E job went red on
[DEFRA/trade-imports-animals-frontend#224](https://github.com/DEFRA/trade-imports-animals-frontend/pull/224):

- `tests/e2e/features/reference-strip.spec.ts:19` asserted `toHaveCount(0)` for
  `.app-journey-strip` on the entry page before the first save.
- `tests/e2e/visual/origin-of-import.visual.spec.ts` failed its
  `origin-of-import.png` comparison: the strip inserts a band above the caption
  and pushes the rest of the page down.

## What changed

**`reference-strip.spec.ts`** — the absence assertion is exactly what the
increment falsifies, so it now asserts the opposite: on the entry page the strip
is visible, its tag reads `Draft`, and it carries the GBN-AG reference, which is
already in the page's own URL because creating the notification mints it. The
dashboard assertion is untouched — the dashboard sits outside a notification and
still has no strip. The test title no longer claims the strip is absent before
the first save.

**`origin-of-import.visual.spec.ts`** — refreshing the baseline alone would not
have held. The reference inside the strip is minted per notification, so an
unmasked strip would differ on every run and the test would go red again on the
next one. The strip is now masked. Masking the whole strip rather than the
reference alone keeps the masked box a fixed size: the strip is a full-width
block, the reference is not, so a longer or shorter reference would move the edge
of a narrower mask. The strip's own content stays covered by
`reference-strip.spec.ts` in this repo and by the frontend's `origin.fit.spec.js`.

**`page-objects/notification/origin-of-import-page.ts`** — added the
`journeyStrip` locator the mask uses, matching the getter `OverviewPage` and
`NotificationViewPage` already have.

**Baselines** — regenerated both `origin-of-import-e2e-linux.png` (via
`npm run test:visual:update:linux`, the container CI matches) and
`origin-of-import-e2e-darwin.png` (via `npm run test:visual:update:macos`).

## Verification

Run against the stack on the frontend's branch image
(`defradigital/trade-imports-animals-frontend:feat-eudpa-366-dr1-shows-the-draft-status-and-the-notif`):

- Host: both specs pass — `reference-strip.spec.ts` and the visual spec.
- Linux container, `--update-snapshots=none`: the regenerated baseline passes a
  second run against a freshly minted reference, so the mask holds rather than
  the baseline just re-recording one render.
- `npm run typecheck`, `npm run lint`, `npm run format:check` all clean.

## Provenance

Increment inc-008 of the `dr1-parity-union` backlog, ticket EUDPA-366. Pairs with
[DEFRA/trade-imports-animals-frontend#224](https://github.com/DEFRA/trade-imports-animals-frontend/pull/224)
on the same branch name.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
