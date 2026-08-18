# trade-imports-animals-tests

**Repo:** DEFRA/trade-imports-animals-tests

## Purpose

End-to-end browser test suite for the trade imports animals service. Tests run against a live stack from a user's perspective, covering full journeys through the frontend application. Supports multiple execution environments: local development, GitHub Actions CI, and DEFRA CDP Portal.

## Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Test framework:** Playwright (browser automation + assertions)
- **Reporting:** Allure (HTML reports, published to S3)
- **Linting:** ESLint, Prettier, typescript-eslint

## Infrastructure dependencies

Requires a running instance of the full stack (frontend + backend + dependencies) to test against. For local runs, start the workspace stack first: `./scripts/stack/run-stack.sh` from the workspace root.

## How to run

```bash
npm install
npx playwright install chromium    # first time only

npm run test:docker-compose        # run against the local workspace stack (reseeds the DB first)
npm run test:docker-compose:a11y   # the accessibility suite against the same stack
npm test                           # CDP Portal config
```

Headed / debug mode:
```bash
npm run test:docker-compose -- --headed
npm run test:docker-compose -- --debug
```

Reports:
```bash
npx playwright show-report         # open HTML report
npm run report                     # generate Allure report
```
