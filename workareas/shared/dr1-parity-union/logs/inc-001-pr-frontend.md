## EUDPA-353 — remove the breadcrumb trail

Increment **inc-001** of the DR1 parity backlog (`workareas/shared/dr1-parity-union`). Frontend-only: no sibling backend or tests PR.

### The finding

Every page inside a notification opened with a two-step breadcrumb trail — "Your notifications" linking to the dashboard, then the page's own title — sitting above the back link. 30 of the 33 captured frontend screens rendered a trail with items in it. The trail was always exactly two steps regardless of how deep the page sat, so on the address picker it read "Your notifications > Place of origin" and said nothing about the addresses hub the user came through.

The two dashboard screens were worse: they rendered the `govuk-breadcrumbs` navigation landmark with an empty `<ol>` inside it, so a screen-reader user was announced a breadcrumb that contained nothing. That came from the global Nunjucks context seeding `breadcrumbs: []` for every view — the layout guard only rejected the literal `false`, and an empty array is truthy.

Design release 1 renders no breadcrumb on any of its 40 captured screens. A user's route back up is the service navigation bar and the back link, and nothing else.

### What changed

The trail is gone; the back link and the service navigation are now the only routes backwards. All six sites the finding names were touched, not just the layout:

- `src/server/app/shared/layout.njk` — drop the default breadcrumb block.
- `src/server/app/shared/paths.js` — drop the trail builder and its hard-coded `"Your notifications"` literal (the string was written twice; removing it from copy alone would have left the trail intact and untranslated).
- `src/server/app/shared/copy.en.js` and `copy.cy.js` — drop the `breadcrumbs` copy leaf from both languages.
- `src/config/nunjucks/context/context.js` — drop the global `breadcrumbs: []` seed that produced the empty landmark on the dashboard.
- `src/server/app/shared/kit.js` — drop the now-dead breadcrumbs branch of the shared kit helper.
- check-answers and hub controllers — drop the two explicit callers.

Tests updated alongside: the layout, context, hub copy and error-page specs now assert the absence of breadcrumb markup.

### Sequencing

This deliberately lands **after** inc-007 (service navigation items, merged as #212). Until the nav carried a Dashboard item the breadcrumb was the only always-present link to the notification list, and removing it first would have left a user mid-notification with nothing but the back link. With the nav populated the two say the same thing twice, which is what DR1 avoids.

### Falsified by

Finding a breadcrumb element rendered in any DR1 root view or in any of the 40 captured prototype DOMs.
