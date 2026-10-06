# EUDPA-668 handover

Ticket: [EUDPA-668](https://eaflood.atlassian.net/browse/EUDPA-668) — sweep every Node repo: adopt audit-ci, upgrade all packages, reset overrides.
Branch everywhere: `chore/EUDPA-668-npm-security-sweep` (workspace + 8 service repos, all pushed, no PRs yet).

Plan: [`EUDPA-668-plan.md`](EUDPA-668-plan.md) (decisions D1–D10 made).

## Where things stand

| Stage | State |
|---|---|
| 0 — skill tooling (`tools/npm/`, npm-upgrade skill) | Done (this workspace branch). |
| 1 — audit-ci + pipeline allowlist check | Done in all 8 repos; gate passed. |
| 2 — upgrade everything | Done in all 8 repos, one major per step. |
| Fixes (Node 24.21.0, lockfiles, eslint config, dependabot, `packageManager` npm@11.19.0) | Done in all 8 repos. Every lockfile passes Linux `npm ci` and the production image build. |
| 3 — override reset | Done. The three frontends keep only `tmp` 0.2.7 (GHSA-ph9p-34f9-6g65) and `lighthouse/.` 13.4.1 (extract-zip GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3); admin's vite/esbuild overrides removed; defra-id-stub's expired `.snyk` deleted; nothing to do in ins-tests, performance-tests, schemas. |
| 3 — gate | Passed in all 8 repos. |
| defra-id-stub coverage | Counting change, not lost coverage: main re-measured under coverage-v8 5.0.3 = 91.64/84.21, branch = 91.65/84.21. |
| Final E2E | 277/277 (7 conditional skips) on a `-d` stack with a locally built defra-id-stub; suite's sign-in specs passed. |
| PRs | **Not raised** — next. |

## Still to do

1. **Raise PRs** in all 8 repos (and this workspace), using the notes below.
2. After plants-frontend merges: plants-prototype `sync:upstream` (plan step 17), adding its allowlist CI step by hand.
3. Re-check the allowlist mid-December (entries expire 2027-01-02). basic-ftp GHSA-c475-qrg2-pj4r now has a fix in basic-ftp 6.2.1 — check whether get-uri still blocks it.

## Decisions already made (don't re-ask)

- audit-ci 7.1.0 exact devDependency; allowlist rules enforced by an identical "Check audit allowlist" step in every repo's CI; entries owned by Sam Farrington, ≤3 months expiry (writer uses 89 days).
- Allowlisted: braces GHSA-vfj7-8cjw-p6xm (no fix; admin, animals-frontend, ins-frontend, plants-frontend, defra-id-stub), basic-ftp GHSA-c475-qrg2-pj4r (the three frontends). Both expire 2027-01-02.
- Everything upgraded, one major at a time, nothing deferred; test bar unchanged. Only exception: ins-tests TypeScript held at 6.0.3 (typescript-eslint supports <6.1; TS 7 has no JS API until 7.1).
- Node 24.21.0 / parent image 3.2.3-node24.21.0 everywhere; `packageManager` npm@11.19.0 where set.
- neostandard 0.14.0-next.1 prerelease accepted (only route to eslint 10).
- schemas gets the new CI workflow; owners confirm on the PR before merge.
- ins-frontend's override trial ran with `npm_config_min_release_age=0` (its pinned eslint 10.12.0 was under 7 days old until 2026-10-09). CI's `npm ci` is unaffected: it installs from the lockfile. The bypass also let in 16 transitive versions under 7 days old (e.g. @sentry/* 10.76.1, @opentelemetry/* 2.12.0, published 2026-10-06) — say so on the PR; reviewers may prefer to wait until 2026-10-13 and refresh the lockfile.

## Housekeeping

- Lower Docker's disk limit (Settings → Resources) so it can't fill the disk again.
- The dev stack may still run defra-id-stub from the local `:eudpa-668-local` build; a fresh `run-stack.sh -d` puts it back on `:latest`.
- Never commit the untracked `.test-keys/` in the workspace (private key); `workareas/shared/ins-performance-testing/backlog.json` is unrelated work.
- In agent sessions `node -v` and `rm -rf` are refused by permissions: check Node with `npm exec -c 'node -v'` (not `npm exec -- node -v`, which runs the npm package called `node`).

## Things for PR descriptions

- Runtime defaults taken without real-infra checks: ioredis 6 pinned to `protocol: 2` (RESP2); undici 8 uses HTTP/2 via proxy (`allowH2: false` to revert); global-agent 4 strict TLS; pino 10 redaction untested; cssnano 9 rule merging not visually checked.
- `npm outdated` shows cssnano "latest 8.0.10" — stale registry metadata; 9.3.2 is the real latest and is installed.
- defra-id-stub: "coverage-v8 5.x AST-based counting; main re-measured under 5.0.3 = 91.64/84.21, branch = 91.65/84.21". Any future threshold should start from ~91.6/84.2.
- npm 11.19/12 block install scripts not in `allowScripts` (puppeteer, protobufjs, @parcel/watcher, ssh2, …); installs, tests and builds still pass.
- ins-tests' Docker image runs Node 24.20.0 (the Playwright base image's own Node).
- Lighthouse was not run against this branch.
- The SonarCloud pre-push hook printed nothing on push (probably no `SONAR_TOKEN` locally); CI's SonarCloud check is the gate.
- schemas' regenerated `sequenceNumeric` description comes from the UN/CEFACT vocabulary and reads wrong for a commodity line; a schema-level description would override it.
- The skill's scripts commit as "Upgrade X a → b" / "Refresh transitive dependencies" with a "Claude Sonnet 4.5" co-author line; a few commits (animals-frontend `83b25a98`, defra-id-stub `44082ab`, `8a88a6b`) lack the session trailer — left as is.
