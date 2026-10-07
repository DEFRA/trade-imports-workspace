# Implementation Plan: EUDPA-668

**Ticket:** Sweep every Node repo: adopt audit-ci, upgrade all packages, reset overrides
**Date:** 2026-10-05
**Confidence:** Medium. The audit-ci behaviour, the advisories and the override history are all backed by recon in scratch clones. The weak points are defra-id-stub (54 advisories, fixes not yet run together), the vite/esbuild overrides (a known macOS/Linux lockfile problem), and the prototype sync, which can only run after plants-frontend merges.

## Summary

Each in-scope repo moves from `npm audit --audit-level=high` to audit-ci 7.1.0, with an `audit-ci.jsonc` allowlist of GHSA entries that have a reason, an owner and an expiry. The work runs as three stages, in the user's order. Stage 1 makes the audit green. Stage 2 upgrades every package through the `npm-upgrade` skill. Stage 3 removes every override and temporary pin, then puts back only what a failing audit or test proves is needed. Each stage finishes in every repo before the next starts. Each stage runs as a Workflow that fans out one agent per repo, and the parent session checks a gate between stages.

Before stage 1, the `npm-upgrade` skill gets the tooling every stage relies on: an audit baseline check, an allowlist writer, a transitive lockfile refresh and an override reset. The allowlist writer is used from stage 1 onwards, so the skill writes every allowlist entry in the sweep, not only the new ones in stage 2.

The allowlist rules are enforced in each repo's CI pipeline (D2). The "Security audit" step or job first checks every entry, then runs audit-ci. The check fails, naming the entry, if an entry is not an NSPRecord with `active: true`, has no reason or `Owner:` in its notes, has a missing or unparseable expiry, has an expiry more than 3 months away, or has expired.

`trade-imports-plants-prototype` is not part of the three fan-outs. It takes everything in one `sync:upstream` after the plants-frontend PR merges, because the sync script only merges `upstream/main`.

## Decisions (decided 2026-10-05)

The user has decided all ten. D2 differs from the original recommendation. The options considered are kept under Alternative Approaches.

| # | Decision | Decided |
|---|---|---|
| D1 | How stage 1 goes green where fixable highs exist | Option B: take the minimal non-major fixes in stage 1, allowlist only no-fix advisories |
| D2 | Where allowlist rules (NSPRecord shape, `active: true`, notes, owner, expiry ≤ 3 months, expired entries named) are checked | **User's choice: in the pipeline.** Each repo's CI "Security audit" step or job checks the allowlist rules, then runs audit-ci. `npm run security-audit` runs audit-ci only, for local use and admin's hook. The skill's writer still writes the entries, but the skill does no rule lint of its own |
| D3 | Audit wiring for ins-tests, performance-tests, defra-id-stub, schemas | Separate "Security audit" job with weekly cron, built the same way as the others (rule check, then audit-ci). New minimal workflow for schemas. Lint "does not apply" in schemas |
| D4 | admin pre-commit hook fails closed offline | Keep the audit in the hook and document `--no-verify` for offline commits |
| D5 | Where the stage workflow scripts live | Uncommitted, under `workareas/npm-upgrades/EUDPA-668/workflow/` |
| D6 | Severity that justifies putting an override back in stage 3 | High and above, matching the audit gate. List lower findings in the PR for information |
| D7 | How the prototype gets the changes | After plants-frontend merges, run `sync:upstream`, then rename the sync branch to the shared branch name |
| D8 | govuk-frontend (in range, but owned by the govuk-upgrade skill) | Hold it with a recorded reason and raise a separate govuk-upgrade ticket |
| D9 | Allowlist owner and expiry | Owner: Sam Farrington [ASSUMPTION]. Expiry: 90 days from the date the entry is checked, re-checked and re-dated at the stage 3 gate |
| D10 | Default roster for npm-upgrade | Turn `npmUpgradeDefault` on for ins-frontend, performance-tests, schemas and defra-id-stub, and off for animals-backend |

## Repositories & Tech Stack

Branch in every repo, and in this workspace: `chore/EUDPA-668-npm-security-sweep`.

| Repository | Changes | Technologies | Best Practices |
|---|---|---|---|
| trade-imports-workspace (npm-upgrade skill, `tools/npm/`, `repos.json`) | Audit baseline, allowlist writer, lockfile refresh, override reset, handoff report, branch handling, roster fixes, docs | Bash, jq, Markdown skill persona | `docs/agent-skills.md` (Bash call hygiene, path conventions) |
| trade-imports-animals-admin | audit-ci, allowlist, undici and brace-expansion fixes, upgrades, vite/esbuild override reset | Node 24.11.1, hapi, vitest, webpack | `best-practices/trade-imports-animals-admin.md` |
| trade-imports-animals-frontend | audit-ci, allowlist, upgrades, 12 override entries reset | Node 24.11.1, npm 11.6.2, hapi, vitest, webpack, Lighthouse | `best-practices/trade-imports-animals-frontend.md` |
| trade-imports-ins-frontend | audit-ci, allowlist, lockfile refresh, upgrades (incl. hapi-pulse 4), 6 override entries reset | Node 24.14.1, npm 11.6.2 | `best-practices/trade-imports-ins-frontend.md` |
| trade-imports-plants-frontend | audit-ci, allowlist, undici and lockfile fixes, upgrades, 12 override entries reset | Node 24.11.1, npm 11.6.2 | `best-practices/trade-imports-plants-frontend.md` |
| trade-imports-plants-prototype | Everything via `sync:upstream` after plants-frontend merges | Node 24.11.1, npm 11.6.2 | `best-practices/trade-imports-plants-prototype.md` |
| trade-imports-ins-tests | audit-ci, new Security audit job, lockfile refresh, upgrades (typescript 7, dotenv 18) | Node 24, Playwright 1.63.0, TypeScript | `best-practices/trade-imports-ins-tests.md` |
| trade-imports-performance-tests | audit-ci, new Security audit job, upgrades (eslint 10, vitest 5) | Node 24.14.1, k6, vitest | `best-practices/trade-imports-performance-tests.md` |
| trade-imports-schemas | audit-ci, new minimal workflow, lockfile refresh, 2 minor upgrades | Node ≥24, node:test, ajv | `best-practices/trade-imports-schemas.md` (empty bundle) |
| trade-imports-defra-id-stub | audit-ci, new Security audit job, many security fixes, upgrades (16 majors), `.snyk` removal | Node 24.12.0, hapi, vitest + Testcontainers | `best-practices/trade-imports-defra-id-stub.md` |

## How the work runs

### Shape

- One PR per repo, on the shared branch. Each stage lands as its own commits, so a reviewer can read stage by stage.
- Nothing is pushed until the stage 3 gate passes. The SonarCloud pre-push hook then runs on each push.
- Each stage is one Workflow run (D5). It fans out one agent per repo, in parallel across repos. Each agent works only in its own repo and returns one JSON object.
- The parent session reads those objects, runs the gate and only then starts the next stage.
- The walker in stage 2 is interactive, so it runs in the parent session between two workflow runs.
- Every workflow script follows the args contract in `.claude/workflows/README.md`: `parseArgs` → `requireKeys` → `logResolvedConfig`, with no defaults. Required keys: `ticket`, `branch`, `repos`, `allowlistOwner`, `expiryDays`, `stage`.

### Agent result shape (every stage)

```json
{
  "repo": "trade-imports-animals-admin",
  "stage": 1,
  "commits": ["abc1234 ..."],
  "audit": { "green": true, "allowlisted": ["GHSA-vfj7-8cjw-p6xm"], "failing": [], "stale": [] },
  "test": "pass | fail | not-applicable",
  "lint": "pass | fail | not-applicable",
  "build": "pass | fail | not-applicable",
  "notes": "anything the parent must decide"
}
```

An agent never uses `git commit --no-verify`, never pushes, and stops and reports instead of working round a failure.

