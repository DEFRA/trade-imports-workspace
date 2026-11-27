# trade-imports-ins-tests

**Repo:** DEFRA/trade-imports-ins-tests

## Purpose

End-to-end, accessibility and security (OWASP ZAP) test suite for the trade imports services. Tests run against a live stack from a user's perspective.

## Responsibilities

- Browser journeys for every functional area of the product, split into one directory per domain, each with `e2e`, `a11y` and `security` test types, so each service's checks run only its own domain. One or more services serve a domain. The `chromium` Playwright project runs them all. `utils/playwright/shared-config.ts` also defines opt-in `chrome`, `firefox`, `webkit`, `mobile-webkit` and `mobile-chromium` projects for the `@cross-browser` tests.
- Cross-browser runs on BrowserStack (`browserstack.yml`): `@cross-browser` on Edge on Windows 11 and on WebKit on macOS, and `@ios` on iPhone 18 Pro and iPhone 17.
- Visual regression tests (`@visual`, animals and plants). They run on Linux only, in the e2e suite on GitHub Actions and on CDP, and are skipped on macOS. Linux baselines are updated by `test:visual:update:linux`.
- `@dynamics` tests, which check what reaches PIMS Dynamics.
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
| Outbound | animals-backend, address-book | HTTP (`adapters/http/`) | Seeding and cleaning up test data |
| Outbound | reference-data, ins-backend | HTTP (`reference-data-api-client.ts`, `ins-notification-api-client.ts`) | Reference data and the dashboard read model |
| Outbound | MongoDB | `adapters/db/mongodb-client.ts` | A direct connection to the stack's MongoDB |
| Outbound | SQS (Floci in the compose stack) | `adapters/queue/sqs-client.ts` | Seeds a message straight onto a queue, such as the gateway's dead-letter queue |
| Outbound | Dataverse / PIMS Dynamics | `dataverse-client.ts`, `animals-dynamics-client.ts` | The `@dynamics` tests (`ANIMALS_DYNAMICS_URL`, `DATAVERSE_TENANT_ID`, `DATAVERSE_CLIENT_ID`, `DATAVERSE_CLIENT_SECRET`) |
| Inbound | workspace `e2e-tests.yml` | Docker image `defradigital/trade-imports-ins-tests` | PR checks; the suites and tags each repo runs come from `config/e2e-tests-pr-scope.json`. This repo's own `workspace-e2e-tests.yml` calls it once "Publish Branch Image" completes |
| Inbound | workspace `security-active-scan.yml` | Docker image | ZAP active scan. This repo's `scheduled-security-scan.yml` calls it at 01:00 UTC on weekdays, and on dispatch |

## Stack

- **Runtime:** Node.js 26.13.1 (`engines` and `.nvmrc`)
- **Language:** TypeScript
- **Test framework:** Playwright (browser automation + assertions)
- **Reporting:** Allure. CDP Portal runs publish it to S3; workspace CI runs publish it to GitHub Pages
- **Linting:** ESLint, Prettier, typescript-eslint

## Infrastructure dependencies

Requires a running instance of the full stack to test against. For local runs, start the workspace stack first from the workspace root, with `tim docker up` or `tim docker dev`. Only the clone that owns the stack (`tim docker owner`) may run the docker-compose config: from another clone, the run stops before any test unless `ALLOW_FOREIGN_STACK=1` is set.

## How to run

```bash
npm install
npx playwright install chromium          # first time only

npm run test:docker-compose              # every domain, against the local workspace stack
npm run test:docker-compose:plants       # one domain: animals, animals-admin, ins or plants
npm run test:docker-compose:a11y         # the accessibility suite
npm run test:docker-compose:security     # ZAP passive scan (needs --profile security on the stack)
npm run test:docker-compose:security:active   # ZAP active scan, compose stack only
npm test                                 # CDP Portal config
```

Per-domain scripts are named `test:docker-compose:<domain>[:<suite>]`. `:a11y` is for animals and animals-admin. `:security` and `:security:active` are for animals, animals-admin and ins, and each `:security:active` script sets `ZAP_SCOPE`. `:visual` is for animals and plants, and `:cross-browser` and `:browserstack` are for animals and ins. See the repo's `README.md` for the full table and its `docs/security.md` for the ZAP workflow.

Other scripts: `reset:e2e-address-book`, `seed:notification` and `probe:cdp-session-reuse`.

On the CDP Portal, set `PROFILE` to `default`, `e2e`, `a11y`, `security`, `dynamics`, `cross-browser` or `browserstack` to run every domain, or to `<domain>:<suite>` (for example `animals:e2e`) to run one. `security:active` and `<domain>:security:active` are refused on CDP, because the active scan deletes real data.
