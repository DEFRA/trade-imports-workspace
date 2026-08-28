## EUDPA-334 — inc-003: Alpha phase banner on every page

**Increment:** `inc-003` (dr1-parity-union backlog) · **Ticket:** EUDPA-334 · **Repo:** frontend only (single-repo increment — no sibling PR, no cross-repo merge order)

### The parity finding

No page in the service carries a phase banner. The shared layout goes straight from the service navigation into the breadcrumbs, and `govuk-phase-banner` matched 0 of the 67 captured frontend screens. Every one of the 60 captured Design release 1 screens opens with one, directly under the navigation. Design release 1 authors the banner per view rather than inheriting it from the Prototype Kit's branded layout, which makes the banner and its wording a deliberate decision of the design rather than kit furniture.

### What changed

Render `govukPhaseBanner` once, in the shared layout's `beforeContent` block above the breadcrumbs and back link, so it appears on every page of the service instead of being repeated per view.

- `src/server/app/shared/layout.njk` — import and render `govukPhaseBanner` at the top of `beforeContent`; the feedback destination is set as a single `feedbackUrl` above the blocks.
- `src/server/app/shared/copy.en.js`, `copy.cy.js` — banner copy beside the existing layout copy, the two files kept structurally identical as `copy.test.js` / `copy-leaves.js` require.
- `src/server/app/shared/copy.test.js`, `layout.test.js`, and the dashboard fit spec — cover the banner's presence, copy and link both on the shared layout and on a rendered page.

Tag text `Alpha`, body "This is a new service. Help us improve it and give your feedback by email.", with the last five words as the link.

### Open question for the service team

**Where should the feedback link point?** Design release 1 uses a placeholder href, so this service needs a real destination. It currently ships as `mailto:APHAServiceDesk@apha.gov.uk` — the only general-purpose contact address in `src/`. That is a defensible default but not a confirmed one: this codebase already presents that mailbox as the *technical support* desk on the confirmation page ("Contact the Animal and Plant Health Agency (APHA) if you need technical help with this service"), and a phase banner asks a different question — alpha usability feedback. The shared layout renders on roughly 30 pages, so the destination ships service-wide.

To change it, three places pin the value:

- `feedbackUrl` in `src/server/app/shared/layout.njk`
- the `feedbackAnchor` constant in the "alpha phase banner" describe in `src/server/app/shared/layout.test.js`
- the `FEEDBACK_MAILTO` constant in `dashboard.fit.spec.js`

Deferred rather than resolved in the increment because code cannot settle it — no alternative destination exists in the repo, and adding a `/feedback` route would widen the blast radius well beyond a banner.

### Notes for the reviewer

- An earlier attempt at this increment reached `main` without review and was reverted in #207. This PR is that work re-landed through review.
- `inc-007` travels with this one — same shared layout, same `beforeContent` region — but is deliberately **not** included here.
- Verification ladder run for this increment: `test:live-animals`, `format:check`, `lint`, `test:fit:features`.
