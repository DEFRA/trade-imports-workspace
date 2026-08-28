## What broke

The E2E shard `e2e / e2e (3, 3)` dispatched from frontend PR
[#215](https://github.com/DEFRA/trade-imports-animals-frontend/pull/215)
(run 33181499717, job 98883580110) failed on first attempt and retry:

```
tests/e2e/visual/origin-of-import.visual.spec.ts:12:3
  > Origin of import (visual regression)
  > shows expected page appearance on first load @visual

expect(page).toHaveScreenshot('origin-of-import.png')
Expected an image 1280px by 1332px, received 1280px by 1282px.
75741 pixels (ratio 0.05 of all image pixels) are different.
```

This is not a defect in the frontend change. EUDPA-353 removes the two-step
breadcrumb trail ("Your notifications > Origin of the import") that sat between
the phase banner and the back link on almost every page, to match Design
release 1, which carries no breadcrumbs anywhere in the service. The page is
therefore 50px shorter than the committed Linux baseline, which still shows the
trail.

## What changed

One file: the Linux visual baseline
`tests/e2e/visual/origin-of-import.visual.spec.ts-snapshots/origin-of-import-e2e-linux.png`.

Recaptured in the Linux container (`mcr.microsoft.com/playwright:v1.61.1-jammy`)
via `npm run test:visual:update:linux`, against the workspace stack running the
frontend's branch image
`defradigital/trade-imports-animals-frontend:feat-eudpa-353-the-frontend-puts-a-breadcrumb-trail-abo`,
confirmed to render no breadcrumb.

The new baseline is 1280x1282 — the exact size CI reported receiving. The only
difference from the old baseline is the breadcrumb trail removed, with
everything below shifted up 50px. Service navigation (Dashboard, Address book,
Manage account, Log out), the Alpha phase banner, the back link, the "About the
consignment" caption, the heading, country select, region radios,
internal-reference input, both buttons, the cancel link and the footer are all
unchanged.

Verified by re-running the spec against the new baseline
(`--update-snapshots=none`): 1 passed.

The macOS baseline is deliberately left alone. It has been stale since EUDPA-334
added the phase banner and is not what CI compares against; refreshing it needs
a separate headless macOS capture.

No test was weakened, skipped or deleted, and no check was disabled.

## Where this belongs

- Ticket: EUDPA-353
- Increment: `inc-001` of the DR1 parity union backlog
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#215 (same branch name,
  per the workspace cross-repo branch-parity rule)
