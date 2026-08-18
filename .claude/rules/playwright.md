---
paths:
  - '**/*.spec.ts'
  - '**/*.spec.js'
  - '**/*.visual.spec.ts'
---

# Playwright conventions

Editing a Playwright spec. Workspace specs are TypeScript (`.spec.ts`, plus `.visual.spec.ts` for visual regression). This is the tighter layer on top of the Node conventions — a spec is still JS/TS, so `node.md` applies additively.

- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/playwright/`
- Key file: `BEST_PRACTICES.md` — tests read like HTML, not logic puzzles; auto-waiting locators; the project's standard `npm run test:docker-compose` runner.

Read `BEST_PRACTICES.md` before editing. Do not inline its content here.
