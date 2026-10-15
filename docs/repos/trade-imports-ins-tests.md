# trade-imports-ins-tests

**Repo:** DEFRA/trade-imports-ins-tests

## Purpose

End-to-end, accessibility and security (OWASP ZAP) test suite for the trade imports services. Tests run against a live stack from a user's perspective.

## Responsibilities

- Browser journeys for every functional area of the product, split into one directory per domain, each with `e2e`, `a11y` and `security` test types, so each service's checks run only its own domain. One or more services serve a domain. One Playwright project, `chromium`, runs them all.
- The ZAP scan plans the workspace security profile stages (`zap/`).
- The CDP Portal test suite, where `PROFILE` picks the suite and, optionally, the domain.

| Domain          | Front end                        | Folder                 |
| --------------- | -------------------------------- | ---------------------- |
| `animals`       | `trade-imports-animals-frontend` | `tests/animals/`       |
| `animals-admin` | `trade-imports-animals-admin`    | `tests/animals-admin/` |
| `ins`           | `trade-imports-ins-frontend`     | `tests/ins/`           |
| `plants`        | `trade-imports-plants-frontend`  | `tests/plants/`        |

Page objects, flows and domain data follow the same split, under `page-objects/`, `flows/` and `domain/`: one folder per domain that needs one, plus `shared/`.

## Integrations

| Direction | Other side | How | What |
|---|---|---|---|
| Outbound | animals-frontend, animals-admin, ins-frontend, plants-frontend | HTTP (browser) | The journeys under test |
| Outbound | animals-backend, address-book | HTTP | Seeding and cleaning up test data |
| Inbound | workspace `e2e-tests.yml` | Docker image `defradigital/trade-imports-ins-tests` | PR checks; the suites and tags each repo runs come from `config/e2e-tests-pr-scope.json` |
| Inbound | workspace `security-active-scan.yml` | Docker image | ZAP active scan |

## Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Test framework:** Playwright (browser automation + assertions)
- **Reporting:** Allure (HTML reports, published to S3)
- **Linting:** ESLint, Prettier, typescript-eslint

## Infrastructure dependencies

Requires a running instance of the full stack to test against. For local runs, start the workspace stack first: `./scripts/stack/run-stack.sh` from the workspace root.

## How to run

```bash
npm install
npx playwright install chromium          # first time only

npm run test:docker-compose              # every domain, against the local workspace stack
npm run test:docker-compose:plants       # one domain: animals, animals-admin, ins or plants
npm run test:docker-compose:a11y         # the accessibility suite
npm run test:docker-compose:security     # ZAP passive scan (needs --profile security on the stack)
npm test                                 # CDP Portal config
```

Per-domain scripts are named `test:docker-compose:<domain>[:a11y|:security]`. There is no per-domain active scan. See the repo's `README.md` for the full table and its `docs/security.md` for the ZAP workflow.

On the CDP Portal, set `PROFILE` to `default`, `a11y` or `security` to run every domain, or to `<domain>:<suite>` (for example `animals:e2e`) to run one.
