# Build-order page

Shows the 17 Design Release 2.1 themes as a dependency schematic: what must land
before what, where each theme has got to, and which themes could start today.

Published at <https://claude.ai/code/artifact/f7f85b51-6974-4096-acd1-66bec1171457>.

## Refreshing it

Everything the page shows is derived from the backlogs, so it stays true as themes
are built. Nothing here is hand-kept except `build/themes.meta.json`, which holds
each theme's display name and Jira ticket.

```bash
npm --prefix ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/combined/build-order-page/build run build
npm --prefix ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/combined/build-order-page/build run check
```

`build` rewrites `data.js`. `check` runs the page's own script against a stub DOM
and the new data, and fails if a region is left empty, if the drawing has the
wrong number of boxes or lines, or if a value renders as `undefined`. Run it
before republishing — a half-drawn page otherwise only shows up once it is live.

Then republish `index.html` with `data.js` as a supporting file, **passing the URL
above**. Publishing without it creates a second page instead of updating this one.

## What the generator works out

`build/make-data.mjs` reads `backlog.json` and every `themes/<id>/backlog.json`,
then derives:

- each theme's rows, and how many are done, blocked, deferred or dropped;
- the theme-to-theme dependencies, from the rows' own `dependsOn` and
  `externalDependsOn`;
- each theme's level, as the longest path from a theme that waits on nothing;
- the transitive reduction, so a dependency another path already implies is not
  drawn twice (48 recorded, 25 drawn at the time of writing);
- which themes have every dependency met and can start now;
- the geometry — node boxes, and an orthogonal route for every line, routed round
  the boxes it would otherwise cross.

It fails rather than guessing: an unknown row status, a theme with no
`themes.meta.json` entry, a duplicated row id or a dependency cycle all stop the
build.

## Adding a theme

Add its display name and ticket to `build/themes.meta.json`, then rebuild. Levels,
position and lines follow from the backlog data — there is no layout to edit.

## What is not derived

Two of the readings under "What the shape tells you" are authored judgement, not
data, and are labelled **Commentary** on the page: the transporters decision and
the waiting-on-design holding pen. Both are skipped automatically once their theme
is complete. Everything else on the page, including the other readings, is derived.
