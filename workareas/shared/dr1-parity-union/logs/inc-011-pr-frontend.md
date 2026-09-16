## EUDPA-612 — page titles gain the GOV.UK suffix and hyphen separators

Increment `inc-011` of the `dr1-parity-union` backlog. Ticket: **EUDPA-612**.

### Why

Every page title was composed once in the shared layout as `<page> | Import notification service`. All 33 captured frontend screens followed it, so the browser tab, the bookmark and the screen-reader page announcement never identified the service as a GOV.UK service, and used a pipe rather than the hyphen separator the GOV.UK Design System documents. DR1 titles every page `<page> - Import notification service - GOV.UK`.

Worth stating plainly: that format is the Prototype Kit's default composition rather than something DR1's designers authored, so DR1 alone is thin evidence. The change is made because it is also the GOV.UK Design System's documented title convention — and the pipe form is not.

### What changed

- `src/server/app/shared/layout.njk` now joins the page name, the service name and `GOV.UK` with hyphens. The existing `Error: ` prefix still sits in front of the whole title when an error summary is shown — documented GOV.UK behaviour, and the one point on which the frontend was already ahead of DR1.
- `src/server/app/shared/copy.en.js` and `copy.cy.js` gain a `govukSuffix` entry. It is a brand name rather than translated copy, so the Welsh pair carries the same value.
- Specs that assert on a full page title are updated, and a new `page-title.fit.spec.js` covers the composed format with and without the error prefix.

No feature copy changes — every view already supplied only its own page name.

### Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.
