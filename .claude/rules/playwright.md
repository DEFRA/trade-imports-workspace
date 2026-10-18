---
paths:
  - '**/*.spec.ts'
  - '**/*.spec.js'
  - '**/*.visual.spec.ts'
---

# Playwright conventions

Editing a Playwright spec. Workspace specs are TypeScript (`.spec.ts`, plus `.visual.spec.ts` for visual regression). This is the tighter layer on top of the Node conventions — a spec is still JS/TS, so `node.md` applies additively.

- Always on: `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` holds the house rules inline. For specs the tests, ids and history rules matter most: a title states what its assertions prove, set-up used twice goes in the shared helper, and no `REMOVED_*` constants or ticket ids.
- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/playwright/`
- Key file: `BEST_PRACTICES.md` — reach pages through the domain journey's `to*` methods; seed only the set-up for a one-page assertion; test data copied from canned data, never invented; whole-list assertions; diagnose from the error context Playwright writes under test-results; the standard `npm run test:docker-compose` runner.

Read `BEST_PRACTICES.md` before editing. Do not copy its content into this file; only the house rules are written inline, in `code-quality.md`.
