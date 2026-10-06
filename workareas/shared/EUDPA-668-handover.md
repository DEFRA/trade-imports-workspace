# EUDPA-668 handover

Ticket: [EUDPA-668](https://eaflood.atlassian.net/browse/EUDPA-668) — sweep every Node repo: adopt audit-ci, upgrade all packages, reset overrides.
Branch everywhere: `chore/EUDPA-668-npm-security-sweep` (workspace + 8 service repos, all pushed, no PRs yet).

Plan: [`EUDPA-668-plan.md`](EUDPA-668-plan.md) (decisions D1–D10 made).
Template for the remaining run: [`EUDPA-668-finish-and-stage-3.workflow.js`](EUDPA-668-finish-and-stage-3.workflow.js) — drop its `bash -lc 'source ~/.nvm/nvm.sh …'` wrapper: a plain shell now runs Node 24.21.0 / npm 11.19.0.

## Where things stand

| Stage | State |
|---|---|
| 0 — skill tooling (`tools/npm/`, npm-upgrade skill) | Done (this workspace branch). |
| 1 — audit-ci + pipeline allowlist check | Done in all 8 repos; gate passed. |
| 2 — upgrade everything | Done in all 8 repos, one major per step. E2E 277/277 on a `-d` stack. |
| Fixes, stage 3 (override reset), stage 3 gate, final E2E | **Not done** — next. |

## Still to do

1. **ins-tests: pin `typescript` to 6.0.3 (decided).** In package.json set `"typescript": "6.0.3"` and remove `@typescript/native` (the only references to `@typescript/native` / `@typescript/typescript6`). `npm install`, keep the tsconfig.json changes if `npm run typecheck` passes, run lint, and check the test lists stay 315 (`npm run _test_docker_compose -- --list`) and 271 (add `--config=playwright.config.ts --grep-invert "@compose|@a11y|@active"`). Commit "chore(EUDPA-668): pin typescript to 6.0.3" — body: typescript-eslint supports TypeScript <6.1 only and TS 7 has no JS API until 7.1 (stable ~2026-11-24; typescript-eslint support is draft PR #12803); one compiler instead of two. Mark the state row held at 6.0.3.
2. **Per repo fixes:**
   - Node 24.21.0 / Dockerfile parent `3.2.3-node24.21.0` everywhere (done in admin, animals-frontend, plants-frontend, ins-frontend, defra-id-stub, performance-tests — check the rest).
   - Prove each lockfile: `npm ci` in a `node:24.21.0` container and a production `docker build`. Earlier installs with npm 11.6.2 stripped optional entries npm 12 (in the base image) needs; admin's lockfile is already regenerated (44a8f49) but its production build has not been re-run; ins-frontend and plants-frontend are suspects too. Regenerate with npm 11.19 where needed.
   - eslint config: ins-frontend and performance-tests switch to `includeIgnoreFile` (as admin).
   - dependabot: drop the `eslint*` ignore where present (done in animals-frontend).
3. **Stage 3** per repo with `tools/npm/reset-overrides.sh` plus a review of other temporary pins (D6: keep only for a high/critical advisory or a failing test/lint/build, reason table in the commit body). Already found nothing to do in performance-tests and schemas. animals-frontend has 12 overrides; an earlier trial kept only `tmp` and `lighthouse/.`.
4. **Stage 3 gate** per repo: Linux `npm ci`, production image builds and starts, test/lint/format/build/fit/audit green, `npm outdated` only the known exceptions, test counts unchanged vs main.
5. **defra-id-stub coverage check:** statements 94.78 → 91.6, branches 90.37 → 84.21 after vitest 3 → 5 with `coverage.include` narrowed to `src/**/*.js`. Prove counting change vs lost coverage (per-file compare against main).
6. **Final E2E** on a `-d` stack with a locally built defra-id-stub (dev compose otherwise runs the stub from `:latest`), plus a sign-in smoke through the stub. Docker was pruned, so every image is pulled/rebuilt.
7. **Raise PRs** after the gate; then plants-prototype `sync:upstream` from plants-frontend once that merges (plan step 17), adding its allowlist CI step by hand.

## Decisions already made (don't re-ask)

- audit-ci 7.1.0 exact devDependency; allowlist rules enforced by an identical "Check audit allowlist" step in every repo's CI; entries owned by Sam Farrington, ≤3 months expiry (writer uses 89 days).
- Allowlisted: braces GHSA-vfj7-8cjw-p6xm (no fix; admin, animals-frontend, ins-frontend, plants-frontend, defra-id-stub), basic-ftp GHSA-c475-qrg2-pj4r (fix blocked by get-uri ^5; the three frontends). Both expire 2027-01-02 — re-check mid-December.
- Everything upgraded, one major at a time, nothing deferred; test bar unchanged. Only exception: ins-tests TypeScript held at 6.0.3 (above).
- Node 24.21.0 / parent image 3.2.3-node24.21.0 everywhere.
- neostandard 0.14.0-next.1 prerelease accepted (only route to eslint 10).
- schemas gets the new CI workflow; owners confirm on the PR before merge.

## To resume

> Resume EUDPA-668 from `workareas/shared/EUDPA-668-handover.md`. Use workflows.

Housekeeping: lower Docker's disk limit (Settings → Resources) so it can't fill the disk again. Never commit the untracked `.test-keys/` in the workspace (private key); `workareas/shared/ins-performance-testing/backlog.json` is unrelated work.

## Things for PR descriptions

- Runtime defaults taken without real-infra checks: ioredis 6 pinned to `protocol: 2` (RESP2); undici 8 uses HTTP/2 via proxy (`allowH2: false` to revert); global-agent 4 strict TLS; pino 10 redaction untested; cssnano 9 rule merging not visually checked.
- `npm outdated` shows cssnano "latest 8.0.10" — stale registry metadata; 9.3.2 is the real latest and is installed.
- schemas' regenerated `sequenceNumeric` description comes from the UN/CEFACT vocabulary and reads wrong for a commodity line; a schema-level description would override it.
- The skill's scripts commit as "Upgrade X a → b" / "Refresh transitive dependencies" with a "Claude Sonnet 4.5" co-author line.
