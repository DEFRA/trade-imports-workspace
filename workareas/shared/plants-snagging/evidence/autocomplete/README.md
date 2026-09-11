# Autocomplete diagnosis (2026-09-10)

Side-by-side capture of the country-of-origin type-ahead on the plants and
animals origin pages, taken by a throwaway fit spec in each repo (production
webpack bundle, stub mode) before any fix.

Finding: the two renders are byte-identical (`cmp` on the clipped form-group
screenshots reports no difference; both pages load the same
`application.0c4d349.min.css`). So there is no plants-only regression — but
both share two defects the screenshots show:

1. The results menu is in the browser's default serif. `.autocomplete__option`
   reports `font-family: "Times New Roman"` while the input is GDS
   Transport/Arial. The vendored SCSS is a bare `@use` of the upstream
   `autocomplete.css`, which sets no font-family, and the menu sits outside any
   `.govuk-*` element.
2. The dropdown arrow never paints. Upstream gives it `z-index: -1`; the
   wrapper is `position: relative` with no z-index, so nothing between the
   arrow and the root forms a stacking context and it paints beneath the page
   background.

Files:

- `plants-formgroup-initial-before.png` — field untouched; no arrow.
- `plants-formgroup-open-before.png` — "Fr" typed; "France" in a serif.
- `animals-formgroup-open-before.png` — the same capture on animals; identical.
