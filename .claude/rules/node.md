---
paths:
  - '**/*.js'
  - '**/*.mjs'
  - '**/*.cjs'
  - '**/*.jsx'
---

# Node.js conventions

Editing Node.js source (Node >= 24, ESM throughout). Follow the workspace Node best-practices.

- Always on: `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` holds the house rules inline (comments, ids, history, names, structure, tests, logging). They apply to every Node file and win over any guide below.
- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/node/`
- Key files: `code-style.md`, `hapi.md`, `govuk-frontend.md`, `nunjucks.md`, and `testing/frontend.md`.
- Logging: `pino-logging.md`. Read it before adding a log line, a catch, a retry or a fallback.
- Additive: doc comments follow `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/jsdoc.md` (read `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/BEST_PRACTICES.md` first). Playwright spec and GDS/Nunjucks work layer their own tighter rules on top of these.

Read the files relevant to the change before editing. Do not copy the best-practices content into this file; only the house rules are written inline, in `code-quality.md`.
