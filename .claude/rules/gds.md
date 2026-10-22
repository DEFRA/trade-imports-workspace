---
paths:
  - '**/*.njk'
---

# GDS / Nunjucks conventions

Editing a Nunjucks template (`.njk`). Stay inside the govuk-frontend toolbox — govuk-* components and utility classes, no custom CSS.

- Always on: `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` holds the house rules inline. In templates they mean: no comments that describe a controller or another page, no ids or history, and no macros with positional boolean parameters. Copy, layout and components follow the design source (the prototype, a design release, the acceptance criteria). Where these guides disagree, keep the design and raise a `design` finding for the designer.
- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/gds/`
- Key files: `components.md`, `patterns.md`, `accessibility.md`, `styles.md`, `service-design.md`, `language.md`, `writing.md`.

Read the files relevant to the change before editing. Do not copy their content into this file; only the house rules are written inline, in `code-quality.md`.