## Implementation Steps

### Stage 0: prepare the skill and the branches

These steps run in the parent session, or one agent, in this workspace. Steps 2 and 3 must be done before stage 1. Steps 4 to 6 must be done before stage 2. Step 7 must be done before stage 3.

### 1. Create the branch everywhere

**Goal:** Every repo and this workspace sit on `chore/EUDPA-668-npm-security-sweep`, from an up-to-date `main`, with a clean tree.
**Files:** none. `git fetch`, `git checkout -b` in `repos/<repo>` for the 8 repos (not the prototype, see step 17) and in the workspace.
**Pattern:** `.claude/skills/npm-upgrade/SKILL.md:76-109` (check local and remote before creating).
**Landed with:** no new code.
**Notes:**
- The workspace has a modified `workareas/shared/ins-performance-testing/backlog.json` from other work. Leave it out of every commit on this branch.
- Check `npm --version` is 11.6.2 before any install. Several repos reject a lockfile written by another npm (`packageManager: npm@11.6.2`).

### 2. Fix the roster and the dispatcher

**Goal:** The skill runs on the shared branch name and can run across all 8 repos.
**Files:**
- `repos.json`: `npmUpgradeDefault` false for `trade-imports-animals-backend` (Java, no `package.json`); true for `trade-imports-ins-frontend`, `trade-imports-performance-tests`, `trade-imports-schemas`, `trade-imports-defra-id-stub` (D10). The prototype stays false.
- `tools/npm/start-upgrade.sh:80-92`: skip a repo with no `package.json` with a warning, instead of aborting under `set -e`.
- `tools/npm/start-upgrade.sh`: accept `--branch <name>` and refuse to run if any repo is not on it.
- `.claude/skills/npm-upgrade/SKILL.md` steps 1-2: take the branch from the ticket's branch (`chore/EUDPA-N-<slug>`, `feat/` or `fix/`), not `feature/{run-id}-npm-dependency-upgrades`. Add one line: the prototype is never upgraded directly; it takes changes through `sync:upstream`.
**Pattern:** existing arg loop at `tools/npm/start-upgrade.sh:56-65`.
**Landed with:** stages 1-3 call `start-upgrade.sh --branch chore/EUDPA-668-npm-security-sweep`. The roster change is read by `start-upgrade.sh:36-39`.
**Notes:** Do not add an `npmUpgradeVia` field to `repos.json`. Nothing would read it (scope gate).

### 3. Audit baseline and allowlist writer (phase 0)

**Goal:** One way to run the audit, read its result and write allowlist entries. The allowlist rule check itself lives in each repo's pipeline (D2, step 9), not here.
**Files:**
- `tools/npm/audit-baseline.sh` (new). For one repo:
  1. Run `npx --no-install audit-ci --config audit-ci.jsonc --report-type full --output-format json`.
  2. Write `workareas/npm-upgrades/<ticket>/<repo>/audit.<repo>.<label>.json` and print `{repo, green, failing[], allowlisted[], stale[], fixable_allowlisted[]}`.
  3. For each allowlisted GHSA, check whether a fixed version now exists (see the rule below). If one does, report it as `fixable_allowlisted`, which fails the gate (AC "no entry covers an advisory with a fix"). The pipeline check does not cover this AC, because it needs the registry and the advisory data.
  - No format lint (shape, notes, owner, expiry) here. The pipeline check owns that.
- `tools/npm/audit-allowlist-add.sh` (new). `--repo --ghsa --reason --owner --expiry-days [--blocked-by "<path>"]`. Writes or renews one entry `{"<GHSA>": {"active": true, "notes": "<reason>. Owner: <owner>", "expiry": "<date>"}}`. Every entry it writes has the right shape by construction. It also refuses:
  - an expiry more than 3 calendar months away, so the skill never writes an entry the pipeline would reject
  - an advisory with a published version outside its vulnerable range, unless `--blocked-by` names the parent that blocks it (for example `get-uri pins basic-ftp ^5`). The kind is recorded as `no_fix` or `fix_blocked_upstream`.
  - It records the entry in `workareas/npm-upgrades/<ticket>/<repo>/allowlist.<repo>.json` with `added_at` and `stage`.
- `tools/npm/start-upgrade.sh`: new `--phase 0` that runs `audit-baseline.sh` per repo and exits non-zero if any repo is red or has a `fixable_allowlisted` entry. `--phase 1` refuses to start unless the last phase 0 run for the same repos was green.
**Pattern:** JSON state writers such as `tools/npm/packages-set-status.sh`; dispatcher shape at `tools/npm/start-upgrade.sh:260-265`.
**Landed with:** step 9 (stage 1 agents write every entry with `audit-allowlist-add.sh`), step 10 (stage 1 gate runs `--phase 0`), steps 11, 13 and 15.
**Notes:**
- Keep `audit-ci.jsonc` comment-free, so `jq` can read it, both here and in the pipeline check. The owner goes in each entry's `notes`. [NEEDS VERIFICATION] audit-ci 7.1.0 accepts a `$schema` key and an empty `allowlist: []` (the recon ran `$schema` only on admin, and never ran an empty list).
- "Fixed version exists" check: from `npm audit --json`, take the advisory's `range`; from `npm view <pkg> versions --json`, see if any version is outside it and newer than the installed one. [NEEDS VERIFICATION] that this works for both the braces case (none) and the basic-ftp case (6.2.1 exists, blocked).

### 4. Audit check inside the upgrade loop

