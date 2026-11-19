# Config inventory (step 1.1)

Taken 2026-11-18 from `origin/main` of every repo in `repos.json` (all 17
checkouts were on `main`, clean and level with origin). `-` means absent.
The schemas `.nvmrc` and the animals-backend Dependabot fix are on open
draft PRs and not yet on `main`, so this table shows them as they were.

| Repo | Dependabot (ecosystems) | `.nvmrc` | engines.node | engines.npm | packageManager | Docker base | Playwright | vitest | eslint | neostandard | govuk-frontend |
|---|---|---|---|---|---|---|---|---|---|---|---|
| address-book | n | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| animals-admin | y (npm, github-actions) | v24.22.1 | >=24.22.1 | - | - | PARENT_VERSION 3.2.4-node24.22.1 | - | 5.0.3 | 10.12.0 | 0.14.0-next.1 | 6.5.1 |
| animals-backend | y (nuget, github-actions) - wrong ecosystem, PR #134 | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| animals-frontend | y (npm, github-actions) | v24.22.1 | >=24.22.1 | >=11.6.2 | npm@11.19.0 | PARENT_VERSION 3.2.4-node24.22.1 | 1.63.0 | 5.0.3 | 10.12.0 | 0.14.0-next.1 | 6.5.1 |
| defra-id-stub | n | 24.22.1 (no `v`) | >=24.22.1 | - | - | PARENT_VERSION 3.2.4-node24.22.1 | - | 5.0.3 | 10.12.0 | 0.14.0-next.1 | 6.5.1 |
| dynamics-gateway | y (maven, github-actions) | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| ins-backend | n | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| ins-frontend | y (npm, github-actions) | v24.22.1 | >=24.22.1 | >=11.6.2 | npm@11.19.0 | PARENT_VERSION 3.2.4-node24.22.1 | 1.63.0 | 5.0.3 | 10.12.0 | 0.14.0-next.1 | 6.5.1 |
| ins-tests | n | v24.22.1 | >=24 | - | - | mcr.microsoft.com/playwright:v1.64.1-jammy (+ zaproxy/zap-stable:2.17.0) | 1.64.1 | - | 10.12.0 | - | - |
| performance-tests | n | v24.22.1 | >=24 | >=11.6.2 | npm@11.19.0 | grafana/k6:2.3.0 | - | 5.0.3 | 10.12.0 | 0.14.0-next.1 | - |
| plants-backend | y (maven, github-actions) | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| plants-frontend | y (npm, github-actions) | v24.22.1 | >=24.22.1 | >=11.6.2 | npm@11.19.0 | PARENT_VERSION 3.2.4-node24.22.1 | 1.63.0 | 5.0.3 | 10.12.0 | 0.14.0-next.1 | ^6.3.0 |
| plants-prototype | n | v24.22.1 | >=24.22.1 | >=11.6.2 | npm@11.19.0 | PARENT_VERSION 3.2.4-node24.22.1 | 1.63.0 | 5.0.3 | 10.12.0 | 0.14.0-next.1 | ^6.3.0 |
| reference-data | n | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |
| routing-proxy | n | v24.22.1 | >=24 | - | - | PARENT_VERSION 3.2.4-node24.22.1 | - | 4.1.11 | 9.39.5 | 0.13.0 | 6.6.0 |
| schemas | n | - (added on PR #76) | >=24.22.1 | - | - | no Dockerfile | - | - | - | - | - |
| stub | n | - | - | - | - | amazoncorretto:25-alpine | - | - | - | - | - |

## Notable drift

1. **Dependabot is missing in 10 of 17 repos**: address-book, defra-id-stub,
   ins-backend, ins-tests, performance-tests, plants-prototype,
   reference-data, routing-proxy, schemas, stub. animals-backend had one,
   but on `nuget`, so it never updated Maven packages (fixed on PR #134).
   `tim deps dependabot` covers only the Node repos in
   `config/dependency-sets.json`; the 4 Java repos without Dependabot
   (address-book, ins-backend, reference-data, stub) need it from somewhere
   else, such as the maven + github-actions shape plants-backend uses.
2. **routing-proxy is a major behind on its toolchain**: eslint 9.39.5 (others
   10.12.0), neostandard 0.13.0 (others 0.14.0-next.1), vitest 4.1.11 (others
   5.0.3). Oddly it is the only repo already on govuk-frontend 6.6.0.
3. **Playwright is split**: 1.63.0 in the four frontends, 1.64.1 in ins-tests
   (package.json and its Docker image).
4. **npm floor and pin are inconsistent**: 4 repos declare `engines.npm
   >=11.6.2` and `packageManager npm@11.19.0`; animals-admin, defra-id-stub,
   ins-tests, routing-proxy and schemas declare neither. The 11.6.2 floor is
   below the 11.10 that `min-release-age` needs.
5. **Node is level at 24.22.1 everywhere but written three ways**: `.nvmrc`
   with and without a `v` (defra-id-stub), and `engines.node` as `>=24.22.1`
   or `>=24` (ins-tests, performance-tests, routing-proxy). Every Node
   Dockerfile uses `3.2.4-node24.22.1`. govuk-frontend is pinned at 6.5.1 in
   three repos, ranged `^6.3.0` in the plants pair, and 6.6.0 in
   routing-proxy.
