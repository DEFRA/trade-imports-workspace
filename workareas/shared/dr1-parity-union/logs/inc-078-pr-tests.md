## What broke

Increment **inc-078** (EUDPA-367) raised the origin page's three question
labels from the small size to the medium size in
`trade-imports-animals-frontend`
([PR 225](https://github.com/DEFRA/trade-imports-animals-frontend/pull/225)):
`govuk-label--m` on the country of origin autocomplete,
`govuk-fieldset__legend--m` on the region-of-origin radios legend, and a
size class on the internal reference label that previously carried none.

That makes the origin page 55px taller, so the committed visual baselines in
this repo no longer matched and the E2E visual regression spec failed on that
PR:

```
tests/e2e/visual/origin-of-import.visual.spec.ts:17:3
  Origin of import (visual regression) > shows expected page appearance on first load @visual
  Expected an image 1280px by 1362px, received 1280px by 1417px.
  74868 pixels (ratio 0.05 of all image pixels) are different.
```

The rendered page is correct — the change is the intended one. The baselines
were stale.

## What changed

Regenerated both platform baselines against the branch-tagged frontend image
(`defradigital/trade-imports-animals-frontend:feat-eudpa-367-...`), using the
repo's own documented commands:

- `origin-of-import-e2e-linux.png` — `npm run test:visual:update:linux`
  (the container-rendered image CI compares against)
- `origin-of-import-e2e-darwin.png` — `npm run test:visual:update:macos`
  (the host-rendered image local runs compare against)

Both were then re-run **without** `--update-snapshots` and pass: 1 passed on
darwin on the host, 1 passed on linux inside the Playwright container.

No spec, mask, threshold or grep was changed — only the two baseline images.

## Increment and ticket

- Increment: `inc-078`
- Ticket: EUDPA-367
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#225
- Branch parity: same branch name in both repos, per CLAUDE.md rule 2.