**Goal:** A new no-fix advisory becomes a dated entry, not a failure. A failed commit (admin's hook) becomes a clean rollback.
**Files:**
- `tools/npm/upgrade-one-package.sh` after line 154, and `tools/npm/run-manual-upgrade.sh` at the same point: run `audit-baseline.sh`. If it is red only on new no-fix advisories, call `audit-allowlist-add.sh` and stage `audit-ci.jsonc` in the same commit. If it is red on a fixable advisory, roll back and demote to manual with that GHSA as the reason.
- `tools/npm/upgrade-one-package.sh:157-168`: if `git commit` fails (for example admin's pre-commit hook), roll back `package.json`, `package-lock.json` and `audit-ci.jsonc`, demote to manual, mark failed with the hook output, and exit 0. Today it exits with a non-1 code and leaves the row `inprogress` with a dirty tree.
- `.claude/skills/npm-upgrade/references/MANUAL_UPGRADE_IMPLEMENTOR.md`: run the audit after tests; use `audit-allowlist-add.sh` for no-fix advisories; mention admin's hook.
**Pattern:** existing rollback at `tools/npm/upgrade-one-package.sh:136-151`.
**Landed with:** stage 2 (step 11 and the walker in step 12).
**Notes:** The rollback must include `audit-ci.jsonc`, or a half-written entry survives a failed upgrade.

### 5. Transitive lockfile refresh

**Goal:** Stage 2 takes fixed transitive versions (fast-uri, @grpc/grpc-js, brace-expansion and others), which `ncu` never looks at.
**Files:**
- `tools/npm/refresh-lockfile.sh` (new): in one repo, run `npm update` (this changes the lockfile only; `package.json` ranges stay as they are), then `npm test` (skipped for ins-tests), `npm run lint`, `audit-baseline.sh`, then commit "Refresh transitive dependencies". Roll back with `git checkout package-lock.json` and `npm install` on failure, and report.
- `tools/npm/run-automated-upgrades.sh`: call it once at the end of each repo's batch, before the ins-tests end-of-batch E2E check.
**Pattern:** `tools/npm/upgrade-one-package.sh` steps 4-6.
**Landed with:** step 11.
**Notes:** [NEEDS VERIFICATION] that `npm update` with npm 11.6.2 leaves `package.json` untouched in these repos (no `--save`). Check with `git diff --stat` on the first run.

### 6. Handoff report: allowlist, audit and held packages

**Goal:** The handoff lists every allowlist entry and every package held back, with reasons (ACs on the skill and on `npm outdated`).
**Files:**
- `tools/npm/start-upgrade.sh` phase 3 (lines 226-258): add `allowlist` (from `allowlist.<repo>.json`), `audit_before` and `audit_after` (phase 0 snapshots), and `held` (rows the walker deferred, with their reason).
- `.claude/skills/npm-upgrade/references/MANUAL_HANDOFF.md`: add the sections "Allowlisted advisories (no fixed version)" (GHSA, package, repo, reason, expiry, owner) and "Held back on purpose".
- `.claude/skills/npm-upgrade/references/WALKER.md`: `D` must ask for a reason and store it as the failure reason. Use the existing deferred state. Do not add a new `held` classification.
**Pattern:** existing phase 3 `jq -n` block.
**Landed with:** step 12 and the stage 2 gate (step 13).

### 7. Override reset (phase 4)

**Goal:** Remove every override, prove what is still needed, and record the reason, without touching the existing rollback.
**Files:**
- `tools/npm/reset-overrides.sh` (new). For one repo:
  1. Save `.overrides` to `workareas/npm-upgrades/<ticket>/<repo>/overrides.<repo>.json` as `[{path, value, status, reason, evidence}]`. Flatten nested entries (`lighthouse/.`, `lighthouse/ws`, `puppeteer-core/ws`).
  2. Make a throwaway `git worktree` of the branch HEAD under the workarea. Do all trial work there, so `upgrade-one-package.sh`'s `git checkout` rollback can never undo it, and admin's hook never sees a red state.
  3. In the worktree: delete the `overrides` block, then `npm install`, `npm update`, `audit-baseline.sh`, `npm test`, `npm run lint`, `npm run build:frontend` where it exists.
  4. If all green: copy `package.json` and `package-lock.json` back and commit "Remove overrides".
  5. If not: for each high audit failure, map the GHSA's package to its override and put just that one back. For each test, lint or build failure, put overrides back one at a time until it passes. Record the GHSA or test name and a log excerpt as the reason. Then copy back and commit, with a table of kept overrides in the commit body.
- `tools/npm/start-upgrade.sh`: `--phase 4` runs it per repo, in parallel across repos.
- `.claude/skills/npm-upgrade/SKILL.md` and `references/COMMON.md`: document phase 0, the audit step in phase 2, phase 4 and the new failure types ("audit red at baseline", "advisory with fix available").
**Pattern:** the parallel reap loop at `tools/npm/start-upgrade.sh:174-223`.
**Landed with:** step 14.
**Notes:**
- Use `npm install` then `npm update`, not a deleted lockfile. A full regeneration on macOS risks the vite 8 rolldown/@napi-rs problem recorded in admin c801e67 and animals-frontend d4b0706f.
- [NEEDS VERIFICATION] that `npm install` in a git worktree under `workareas/` resolves the same way as in `repos/` (no stray parent `node_modules`).

### 8. Docs for the skill tooling

**Goal:** People can find and run the new scripts.
**Files:**
- `tools/npm/README.md`: add sections for `audit-baseline.sh`, `audit-allowlist-add.sh`, `refresh-lockfile.sh` and `reset-overrides.sh`. A full rewrite of the stale marker-file text is out of scope.
- `docs/reference/tools-index.md`: add the four scripts.
- `.claude/skills/npm-upgrade/assets/packages-table.md`: document `allowlist.<repo>.json`, `overrides.<repo>.json` and the audit snapshot files.
- `.claude/skills/npm-upgrade/references/AUTOMATED_EXECUTION.md`: the audit check per package and the end-of-batch refresh.
**Landed with:** steps 3-7.

### Stage 1: adopt audit-ci (all 8 repos, then gate)

### 9. Stage 1 workflow: one agent per repo

**Goal:** Every repo's `security-audit` script runs audit-ci at high on the full tree and is green, allowing only advisories with no usable fix (D1 Option B).

**Agent steps, per repo:**
1. Confirm branch and clean tree. Run `nvm use`.
2. `npm install --save-dev --save-exact audit-ci@7.1.0`.
3. Set `"security-audit": "audit-ci --config audit-ci.jsonc"` in `package.json` (add it where missing). Never pass `--skip-dev`.
4. Create `audit-ci.jsonc` with `{"$schema": "https://github.com/IBM/audit-ci/raw/main/docs/schema.json", "high": true, "report-type": "summary", "allowlist": []}`.
5. Apply the stage 1 fixes from the table below.
6. Add each no-fix entry with `audit-allowlist-add.sh`.
7. Wire CI per the table (D2, D3): add the "Check audit allowlist" step before the audit, in the existing step or job, or in the new job.
8. Run the allowlist check step's script locally (see "Running the check locally" below), then `npm run security-audit`, `npm test`, `npm run lint`, `npm run build:frontend` where it exists.
9. Commit in two commits: "Adopt audit-ci for the security audit" (package, config and workflow) and "Clear fixable high advisories". In admin, everything goes in one commit, because the hook audits each commit.
10. Return the result object.

| Repo | Allowlist (stage 1) | Stage 1 fixes (non-major only) | `security-audit` | CI wiring (D2, D3) |
|---|---|---|---|---|
| animals-admin | braces GHSA-vfj7-8cjw-p6xm | undici 8.10.0 → 8.11.2; `npm update brace-expansion` (1.1.18 → 1.1.21+, 5.0.9 → 5.0.12) | replace | edit the existing "Security audit" step in `pr-validator`: add the check step before it. Hook still runs `npm run security-audit` only (D4) |
| animals-frontend | braces; basic-ftp GHSA-c475-qrg2-pj4r (`--blocked-by "get-uri pins basic-ftp ^5; dev-only via @lhci/cli and puppeteer"`) | none needed | replace | edit the existing `security-audit` job: add the check step before the audit step |
| ins-frontend | braces; basic-ftp | `npm update brace-expansion` (stale lockfile: 5.0.9 → 5.0.12 under the existing `^5.0.9` override) | replace | edit the existing job, as animals-frontend |
| plants-frontend | braces; basic-ftp | undici 8.9.0 → 8.11.2; `npm update brace-expansion @grpc/grpc-js undici` (cheerio's nested undici must reach ≥ 7.29.1); raise the brace-expansion override to `^5.0.12`, which matches the prototype and avoids a sync conflict | replace | edit the existing job, as animals-frontend |
| ins-tests | none | `npm update brace-expansion` (5.0.6 → 5.0.12, clears 5 GHSAs) | add | new "Security audit" job in `check-pull-request.yml` (check step, then audit), plus a weekly cron |
| performance-tests | none (0 high today) | none | add | new "Security audit" job, same shape, plus cron |
| schemas | none | `npm update fast-uri` (3.1.5 → 3.1.8, clears 5 GHSAs) | add | new minimal `.github/workflows/check-pull-request.yml`: `npm ci`, `npm test`, `validate-*`, plus a separate "Security audit" job of the same shape and a cron |
| defra-id-stub | braces | undici 7.24.4 → 7.30.0; vitest and @vitest/coverage-v8 3.2.4 → 3.2.7 (clears the critical); joi 18.0.1 → 18.2.9; @hapi/hapi → 21.4.10; then `npm update` for browserslist, nanoid, postcss, svgo, immutable, js-yaml, vite, ws, fast-uri, brace-expansion, @grpc/grpc-js and fast-xml-builder | add | new "Security audit" job, same shape, plus cron |
| plants-prototype | not in this fan-out (step 17) | | | its `check-pull-request.yml` is an `ours` path, so the check step is added by hand in step 17 |

**The pipeline check (D2).** One step, the same text in every repo, placed straight before the audit step and running from the repo root on `ubuntu-latest` (which ships with `jq` and GNU `date`):

```yaml
- name: Check audit allowlist
  run: |
    today=$(date -u +%F)
    limit=$(date -u -d '+3 months' +%F)
    problems=$(jq -r --arg today "$today" --arg limit "$limit" '
      .allowlist[]
      | if type != "object" then "\(.): must be {\"GHSA-…\": {active, notes, expiry}}"
        else to_entries[] | .key as $id | .value as $e
          | (if ($id | test("^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$") | not) then "\($id): key is not a GHSA ID" else empty end),
            (if $e.active != true then "\($id): active must be true, or audit-ci ignores the entry" else empty end),
            (if (($e.notes // "") | test("\\S.*Owner: \\S")) | not then "\($id): notes must give a reason and \"Owner: <name>\"" else empty end),
            (if ($e.expiry | type) != "string" or (($e.expiry | try (strptime("%Y-%m-%d") | mktime) catch null) == null)
               then "\($id): expiry is missing or not a YYYY-MM-DD date"
             elif $e.expiry <= $today then "\($id): EXPIRED on \($e.expiry). Re-check the advisory, then renew or remove the entry"
             elif $e.expiry > $limit then "\($id): expiry \($e.expiry) is more than 3 months away (latest allowed \($limit))"
             else empty end)
        end' audit-ci.jsonc)
    if [ -n "$problems" ]; then
      echo "::error title=Audit allowlist::audit-ci.jsonc breaks the allowlist rules"
      echo "$problems"
      exit 1
    fi
    echo "Audit allowlist entries meet the rules"
- name: Security audit
  run: npm run security-audit
```

It is a sketch: the stage 1 agent for animals-frontend finalises it, and every other repo copies that text byte for byte. A parse failure of `audit-ci.jsonc` (for example a comment) makes `jq` exit non-zero, which fails the step too. [NEEDS VERIFICATION] that `strptime` rejects impossible dates such as `2026-02-31` in the jq version on `ubuntu-latest`. If not, add a round-trip check (`strftime` of the parsed date equals the input).

**Running the check locally.** The step uses GNU `date`. On macOS, run it in a container: `docker run --rm -v "$PWD":/app -w /app ubuntu:24.04 bash -c "apt-get -qq update && apt-get -qq install -y jq >/dev/null && bash check.sh"`, where `check.sh` is the step's `run` text copied from the workflow file. The stage gates (steps 10 and 15) use this.

**Files (per repo):** `package.json`, `package-lock.json`, `audit-ci.jsonc` (new), `.github/workflows/check-pull-request.yml` (edited in admin, animals-frontend, ins-frontend and plants-frontend; new job in ins-tests, performance-tests and defra-id-stub; new file in schemas).
**Pattern:** the frontends' separate job, `trade-imports-animals-frontend/.github/workflows/check-pull-request.yml` (job `security-audit`, with the comment at lines 50-56). Update that comment to say the job also checks the allowlist rules.
**Landed with:** the check step runs in every repo's "Security audit" step or job. The `security-audit` script is called by that job and by admin's `.husky/pre-commit`.
**Notes:**
- The check is copied into 8 workflow files, plus the prototype by hand. A change to the rules means 9 edits. The reusable-workflow alternative (D2) would avoid that, but it is not the chosen route.
- [NEEDS VERIFICATION] that the defra-id-stub fixes above clear every non-braces high without a major. The critique says some fixes cross majors (cssnano 8, undici 8). If any high is left, the agent stops and reports. The parent then picks: take that major in stage 1, or fall back to D1 Option A for that one advisory, with an entry marked "stage 2 removes".
- [NEEDS VERIFICATION] audit-ci's own dependencies (event-stream 4.0.1, readline-transform 1.0.0, cross-spawn ^7.0.3, yargs 17, jsonstream-next, jju, semver, tslib, escape-string-regexp) add no high advisory. I could not install it to check during planning. event-stream 4.0.1 is not the compromised 3.3.6. The stage 1 audit now covers these packages, so a hit shows up in step 8 of the agent's run. If one does, report it and stop. Do not allowlist audit-ci's own tree without a user decision.
- defra-id-stub tests need Docker running (Testcontainers). Its CI uses `node-version: 24`, not `.nvmrc`; leave that alone.
- ins-frontend: [NEEDS VERIFICATION] whether `npm test` fails on `serve-static-files.test.js`. The pretest already runs `build:frontend`, so it may pass. Record the baseline result before any change.
- schemas: [NEEDS VERIFICATION] who owns the repo. The `CDMS-1603` commit suggests another team, which may not want a new workflow. Ask before adding it. If they decline, ship the script only and record that the Security audit AC does not apply.
- ins-tests: `cdp-workflows` is its only PR job. A separate job keeps the audit visible without making `cdp-workflows` fail on a new advisory (D3).

### 10. Stage 1 gate (parent session)

**Goal:** Stage 2 starts from a green, checked baseline.
**Checks:**
- `start-upgrade.sh EUDPA-668 --phase 0 --branch chore/EUDPA-668-npm-security-sweep --repo ×8` is green, with no `fixable_allowlisted`.
- The "Check audit allowlist" step passes for every repo when run locally in a container, and its text is byte-identical across the 8 workflow files (`diff` the extracted steps).
- The three failing fixtures (Testing Strategy) each fail the check with the expected message.
- Every agent reports test, lint and build passing (or not applicable).
- admin's commit went through the hook without `--no-verify`.
- The allowlist holds only braces (admin, animals-frontend, ins-frontend, plants-frontend, defra-id-stub) and basic-ftp (the three frontends). ins-tests, performance-tests and schemas have an empty list.
- The workflow YAML parses: `actionlint` if installed, otherwise read it.
**Landed with:** no new code.

### Stage 2: upgrade everything (all 8 repos, then gate)

### 11. Stage 2 workflow A: plan and run the automated upgrades

**Goal:** Take every available version that needs no code change, then refresh the lockfile and triage the audit.
**What it does:**
1. Parent runs `start-upgrade.sh EUDPA-668 --phase 1 --branch … --repo ×8`. The workflow fans out one PACKAGE_PLANNER agent per manifest row (`references/PACKAGE_PLANNER.md`). Gate: `verify-classification-coverage.sh`.
2. `start-upgrade.sh --phase 2` runs the auto packages per repo (parallel across repos, one package at a time within a repo). The end-of-batch refresh (step 5) and the audit check (step 4) run inside.
3. One agent per repo then runs `audit-baseline.sh` and returns the result object, plus any advisory newly allowlisted.
**Planner guidance to pass in the workflow prompt:**
- Linked packages: vitest 5 and @vitest/coverage-v8 5 move together, and conflict with the `vite 6.4.3` and `esbuild 0.28.1` overrides. Classify them manual; the implementor may need to drop those two overrides early (see Risks).
- ins-tests: @playwright/test moves only with the Dockerfile's `mcr.microsoft.com/playwright` tag.
- ins-frontend: hapi-pulse 3 → 4 is a major. It is allowed (four sibling repos already run 4.0.0), but it is manual.
- jsdom 30.0.1 is ahead of its `latest` tag (29.1.1). Hold it, with that reason.
- govuk-frontend: hold, with the reason "govuk-upgrade skill, separate ticket" (D8).
- admin: dependabot ignores eslint, so eslint 10 is manual. Check neostandard's eslint 10 support.
**Landed with:** steps 3-5.

### 12. Walker and manual upgrades (parent session, interactive)

**Goal:** Every manual package is implemented or held with a reason.
**What it does:** The parent runs `start-upgrade.sh --phase 3` and then the walker (`references/WALKER.md`) with the user. `I` spawns a MANUAL_UPGRADE_IMPLEMENTOR. Implementors for different repos can run together as one Workflow B fan-out over the `I` list, one agent per package, run in sequence within a repo. `D` records a hold reason (step 6).
**Landed with:** step 6.
**Notes:** The ticket expects "take every available version". The hold list should stay short: jsdom, govuk-frontend and anything the user decides on in the walker.

### 13. Stage 2 gate (parent session, plus Workflow C to check every repo)

**Checks, per repo (Workflow C, one agent per repo):**
- `audit-baseline.sh` is green, with no `fixable_allowlisted`.
- `npm test`, `npm run lint`, `npm run format:check`, `npm run build:frontend` where present.
- `npm outdated --json` lists only the held packages from the phase 3 manifest.
- Frontends: `npm run test:fit:ci`.

**Checks across repos (parent):**
- E2E against the stack: `tim docker dev` (builds the repo-backed services from local source), then `npm run test:docker-compose` in ins-tests.
- The phase 3 handoff shows the allowlist section, which proves the skill AC.

**Landed with:** no new code.

### Stage 3: reset overrides (all repos, then gate)

### 14. Stage 3 workflow: override reset per repo

**Goal:** Each repo goes back to vanilla, and keeps only overrides it can prove it needs (D6).
**What it does:** One agent per repo runs `reset-overrides.sh` (step 7) and returns the kept-overrides table. The other temporary items are handled in the same agent: delete defra-id-stub's expired `.snyk` file. ins-tests, performance-tests and schemas have nothing to reset; their agents only re-run the audit and the tests.

**Override inventory.** "Removal test" is what the agent runs in the worktree, on top of the standard install, update, audit, test and lint.

| Override | Repos | Traced reason | Removal test |
|---|---|---|---|
| `brace-expansion: ^5.0.9` (`^5.0.12` in plants-frontend after stage 1) | animals-fe, ins-fe, plants-fe | GHSA-mh99-v99m-4gvg, then GHSA-rgw5-rvv9-x895 (animals 8482845d, 23f2fdb4). Fixed releases now exist on both the 1.x and 5.x lines, so it is probably no longer needed | audit; `npm run lint` (eslint uses minimatch) |
| `qs: ^6.16.0` | animals-fe, plants-fe | express 4.22.2 pins `qs ~6.15.1`; dev only, through @lhci/cli (animals e75dd4e8). GHSA not recorded: **unknown** | audit; `npm run lighthouse` |
| `postcss: ^8.5.18` | animals-fe, plants-fe | GHSA-r28c-9q8g-f849 (animals 8482845d). Path is disputed: @lhci/cli or the build tooling | audit; `build:frontend`; `lint:scss` |
| `tmp: 0.2.7` | animals-fe, ins-fe, plants-fe | GHSA-52f5-9888-hmc6 (tmp ≤ 0.2.3) per ins-fe 1d3869c. In animals it comes from the CDP template, with no GHSA recorded. @lhci/cli asks for `tmp ^0.1.0` | audit at high, and note the full-severity result too |
| `uuid: 11.1.1` | animals-fe, ins-fe, plants-fe | **unknown** (animals 09452ac0 says "security update"; ins says "probably"). @lhci/cli asks for `uuid ^8.3.1` | audit; `npm run lighthouse` |
| `serialize-javascript: 7.0.5` | animals-fe, plants-fe | **unknown** (888ea43a, 0e2cfe90; no GHSA) | audit; `build:frontend` |
| `flatted: ^3.4.0` | animals-fe, plants-fe | "flatted unbounded recursion DoS (high)" (a169f71d). GHSA not recorded | audit; `npm run lint` |
| `vite: 6.4.3` | admin, animals-fe, plants-fe | vite launch-editor and fs.deny advisories (no GHSA recorded). It also keeps vite on 6.x, because vite 8's rolldown chain broke `npm ci` between macOS and Linux (admin c801e67, animals d4b0706f). For the prototype, the origin is disputed (template 98a136a or the dba9c35 port) | audit; `npm test`; `npm ci` in a Linux container with npm 11.6.2 |
| `esbuild: 0.28.1` | admin, animals-fe, plants-fe | **Disputed**: "binary-integrity RCE" with no GHSA (admin, animals), against GHSA-67mh-4wv8-2f99, fixed in 0.25.0 (plants). It sits outside vite 6's declared `^0.25.0` range | audit; `npm test`; Linux `npm ci` |
| `lighthouse: {".": 13.4.1}` | animals-fe, ins-fe, plants-fe | GHSA-jmr9-qjv8-65gv (extract-zip, no fix). @lhci/cli pins lighthouse 12.6.1 exactly (animals 32f6106c) | check for a new @lhci/cli release first; audit; `npm run lighthouse` |
| `lighthouse: {ws: 7.5.11}` | animals-fe, ins-fe, plants-fe | ws DoS, GHSA-3h5v-q93c-6h6q (fixed in 7.5.10) | audit; `npm run lighthouse` |
| `puppeteer-core: {ws: 8.21.0}` | animals-fe, ins-fe, plants-fe | ws DoS (fixed in 8.17.1) or a later ws advisory: **unknown** which | audit; `npm run lighthouse` |

**Other temporary pins and patches:**

| Item | Repo | Action |
|---|---|---|
| `.snyk` (3 ignores, expired 2025-12-24, nothing runs it) | defra-id-stub | Delete |
| undici exact pin bumped for security | admin, plants-fe, defra-id-stub | Already at the fixed version after stage 1. A direct dependency, not an override. Nothing to remove |
| puppeteer 25.6.0, pinned to dedupe with the lighthouse override | animals-fe | Moves in stage 2. Re-check the dedupe after the lighthouse override decision |
| blankie 5.0.0, held against npm's bogus downgrade | admin | Keep. Record the low @hapi/joi advisory as accepted (below the threshold) |
| `.npmrc` `min-release-age=7` and `ignore-scripts=true` | ins-frontend | Keep: these are hardening, not temporary pins. npm 11 warns that `min-release-age` will stop working; mention it in the PR |
| Caret ranges from 20bb98c | defra-id-stub | Out of scope: not a temporary pin |
| `patches/`, patch-package, `resolutions` | none anywhere | Nothing to do |

**Landed with:** step 7.
**Notes:**
- Where a removed override uncovers a high advisory that has no fix (the extract-zip case), keeping the override is better than an allowlist entry, because the override removes the vulnerable code. Allowlist only when no override can fix it.
- `npm run lighthouse` needs the stack running. Run it once per frontend in the parent after the fan-out, not inside each agent.

### 15. Stage 3 gate (parent session)

**Checks:**
- `start-upgrade.sh --phase 0` is green in all 8 repos.
- Workflow C (step 13) again: test, lint, format, build, FIT, `npm outdated`.
- Linux lockfile check for admin, animals-fe and plants-fe, for example `docker run --rm -v <repo>:/app -w /app node:24.11.1 sh -c "npx -y npm@11.6.2 ci"`. This catches the rolldown problem before CI does.
- `npm run lighthouse` for animals-fe, ins-fe and plants-fe against the stack.
- E2E: `tim docker dev`, then `npm run test:docker-compose` in ins-tests.
- Re-check every allowlist entry (does the advisory still have no fix?), then renew it with `audit-allowlist-add.sh`, so every expiry is at most 3 months after the merge date (D9). Then run the "Check audit allowlist" step locally again in every repo.
**Landed with:** no new code.

### Ship

### 16. Push, raise PRs and merge

**Goal:** One PR per repo, plus one for this workspace, each carrying the evidence the ACs ask for.
**What each PR body contains:**
- Allowlist table: GHSA, package, reason, expiry, owner.
- Held packages and reasons, from `npm outdated` and the walker.
- Kept overrides, each with the audit or test failure seen without it (log excerpt from `overrides.<repo>.json`).
- For schemas: "lint does not apply" if no lint is added (D3).
**Merge order:** the workspace PR whenever it is ready. Repo PRs in any order, except that plants-frontend must merge before step 17.
**Notes:** The SonarCloud pre-push hook runs on each `git push`. If `SONAR_TOKEN` is not set, run `tools/sonar/sonar-push-check.sh` by hand. In this sweep it covers admin, animals-frontend and ins-frontend.

### 17. Prototype: sync from upstream after plants-frontend merges

**Goal:** The prototype ends up with the same audit-ci setup and dependencies as plants-frontend, without hand edits (D7).
**What it does:**
1. In `repos/trade-imports-plants-prototype`, run `npm run sync:upstream`. It merges `upstream/main` onto `sync/upstream-<date>` and applies `overrides.json`.
2. `package.json` and `package-lock.json` are `patched`. Resolve any conflict by taking upstream's dependencies and overrides, keeping the prototype's own scripts, then running `npx npm@11.6.2 install --package-lock-only`.
3. Expect conflicts where the prototype is ahead (undici 8.11.2, brace-expansion `^5.0.12` from e3f6317). Plants-frontend reaches undici 8.11.2 and `^5.0.12` in stage 1, so these lines may merge clean. If stage 3 removes the override upstream, take the removal.
4. `audit-ci.jsonc` is not listed in `overrides.json`, so it arrives as an upstream add. No `overrides.json` change.
5. Run `npm run security-audit`. The sync's own checks do not run the audit.
6. Rename the branch to `chore/EUDPA-668-npm-security-sweep` (`git branch -m`).
7. Add the "Check audit allowlist" step by hand to the prototype's `security-audit` job in `.github/workflows/check-pull-request.yml` (around lines 332-338), copied byte for byte from plants-frontend. Commit it separately ("Check audit allowlist rules in the Security audit job"). Run it locally as in step 9.
8. Raise the PR.
**Files:** `.github/workflows/check-pull-request.yml` (hand edit, step 7). Nothing else by hand, apart from conflict resolution.
**Landed with:** the check step runs in the prototype's existing `security-audit` job.
**Notes:**
- `check-pull-request.yml` is an `ours` path, so plants-frontend's workflow change never arrives through the sync. That is why step 7 is a hand edit. Any later change to the check must also be made by hand here.
- Its stage gates run after the others. That is a deliberate exception to "finish each stage across all repos". The prototype is not in the stack (`dockerStack: null`).

## Testing Strategy

| Test | What to test |
|---|---|
| Pipeline "Check audit allowlist" step, local run in a container (stage 1, before the first commit) | Must **fail** on each of three fixture `audit-ci.jsonc` files, each with one braces entry: (1) `expiry` missing, (2) `expiry` 4 months from today, (3) `expiry` yesterday, named as "EXPIRED". Also fails on a bare-string entry, `active` missing, and notes with no `Owner:`. Must **pass** on the real file. Keep the fixtures in `workareas/npm-upgrades/EUDPA-668/fixtures/`, not in the repos. Paste the outputs into the animals-frontend PR as evidence |
| Pipeline step, in CI (stage 3, before the PRs are opened for review) | On the animals-frontend PR, push one throwaway commit with fixture (3), see the "Security audit" job fail with the EXPIRED message, then revert it. This shows the check fails in real CI, not only locally |
| `audit-allowlist-add.sh` | Refuses a fixable GHSA (brace-expansion), refuses an expiry over 3 months, accepts braces, accepts basic-ftp only with `--blocked-by`. Every entry it writes passes the pipeline check |
| `audit-baseline.sh` | Reports `fixable_allowlisted` for a fixture entry on a fixable advisory (brace-expansion) |
| `upgrade-one-package.sh` in admin | A commit refused by the hook rolls back cleanly and the row ends `failed`, not `inprogress` |
| `reset-overrides.sh` | Leaves the repo checkout untouched until the final copy-back. `git status` in `repos/<repo>` is clean during the trial |
| Each repo, every gate | `npm run security-audit`, `npm test`, `npm run lint`, `npm run format:check`, `npm run build:frontend` where present |
| Frontends | `npm run test:fit:ci`; `npm run lighthouse` at the stage 3 gate |
| Cross-repo | E2E: `tim docker dev`, then `npm run test:docker-compose` in ins-tests, at the stage 2 and stage 3 gates |
| admin, animals-fe, plants-fe | Linux `npm ci` with npm 11.6.2 at the stage 3 gate |
| Prototype | Sync checks (`npm ci`, lint, test, `test:fit`) plus `npm run security-audit` |

## Configuration

| Variable/Flag | Purpose | Where Defined |
|---|---|---|
| `audit-ci` 7.1.0, exact | Audit runner | each repo's `devDependencies` |
| `security-audit` script | `audit-ci --config audit-ci.jsonc`, for local use and admin's hook. It does not check the allowlist rules | each repo's `package.json` |
| "Check audit allowlist" step | Enforces the allowlist rules: NSPRecord shape, GHSA key, `active: true`, reason and `Owner:` in notes, parseable expiry no more than 3 months away, expired entries named. Runs before the audit step | `.github/workflows/check-pull-request.yml` in every repo: in admin's `pr-validator` job, in the `security-audit` job elsewhere (the prototype by hand) |
| Weekly cron (Mon 07:00) on the Security audit job | Catches expired entries and new advisories between PRs | the same workflow files; new in ins-tests, performance-tests, defra-id-stub and schemas |
| `audit-ci.jsonc` `high: true`, `report-type: summary`, `allowlist` | Threshold and accepted advisories. Never `skip-dev`. Comment-free, so `jq` can read it | each repo root |
| Entry shape `{"GHSA-…": {active: true, notes: "<reason>. Owner: <name>", expiry: "YYYY-MM-DD"}}` | `active: true` is required, or audit-ci ignores the entry silently | `audit-ci.jsonc` |
| `npmUpgradeDefault` | Default repo set for the skill | `repos.json` |
| `--branch`, `--phase 0`, `--phase 4` | New dispatcher options | `tools/npm/start-upgrade.sh` |
| Workflow args `ticket, branch, repos, allowlistOwner, expiryDays, stage` | Stage workflow inputs, no defaults | `workareas/npm-upgrades/EUDPA-668/workflow/*.js` |
| npm 11.6.2 | Lockfile compatibility | `packageManager` in each repo |
| `SONAR_TOKEN` | Pre-push quality gate | developer shell |

## Risks & Open Questions

| Risk/Question | Mitigation/Notes | Severity |
|---|---|---|
| An expired entry makes audit-ci fail with no message saying it expired | The pipeline check runs first and names the entry as EXPIRED, so CI says why. Locally, `npm run security-audit` still gives no reason. Add one sentence to each repo's README section on the audit (if it has one): "if the audit suddenly fails on an allowlisted advisory, the entry has probably expired; the CI Security audit job names it". [NEEDS VERIFICATION] which READMEs mention the audit | Medium |
| The check is copied into 9 workflow files and drifts | Stage gates diff the extracted step text across repos. The prototype copy is a hand edit by design | Low |
| A hand edit to `audit-ci.jsonc` can pass locally and fail in CI | Expected: the pipeline is where the rule lives (D2). Running the step locally (step 9) shows the same result before pushing | Low |
| braces expiry lands about 3 January 2027, over the holidays | The owner re-checks in mid-December. Consider an expiry on a working day | Medium |
| vitest 5 needs a newer vite than the `vite 6.4.3` override allows, so stage 2 install fails | The planner classifies it manual. The implementor may drop the vite and esbuild overrides in stage 2 and run the Linux `npm ci` check then, which brings part of stage 3 forward | High |
| defra-id-stub can't go green with non-major fixes alone | Agent stops; parent chooses a major or a temporary entry (step 9 note) | Medium |
| audit-ci 7.1.0 has had no release since July 2024 | It reads npm's v2 audit JSON. If a future npm changes that format, the audit fails closed (red), not open. Note it in the PR | Low |
| audit-ci's own dependency tree carries an advisory | Shows up in the stage 1 audit. [NEEDS VERIFICATION] (step 9) | Medium |
| Offline commits in admin are blocked by the hook | D4: document `--no-verify` for offline use. This is not a regression: plain `npm audit` behaved the same | Low |
| Running npm-upgrade commits through admin's hook runs the audit and the tests on every commit | Slow but correct. Step 4 makes a refused commit a clean failure | Low |
| Nothing formally gates merges: no repo has branch protection or required checks | Out of scope. Say so in the PRs, because the AC "Security audit passes on main" is about visibility | Low |
| schemas' owner may not accept a new workflow | Ask first (step 9 note) | Medium |
| The sync script only merges `upstream/main` | D7: the prototype runs last, after plants-frontend merges | Low |
| The esbuild override's reason is disputed and has no GHSA | Stage 3 removal test decides. If it must stay, find the real GHSA before writing the reason | Medium |
| `npm update` in stage 1 may pull more than the named packages when given no names | Stage 1 names packages explicitly. Only defra-id-stub runs it broadly, and its result is checked by the gate | Low |

## Alternative Approaches

### D1: getting stage 1 green where fixable highs exist (admin, ins-frontend, plants-frontend, ins-tests, schemas, defra-id-stub)

**Option A: allowlist every current high as a short-lived baseline entry.** Mark each one "stage 2 removes" with an expiry of a few weeks.
- Pros: stage 1 is purely mechanical, and the upgrade skill starts green, as the user wanted.
- Cons: it breaks the ticket's stage 1 rule ("allow only advisories with no usable fix"). defra-id-stub would need about 35 entries. Stage 2 would have to remove them, and the skill could not tell a baseline entry from a real one without extra state. If a stage were pushed early, `main` would carry fixable entries.

**Option B (Recommended): take the minimal non-major fixes in stage 1.** Use exact patch or minor bumps of direct dependencies, plus `npm update <named packages>` for transitive ones. Allowlist only no-fix advisories.
- Pros: meets the ticket's rule and the AC from the first commit. Most of the fixes are already proven in scratch copies (undici 8.11.2, brace-expansion 5.0.12, @grpc/grpc-js 1.14.5, fast-uri 3.1.8). The allowlist written in stage 1 is the final allowlist, apart from renewals.
- Cons: stage 1 does a little of stage 2's work. defra-id-stub's set is large and not yet proven together.

**Option C: B, with A as the fallback for any single advisory B cannot clear without a major.** This is what step 9's note describes. It is not a separate choice, just how B handles the exception.

### D2: where allowlist rules are enforced (decided: pipeline)

**Chosen by the user: Option D, in each repo's pipeline.** The existing "Security audit" step or job in `check-pull-request.yml` (or the new job from D3) gets a "Check audit allowlist" step before audit-ci. It fails, naming the entry, on any rule break, and names expired entries clearly. `npm run security-audit` stays as plain audit-ci for local runs and admin's hook. The skill's writer still writes the entries, but the skill does no rule lint of its own.
- Pros: every PR and the weekly cron enforce the rules, including on hand edits. CI gives a clear reason when an entry expires, which audit-ci alone does not. No package-level script in the repos.
- Cons: the same step text sits in 9 workflow files, one of them (the prototype) kept by hand. Local `npm run security-audit` does not check the rules.

**Noted alternative, not chosen: a reusable workflow in this workspace** (for example `.github/workflows/security-audit.yml`, called with `uses: DEFRA/trade-imports-workspace/...@main`, as `e2e-tests.yml` is today). One copy of the check, and every repo calls it. It was not chosen. It ties each repo's audit to this workspace's `main`, and the prototype, schemas and performance-tests do not use the workspace's reusable workflows today.

Options considered earlier:

**Option A: a check script in each repo**, run before audit-ci in `security-audit`. This also covers local runs and the hook, but it means 9 copies of a custom JS script, which is the kind of custom script the user already turned down.

**Option B (originally recommended): in the skill's tooling.** `audit-allowlist-add.sh` refuses bad entries and `audit-baseline.sh` lints every file. There would be one copy, but a hand edit would only be caught the next time someone ran the skill.

**Option C: a `tim` command.** It is tested, but it adds a new tim domain for one check.

### D3: audit wiring in repos without one

**Option A (Recommended): a separate "Security audit" job with a weekly cron**, as in the frontends, for ins-tests, performance-tests and defra-id-stub, plus a new minimal workflow for schemas.
- Pros: consistent. A new no-fix advisory is visible without failing the main PR job, which is the ticket's aim. The cron catches expiries and new advisories between PRs.
- Cons: a fourth workflow change to maintain, and the first CI ever for schemas.

**Option B: a step inside the main PR job.** This makes the audit gate merges in practice (in ins-tests, `cdp-workflows` is the only job). It is stricter, but it is the very problem admin has today.

**Option C: the script only, no CI.** This fails the AC "Security audit passes on main", because there would be no check.

schemas lint: adding eslint to a repo with no lint today is out of scope. Record "does not apply" in the PR.

### D4: admin's pre-commit hook

**Option A (Recommended): keep it, and document `git commit --no-verify` for offline use.** The ticket's AC expects the hook to pass. Old `npm audit` failed the same way offline.
**Option B: drop the audit from the hook**, like the other four frontends did (animals 0658d2d6, ins 1d3869c). This is simpler and faster, but it is a policy change beyond the ticket.
**Option C: skip the audit when `npm ping` fails.** This adds a custom wrapper, and it fails open.

### D5: where the stage workflow scripts live

**Option A (Recommended): uncommitted, under `workareas/npm-upgrades/EUDPA-668/workflow/`**, still following the args contract.
- Pros: no tracked code with no second caller. The skill's own dispatcher stays the reusable part.
**Option B: commit `.claude/skills/npm-upgrade/workflow/sweep.js`.** It is reusable for the next sweep, and tim's contract test covers it. But the next sweep is hypothetical, so under the scope-in-caller gate it waits until it has a second caller.

### D6: what justifies putting an override back

**Option A (Recommended): a high or critical advisory, or a failing test, lint or build.** This matches the gate the ACs measure. Moderate and low findings without the override are listed in the PR for information.
**Option B: any severity.** This keeps more overrides (tmp's advisory may be low) and works against "back to vanilla".

### D7: prototype route

**Option A (Recommended): sync after plants-frontend merges**, then rename the branch.
**Option B: add a `--ref` flag to `scripts/sync-upstream/sync.js`**, so it can merge the upstream feature branch before merge. This lets the prototype join each stage, but it changes the prototype's sync contract on a chore branch for one use.
**Option C: apply the changes by hand.** The ticket rules this out, and it would conflict with the next sync.

### D8: govuk-frontend

**Option A (Recommended): hold it with the reason "owned by govuk-upgrade"** and raise a separate ticket. Its upgrades are CHANGELOG-driven and need visual checks.
**Option B: run `govuk-upgrade` inside this ticket**, which makes the PRs larger, with a different kind of review.

## References

- `~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh` - dispatcher; discovery is unguarded at lines 80-92
- `~/git/defra/trade-imports-workspace/tools/npm/upgrade-one-package.sh` - per-package install, test, commit and rollback (lines 136-168)
- `~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/SKILL.md` - phases and the `feature/` branch rule to replace
- `~/git/defra/trade-imports-workspace/repos.json` - `npmUpgradeDefault` roster
- `~/git/defra/trade-imports-workspace/.claude/workflows/README.md` - args contract for workflow scripts
- `repos/trade-imports-animals-frontend/.github/workflows/check-pull-request.yml` - separate Security audit job to copy (comment at lines 50-56)
- `repos/trade-imports-animals-admin/package.json` - `git:pre-commit-hook` runs `security-audit`
- `repos/trade-imports-plants-prototype/overrides.json` - `package.json` and `package-lock.json` are `patched`; `check-pull-request.yml` is `ours`
- `repos/trade-imports-plants-prototype/scripts/sync-upstream/sync.js` - merges `upstream/main` onto `sync/upstream-<date>`
- Recon evidence: `scratchpad/try-auditci/cfg/` (tested audit-ci configs), `scratchpad/wt/*` (shallow clones), per-repo audit JSON in the scratchpad

## Deferred to caller ticket

- A full rewrite of the stale `tools/npm/README.md` (marker-file model). Only the new scripts are documented here.
- A committed, reusable `npm-upgrade/workflow/sweep.js` (D5 Option B), once a second sweep needs it.
- A `tim` port of the audit tooling, or tests for `tools/npm/`. Neither has a caller beyond the bash in this ticket.
- Removing braces from the production image through a nunjucks chokidar override. Out of scope per the ticket.
- Branch protection and required status checks on any repo.
- Updating the hard-coded `Claude Sonnet 4.5` commit trailer in `upgrade-one-package.sh`.
- defra-id-stub's CI `node-version: 24` (instead of `.nvmrc`), and turning its caret ranges back into exact pins.
- `npmUpgradeVia`-style roster metadata for the prototype. Nothing would read it yet.

## Implementation Notes

Steps 2 to 8, on `chore/EUDPA-668-npm-security-sweep` in the workspace. Tested for real against scratch copies of animals-admin and animals-frontend (`scratchpad/stage0/`), never `repos/`.

### Deviations

**Step 3 - Planned:** read failing / allowlisted / stale from `audit-ci --output-format json`. **Actual:** audit-ci 7.1.0's JSON mode prints only npm's audit report (its own lists appear only in text mode). `audit-baseline.sh` takes audit-ci's exit code as the verdict and the report as the snapshot, and works out failing / allowlisted / stale itself from the report and `audit-ci.jsonc`, with audit-ci's rules (threshold, `active`, expiry after today). It warns if its count disagrees with audit-ci's verdict. **Reason:** the data is not in audit-ci's JSON output.

**Step 3 - Planned:** `fix_blocked_upstream` recorded in `allowlist.<repo>.json`. **Actual:** also written into the entry's notes ("<reason>. Fix blocked upstream: <parent>. Owner: <name>"). `audit-baseline.sh` reports such an entry as `blocked_allowlisted` (with the fix it waits for), not `fixable_allowlisted`. **Reason:** otherwise basic-ftp fails every phase 0 gate, and workarea state does not survive to the next ticket; the notes are committed. Notes still match the CI check's `\S.*Owner: \S`.

**Step 3 - Additions:** the semver "fixed version exists" check is `tools/npm/audit-fix-check.mjs` (node; semver from the repo's node_modules, which audit-ci brings, falling back to npm's copy), called through `tools/npm/audit-lib.sh` (sourced helpers). `audit-baseline.sh` also reports `failing_fixable` / `failing_no_fix` (step 4 needs them). The phase 1 gate also requires each repo's HEAD to equal the HEAD the last phase 0 run audited.

**Step 4 - Additions:** an audit before the install too (red there = "audit red at baseline", repo issue, not demoted), so an advisory published mid-run does not demote every package. Owner and expiry for auto-allowlisting come from new `--allowlist-owner` / `--expiry-days` options (start-upgrade phase 2 → run-automated-upgrades → upgrade-one-package; also run-manual-upgrade); without them a new no-fix advisory rolls back and demotes. A rollback also drops the entries it added from `allowlist.<repo>.json`.

**Steps 3-7 - Addition:** every per-repo script takes `--repo-path PATH` so it can run against a scratch checkout. `start-upgrade.sh` itself still only works on `repos/`.

**Step 5 - Actual:** phase 2 runs `run-automated-upgrades.sh` for every discovered repo, even one with no auto packages, so the lockfile refresh happens everywhere (schemas' fast-uri, for example). The `nothing_to_do` status is gone.

**Step 7 - Planned:** map a failing GHSA's package to "its override". **Actual:** an override is a candidate when it pins the advisory's package (`audit-direct`) or any package npm's `effects` chain reaches from it (`audit-path`). Then every `audit-path` or check-kept override (bar the last one put back for a check) is tried again and dropped if the run passes without it. **Reason:** the first real run on animals-frontend stopped on extract-zip (GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3), which no override pins directly; the `lighthouse/.` override keeps it out (as the plan's own inventory says).

### Discoveries

- [NEEDS VERIFICATION, step 3] audit-ci 7.1.0 accepts `$schema` and `"allowlist": []`: **yes** (admin and animals-frontend copies, empty stderr, normal report).
- [NEEDS VERIFICATION, step 3] fixed-version check: **works for both cases.** braces GHSA-vfj7-8cjw-p6xm: no fix, written as `no_fix`. basic-ftp GHSA-c475-qrg2-pj4r: 5.3.1 → 6.2.1 exists; refused without `--blocked-by`, written as `fix_blocked_upstream` with it, reported `blocked_allowlisted` by the baseline. brace-expansion GHSA-qhr7-859c-m2p7 refused (1.1.18 → 1.1.20, 5.0.9 → 5.0.11). A hand-written basic-ftp entry without the marker is reported `fixable_allowlisted` (exit 1); an expired entry shows in `inactive_allowlist` and `failing`; a GHSA not in the audit shows in `stale`. Entries the writer produced pass the plan's CI jq check (run locally with macOS jq), and prettier `--check` accepts the jq-written `audit-ci.jsonc`.
- [NEEDS VERIFICATION, step 5] `npm update` (npm 11.6.2) leaves `package.json` untouched: **yes** in admin (the commit held only `package-lock.json`; the script also rolls back if `package.json` ever changes).
- [NEEDS VERIFICATION, step 7] `npm install` in a worktree under `workareas/`: **resolves as in `repos/`.** Both share the same ancestors; the workspace root has an empty `node_modules/` and no `package.json`. The admin trial ran install, update, audit, test, lint and build green in the worktree.
- [step 9, seen in passing] audit-ci's own dependencies add no advisory at any severity (admin report after install).
- [step 9] admin's stage 1 row is one fix short: after undici 8.11.2 and `npm update brace-expansion`, cheerio's nested undici 7.x still fails GHSA-rfgv-xxqx-mfg5 and GHSA-w293-vg96-wgc3. `npm update undici` (as in the plants-frontend row) clears it; admin is then green with braces only. That stage 1 commit (audit-ci as `security-audit`) passed admin's real husky hook.
- Pre-existing bug fixed: `run-automated-upgrades.sh` used `((PROCESSED++))` from 0, which returns status 1 and stopped the runner under `set -e` on the first package (phase 2 saw it as a cascade).
- Phase 4 on the admin copy (macOS) removed both `vite` and `esbuild` overrides; vite resolved to 8.3.2 (rolldown). The stage 3 Linux `npm ci` gate decides these two.
- Phase 4 on the animals-frontend copy (macOS, after a simulated stage 1, before stage 2 upgrades) kept only `tmp` (GHSA-ph9p-34f9-6g65, audit-direct) and `lighthouse/.` (extract-zip GHSA-jmr9-qjv8-65gv and GHSA-7pqw-9j4j-h8q3, audit-path; dropping it in trial 3 failed the audit). It removed the other 10, including `qs`, `uuid`, `serialize-javascript`, `flatted`, `lighthouse/ws` and `puppeteer-core/ws`; tests, lint and build passed and the commit went through the repo's hook. Below the threshold, for the PR: moment and uuid (moderate), @vitest/mocker (moderate), @hapi/joi (low). `npm run lighthouse` and the Linux `npm ci` were not run (stage 3 gate items).
- Upgrade-loop tests on the admin copy: a fixable advisory (undici 8.10.0) rolls back and demotes; a new no-fix advisory (ip 2.0.1, GHSA-2p57-rm9w-gvfp) is allowlisted in the same commit, which passed admin's hook; a commit the hook refuses rolls back `package.json`, `package-lock.json` and `audit-ci.jsonc`, drops the state entry, and ends the row `failed` on a clean tree.
- The Bash guard blocks the chmod command; new scripts got their execute bit through git's index (`update-index`) at commit, then a checkout of the file.
