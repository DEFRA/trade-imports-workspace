# EUDPA-668 handover

Ticket: [EUDPA-668](https://eaflood.atlassian.net/browse/EUDPA-668) — sweep every Node repo: adopt audit-ci, upgrade all packages, reset overrides.
Branch everywhere: `chore/EUDPA-668-npm-security-sweep`. Written 2026-10-06 before a machine restart.

Plan: [`EUDPA-668-plan.md`](EUDPA-668-plan.md) (copy of `workareas/ticket-planning/EUDPA-668/plan.md`, decisions D1–D10 decided).
Stopped workflow script: [`EUDPA-668-finish-and-stage-3.workflow.js`](EUDPA-668-finish-and-stage-3.workflow.js).

## Where things stand

| Stage | State |
|---|---|
| 0 — skill tooling (`tools/npm/`, npm-upgrade skill) | Done. On this workspace branch (pushed with this doc). |
| 1 — audit-ci + pipeline allowlist check | Done in all 8 repos. Gate passed. |
| 2 — upgrade everything | Done in all 8 repos (one major per step). 7 repo gates passed; admin failed on its production Docker build (lockfile, see below). E2E 277/277 against a `-d` stack. |
| Fixes + stage 3 (override reset) + gate + E2E | **Stopped part-way** because the disk filled (346 MB free) and Docker hung. |

Nothing is pushed in any service repo. Only this workspace branch is pushed.

## Repo state at handover

| Repo | HEAD | Uncommitted | Still to do |
|---|---|---|---|
| animals-admin | b1db342 | `package-lock.json` (lockfile regeneration in progress — check the diff; likely the npm 11.19 regen) | lockfile fix + prod build, dependabot, stage 3, gate |
| animals-frontend | 7e897c36 | `.nvmrc`, `Dockerfile`, `package.json` (Node 24.15 → 24.21.0, parent 3.2.3-node24.21.0), `.github/dependabot.yml` (eslint ignore removed). Ready to commit; message drafted by the agent. | commit those, lockfile check, stage 3 (12 overrides; trial kept only `tmp` and `lighthouse/.`), gate |
| ins-frontend | 18175de | — | fixes (eslint `includeIgnoreFile`, lockfile/prod build), stage 3, gate |
| plants-frontend | 38c35d7 | — | fixes (lockfile/prod build), stage 3, gate |
| ins-tests | 5fd569c | — | **TypeScript decision (below)**, fixes, stage 3, gate |
| performance-tests | 95f5706 | — | Node 24.21.0 done (8a673d3); stage 3 found nothing to remove; gate not run |
| schemas | e26e63f | — | stage 3 found no overrides; gate not run |
| defra-id-stub | cc1c91c | — | check fixes landed; stage 3, gate; coverage-drop check |

Workspace repo also has uncommitted, deliberately left alone: `.claude/hooks/guard-bash.sh` (user removed the `npm --prefix` rule — commit it yourself), `workareas/shared/ins-performance-testing/backlog.json` (unrelated), untracked `.test-keys/` (unknown, not from this work).

## Blockers to clear after the restart

1. **Disk.** 20 GB free after clearing scratchpad `node_modules` and the npm cache. Docker's data is ~45 GB.
   - Restart Docker Desktop, then `docker builder prune -af` and `docker system prune -af --volumes`.
   - Lower Docker's disk limit (Settings → Resources) so it can't fill the disk again.
2. **Node 24.21.0 for agents.** Installed with nvm (npm 11.19.0), but agents were **denied** running it: `bash -lc 'source ~/.nvm/nvm.sh && nvm exec 24.21.0 …'` and calling `~/.nvm/versions/node/v24.21.0/bin/node` directly were both refused. Pick one before resuming:
   - `nvm alias default 24.21.0` so a plain shell gets 24.21.0 (simplest), or
   - allow the `bash -lc 'source ~/.nvm/nvm.sh && nvm exec 24.21.0 …'` pattern in permissions.
   Host npm 11.6.2 strips optional lock entries that npm 12 (in the 3.x Docker base image) needs — that is what broke admin's production build. Every install must run on 24.21.0 / npm 11.19.
3. **ins-tests TypeScript (decision needed).** Today it runs two compilers (TS 6 aliased for eslint/editors, TS 7 for `tsc`) — rejected. typescript-eslint cannot run on TS 7 (no JS API until TS 7.1, stable ~2026-11-24; support is draft PR #12803). Options:
   - **A (recommended):** replace eslint + typescript-eslint with `oxlint` 1.87.0 + `oxlint-tsgolint` 7.0.2003; `typescript` 7.0.2 only. All 23 typed rules covered. Generate `.oxlintrc.json` with `npx @oxlint/migrate --type-aware`; rewrite the `no-restricted-imports` lookahead regex (Rust regex has no lookahead) to list the four domains. ins-tests becomes the one non-eslint repo.
   - **B:** pin `typescript` 6.0.3, drop `@typescript/native`, keep eslint. TS 7 waits for typescript-eslint.

## Decisions already made (don't re-ask)

- audit-ci 7.1.0 exact devDependency; allowlist rules enforced by an identical "Check audit allowlist" step in every repo's CI; entries owned by Sam Farrington, ≤3 months expiry (writer uses 89 days).
- Allowlisted: braces GHSA-vfj7-8cjw-p6xm (no fix; admin, animals-frontend, ins-frontend, plants-frontend, defra-id-stub), basic-ftp GHSA-c475-qrg2-pj4r (fix blocked by get-uri ^5; the three frontends). Both expire 2027-01-02 — re-check mid-December.
- Everything upgraded, one major at a time, nothing deferred; test bar unchanged.
- Node 24.21.0 / parent image 3.2.3-node24.21.0 everywhere.
- neostandard 0.14.0-next.1 prerelease accepted (only route to eslint 10).
- Remove eslint ignores from dependabot; eslint configs use `includeIgnoreFile`.
- schemas gets the new CI workflow; owners to confirm on the PR before merge.
- Stage 3 (D6): an override/pin stays only for a high/critical advisory or a failing test/lint/build, with the reason in the commit body.
- Push only after the stage 3 gate passes. plants-prototype syncs from plants-frontend after that merges (plan step 17), plus its allowlist CI step by hand.

## To resume

In a new Claude Code session at the workspace root, after the blockers are cleared:

> Resume EUDPA-668 from `workareas/shared/EUDPA-668-handover.md`. TypeScript option: A/B. Use workflows.

The next run should, per repo: finish the fixes (commit animals-frontend's pending edits; check admin's lockfile diff), prove the lockfile with `npm ci` in a `node:24.21.0` container and a production `docker build`, run stage 3 with `tools/npm/reset-overrides.sh`, then the stage 3 gate; then the defra-id-stub coverage check (vitest counting vs lost coverage), E2E on a `-d` stack with a locally built defra-id-stub plus a sign-in smoke through the stub, then push and raise PRs. The stopped script above is the template; it needs the Node invocation changed to whatever blocker 2 settles on.

## Things for PR descriptions

- defra-id-stub coverage fell (statements 94.78 → 91.6, branches 90.37 → 84.21) after vitest 3 → 5 with `coverage.include` narrowed to `src/**/*.js`; no thresholds configured. Not yet proven to be counting-only.
- Runtime defaults taken without real-infra checks: ioredis 6 pinned to `protocol: 2` (RESP2); undici 8 uses HTTP/2 via proxy (`allowH2: false` to revert); global-agent 4 strict TLS; pino 10 redaction untested; cssnano 9 rule merging not visually checked.
- `npm outdated` shows cssnano "latest 8.0.10" — stale registry metadata; 9.3.2 is the real latest and is installed.
- schemas' regenerated `sequenceNumeric` description comes from the UN/CEFACT vocabulary and reads wrong for a commodity line; a schema-level description would override it.
- The skill's scripts commit as "Upgrade X a → b" / "Refresh transitive dependencies" with a "Claude Sonnet 4.5" co-author line.
- The E2E agent fast-forwarded the local `main` clones of reference-data, stub and animals-backend (they were clean and behind origin).
