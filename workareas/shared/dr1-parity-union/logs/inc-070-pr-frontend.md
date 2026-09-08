## What this changes

The import-reason page called itself two different things in three places. The radio fieldset's legend was promoted to the `h1`, so the question **"What is the main reason for importing the animals?"** was the largest text on the page and wrapped onto two lines above the first radio, while the browser title and the breadcrumb both said **"Reason for import"**.

The page is now headed with its name, and one name is used throughout.

- `copy.title` becomes **"Main reason for import"** (with the machine-draft Welsh "Prif reswm dros fewnforio"), so the heading, the browser title and the breadcrumb all use one name — and it agrees with the hub task row.
- The template renders that name as its own `h1` above the form and drops `isPageHeading` from the radios, keeping the question as a `govuk-visually-hidden` legend so a screen reader still hears it as the radio group's accessible name.

### Tests

- New `import-reason` case: the `h1` is the page name, no heading carries the question, and the hidden legend is still the group's accessible name.
- `section-caption` and `journey-smoke` specs now look for the page name where they previously looked for the legend.

## Files

| File | Change |
|---|---|
| `.../features/import-reason/copy/copy.en.js` | title → "Main reason for import" |
| `.../features/import-reason/copy/copy.cy.js` | Welsh machine draft |
| `.../features/import-reason/template.njk` | own `h1`, hidden legend, `isPageHeading` dropped |
| `.../features/import-reason/import-reason.fit.spec.js` | new heading/legend assertions |
| `.../features/section-caption.fit.spec.js` | expect page name |
| `fit/journey-smoke.fit.spec.js` | expect page name |

## Provenance

- Increment **inc-070**, ticket **EUDPA-483**.
- Design release 1 parity corpus (`dr1-parity-union`), slice `import-reason`.
- Frontend-only increment — the tests repo was branched but has no commits, so there is no sibling PR and no cross-repo merge order to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
