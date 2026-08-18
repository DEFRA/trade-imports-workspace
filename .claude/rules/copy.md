---
paths:
  - '**/copy.en.js'
  - '**/copy.cy.js'
---

# User-facing copy

Editing a locale copy module. Every string here reaches a user, so GDS content
rules apply even though the file is JavaScript — these layer on top of the Node
conventions.

- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/gds/`
- Key file: `language.md` — plain English, active voice, capitalisation, dates
  and numbers, contractions, inclusive language.
- Situational: `accessibility.md` for error and hint wording, `components.md`
  when a key feeds a govuk component param (label vs hint vs error summary).

Copy lives in `copy/copy.<locale>.js` beside the feature; `shared/copy.<locale>.js`
holds cross-feature strings. `copy-convention.test.js` and `copy-parity.test.js`
enforce that every feature with a template owns `copy.en.js`, `copy.cy.js` and
`copy.test.js`, that the key trees match across locales, and that a translated
value differs from its English counterpart unless allowlisted. Change `en` and
`cy` together.

Read the files relevant to the change before editing. Do not inline their content here.
