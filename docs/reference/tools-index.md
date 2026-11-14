# Tools (`tools/`)

Shared shell scripts called by skills via
`~/git/defra/trade-imports-workspace/tools/<domain>/<script>`. Environment:
`JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`.

**`tools/` is bash only.** Each script here is bash, and its tests are bash
scripts beside it named `<script>.<aspect>.test.sh`, each with a `check()`
helper (for example `tools/review/render-items.write.test.sh`). New
JavaScript goes in `tim` as a command, tested with tim's own tests, not in
`tools/`.

**The Jira write surface has a library-first `tim` equivalent.** `tim jira
create|attach|link|assign` (see `tim/README.md`) is dry run by default.
`create` prints the plan (fields, attachments, warnings for placeholder
text) and a `planId`, and only writes with a matching `--confirm <planId>`;
`attach`, `link` and `assign` write with `--confirm`. `link` takes
`relates <key>`, `--blocks <key>` or `--blocked-by <key>` and reads back the
direction Jira stored. `assign` takes an account id or `me` and reads the
assignee back. `tim jira epics`, `tim jira labels` and `tim jira search` are
read-only; `search` takes search words (a text search in the project) or
`--jql <query>`. `tim jira epics --board <id> [--include-done]` lists a
board's epics as `KEY — summary` lines, and `tim jira labels --board <id>`
counts the labels in a board's backlog. Every ticket the workspace raises,
epics included, goes through `tim jira create`.

| Script | Args | Purpose |
|---|---|---|
| **jira** | | |
| `tools/jira/ticket.sh` | EUDPA-X [full\|summary\|json] | Get ticket |
| `tools/jira/comments.sh` | EUDPA-X | Get comments |
| `tools/jira/add-comment.sh` | EUDPA-X "Comment" | Add comment |
| `tools/jira/transition-ticket.sh` | EUDPA-X "Status"\|--list | Change status. Takes a status or a transition name; `--list` prints `transition -> status`.<br>`tim jira transition EUDPA-X "Status" [--list] [--json]` now covers this, and is what the increment build loop calls; the script stays for use by hand. |
| `tools/jira/search.sh` | "JQL" [list\|summary\|json] [--fields ...] | Run JQL across the project (paginates via v3 endpoint) |
| **github** | | |
| `tools/github/prs.sh` | EUDPA-X [list\|json\|urls] | Find PRs |
| `tools/github/pr-details.sh` | repo pr-num [full\|files\|json] | PR details |
| `tools/github/file-diff.sh` | repo pr-num file-path | PR diff filtered to one file |
| **confluence** | | |
| `tools/confluence/page.sh` | page-id [summary\|json] | Get page |
| `tools/confluence/sync-docs.sh` | [--dry-run] [--root-id ID] | Sync Confluence tree to docs/confluence/ |
| `tools/confluence/clean-docs.sh` | [args forwarded] | Wipe + re-sync docs/confluence/ |
| **review** | | |
| `tools/review/start-review.sh` | EUDPA-X | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `tools/review/prepare-review.sh` | EUDPA-X [--json] | Setup workspace |
| `tools/review/detect-tech.sh` | REPO_PATH | Detects technologies + best-practice paths for a repo; reads `.claude/skills/review/assets/routing.json` |
| `tools/review/verify-coverage.sh` | EUDPA-X [--json] | Check coverage |
| `tools/review/verify-consistency.sh` | EUDPA-X [--json] | Check consistency |
| `tools/review/verify-style-coverage.sh` | EUDPA-X [--json] | Check JS style review coverage |
| `tools/review/file-review-init.sh` | EUDPA-X --repo R --file F --commit SHA --pr N --mode M | Initialise per-file `.review.json` placeholder |
| `tools/review/file-review-add-item.sh` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." [--best-practice PATH] | Append a finding to a per-file JSON. C is a category from `tools/review/finding-categories.sh`; any other is refused |
| `tools/review/file-review-set-verdict.sh` | EUDPA-X --repo R --file F --verdict V [--reason "..."] | Set verdict (marks file as reviewed) |
| `tools/review/aggregate-file-reviews.sh` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Populate `items.{repo}.json` + emit File Analysis Summary / Items markdown.<br>e.g. `tools/review/aggregate-file-reviews.sh EUDPA-1 --repo backend --write-items`<br>Boundary: without `--write-items` it only emits markdown to stdout; `--write-items` (re)writes `items.{repo}.json` and renumbers IDs — FRESH population only, prior dispositions/status not preserved. |
| `tools/review/review-items.sh` | EUDPA-X [--repo R] [--filter ...] [--status ...] [--json] | List items from `## Items` table |
| `tools/review/review-mark.sh` | EUDPA-X --repo R --item N --disposition V [--note "..."] | Set Disposition (auto-sets Status).<br>e.g. `tools/review/review-mark.sh EUDPA-1 --repo backend --item 3 --disposition Fix`<br>`Merged` needs `--note "merged into #N"`, naming the owner item.<br>Boundary: sets Disposition and lets it drive Status (vs `review-set-status.sh`, which sets Status alone). |
| `tools/review/review-set-status.sh` | EUDPA-X --repo R --item N --status V [--note "..."] | Set Status only.<br>e.g. `tools/review/review-set-status.sh EUDPA-1 --repo backend --item 3 --status Done`<br>Boundary: sets Status directly and leaves Disposition untouched (vs `review-mark.sh`, which sets Disposition and derives Status). |
| `tools/review/review-add-item.sh` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." | Append new item; prints new ID. C is a category from `finding-categories.sh` |
| `tools/review/review-counts.sh` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tools/review/render-items.sh` | EUDPA-X --repo R [--write] | Render `items.{repo}.json` as the `## Items` markdown view, through `items-table.jq`; `--write` puts it into `review.{repo}.md` in place of the old table; a fix's "Must:" and "One way:" parts get a column each |
| `tools/review/refresh/scope.sh` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--human] | Refresh: pull + diff + lists A/B/C/D.<br>e.g. `tools/review/refresh/scope.sh EUDPA-1 --write-snapshot`<br>Boundary: read-only — classifies files into the refresh work-lists (vs `reconcile.sh`, which mutates `items.{repo}.json`). |
| `tools/review/refresh/reconcile.sh` | EUDPA-X --repo R [--dry-run] [--json] [--force] | Refresh Step R5 — fold `.review.json` findings into items.json + emit Fix+Done spot-check advisory.<br>e.g. `tools/review/refresh/reconcile.sh EUDPA-1 --repo backend`<br>Boundary: runs after `scope.sh` and appends new findings into `items.{repo}.json` (vs `scope.sh`, which only lists them). |
| `tools/review/refresh/pull-repos.sh` | EUDPA-X [--repo R] [--json] | Refresh helper |
| `tools/review/refresh/list-merge-resolved.sh` | REPO_DIR PRIOR_SHA HEAD_SHA [--tsv\|--json] | Refresh helper |
| `tools/review/refresh/list-coverage-gaps.sh` | REVIEW_DIR REPO PR_NUM [--tsv\|--json] | Refresh helper |
| **style** | | |
| `tools/style/start-style.sh` | EUDPA-X | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `tools/style/prepare-style.sh` | EUDPA-X [--json] | Fresh Step 1 — init `.style.json` placeholders + per-repo rules bundle |
| `tools/style/file-topics.sh` | PATH | Pure path→topic router; reads `.claude/skills/code-style/assets/routing.json` |
| `tools/style/bake-rules-bundle.sh` | EUDPA-X REPO TOPIC | Bundles TOPIC's files (from `.claude/skills/code-style/assets/routing.json`) into `style-rules.{repo}.{topic}.md` |
| `tools/style/aggregate-file-reviews.sh` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Write `items.{repo}.json` from per-file `.style.json` + emit markdown sections |
| `tools/style/render-items.sh` | EUDPA-X --repo R | Render `items.{repo}.json` as the `## Items` markdown view, through `items-table.jq` (the table `aggregate-file-reviews.sh` also writes) |
| `tools/style/style-items.sh` | EUDPA-X [--repo R] [--file F] [--filter ...] [--status ...] [--by-file] [--json] | List items |
| `tools/style/style-mark.sh` | EUDPA-X --repo R --item N --disposition V [--note "..."] | Set Disposition |
| `tools/style/style-set-status.sh` | EUDPA-X --repo R --item N --status V [--note "..."] | Set Status only |
| `tools/style/style-add-item.sh` | EUDPA-X --repo R --file F --line L --rule R --severity S --issue "..." --fix "..." [--category C] [--best-practice PATH] | Append new item. C, when given, is a code-quality category |
| `tools/style/style-counts.sh` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tools/style/file-style-init.sh` | EUDPA-X --repo R --file F --commit SHA --pr N --mode M | Initialise per-file `.style.json` placeholder |
| `tools/style/file-style-add-item.sh` | EUDPA-X --repo R --file F --line L --rule R --category C --severity S --issue "..." --fix "..." [--best-practice PATH] | Append a finding to a per-file `.style.json`. C is a code-quality category from `tools/review/finding-categories.sh`; any other is refused |
| `tools/style/file-style-set-verdict.sh` | EUDPA-X --repo R --file F --verdict V [--reason "..."] | Set per-file verdict (marks file as reviewed) |
| `tools/style/refresh/scope.sh` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--human] | Refresh, filtered to `.js` |
| `tools/style/refresh/reconcile.sh` | EUDPA-X --repo R [--dry-run] [--json] [--force] | Refresh Step R5 — fold `.style.json` findings into items.json + emit Fix+Done spot-check advisory |
| **npm** | | |
| `tools/npm/start-upgrade.sh` | EUDPA-X --phase 0\|1\|2\|3\|4 [--repo R ...] [--strategy LEVEL] [--branch NAME] [--allowlist-owner NAME --expiry-days N] | Single dispatcher — phase 0 audits every repo (gates phase 1), phase 1 discovers + emits PACKAGE_PLANNER spawn manifest, phase 2 fans out per-repo runners, phase 3 emits WALKER handoff (with allowlist, audits and held packages), phase 4 resets overrides per repo. `--branch` refuses to run if any repo is on another branch; a repo with no `package.json` is skipped |
| `tools/npm/audit-baseline.sh` | --run-id TICKET --repo R [--label L] [--repo-path PATH] | Run the repo's audit-ci check; save the npm audit report; print failing / allowlisted / stale / fixable_allowlisted advisories and which have a fixed version. Exit 1 if red or an allowlisted advisory now has a fix |
| `tools/npm/audit-allowlist-add.sh` | --run-id TICKET --repo R --ghsa GHSA --reason "..." --owner NAME --expiry-days N [--blocked-by "..."] [--stage N] [--repo-path PATH] | Write or renew one `audit-ci.jsonc` allowlist entry; refuses an expiry over 3 months, an advisory not in the audit, or one with a fix (unless `--blocked-by`) |
| `tools/npm/audit-allowlist-forget.sh` | --run-id TICKET --repo R --ghsa GHSA [--ghsa GHSA ...] | Drop entries from the run's `allowlist.<repo>.json` state after a hand rollback (the scripted upgrades do this themselves); never touches `audit-ci.jsonc`. Run with `bash` |
| `tools/npm/refresh-lockfile.sh` | --run-id TICKET --repo R [--repo-path PATH] | `npm update` (lockfile only), then test, lint, audit and commit "Refresh transitive dependencies"; rolls back and reports on failure |
| `tools/npm/reset-overrides.sh` | --run-id TICKET --repo R [--repo-path PATH] | Phase 4: remove every override in a throwaway worktree, put back only those a failing audit / test / lint / build needs, commit "Remove overrides" with a kept-overrides table |
| `tools/npm/verify-classification-coverage.sh` | --run-id TICKET [--repo R] [--json] | Phase 1 coverage gate — fail iff any package.classification == null |
| `tools/npm/prebake-context.sh` | --run-id TICKET --repo R --package PKG | Best-effort fetch of changelog + grep usages; updates `context_baked` field |
| `tools/npm/bake-best-practices.sh` | --run-id TICKET --repo R | Concatenate dependency-relevant best-practices into per-repo bundle |
| `tools/npm/discover-upgrades.sh` | repo-path --run-id TICKET [--strategy LEVEL] [--json] | Discover outdated deps + seed `packages.{repo}.json` |
| `tools/npm/packages-init.sh` | --run-id TICKET --repo R --repo-path PATH --strategy LEVEL --ncu-version VER (--ncu-json JSON \| --ncu-file PATH) | Seed `packages.{repo}.json` from ncu output |
| `tools/npm/packages-list.sh` | --run-id TICKET [--repo R] [--package PKG] [--classification ...] [--risk ...] [--status ...] [--json] | List packages with filters |
| `tools/npm/packages-counts.sh` | --run-id TICKET [--repo R] [--json] | Counts by classification × status × risk |
| `tools/npm/packages-set-classification.sh` | --run-id TICKET --repo R --package PKG --classification auto\|manual --risk LOW\|MEDIUM\|HIGH --safe-for-automation true\|false --rationale "..." [--files-affected CSV] [--changes-required "..."] [--changelog-url URL] [--migration-guide-url URL] [--demoted-from-auto true\|false] | Set PACKAGE_PLANNER fields on one package |
| `tools/npm/packages-set-status.sh` | --run-id TICKET --repo R --package PKG --status todo\|inprogress\|done\|failed [--failure-reason "..."] [--commit-sha SHA] | Set implementation_status (+ commit_sha / failure_reason) |
| `tools/npm/run-automated-upgrades.sh` | repo-name --run-id TICKET [--allowlist-owner NAME --expiry-days N] | Phase 2 per-repo runner (JSON-state-driven), ending with `refresh-lockfile.sh` |
| `tools/npm/upgrade-one-package.sh` | --run-id TICKET --repo R --package PKG [--allowlist-owner NAME --expiry-days N] [--repo-path PATH] | Phase 2 internal: install + test + audit + commit + rollback (a refused commit rolls back too) |
| `tools/npm/run-manual-upgrade.sh` | --run-id TICKET --repo R --package PKG [--allowlist-owner NAME --expiry-days N] [--repo-path PATH] | Phase 3 per-package manual runner (spawned by WALKER), same audit gate |
| **govuk** | | |
| `tools/govuk/start-upgrade.sh` | --ticket EUDPA-X \| --branch B [--target V] | Phase 1 dispatcher: `.run-meta.json` + branch setup + version discovery + security pre-flight (`npm audit`) |
| `tools/govuk/discover-repos.sh` | --run-id TICKET [--branch B] [--target V] [--json] | Phase 1: write run-level `.run-meta.json` (in-scope repos) |
| `tools/govuk/setup-branch.sh` | --branch B --repo R | Phase 1: idempotent `git checkout` for one repo |
| `tools/govuk/discover-versions.sh` | repo-path --run-id TICKET [--target V] [--json] [--force] | Phase 1: seed `versions.{repo}.json` + cache CHANGELOG + pre-bake per-version sections + best-practices bundle |
| `tools/govuk/version-classify.sh` | --run-id TICKET --repo R --version V --classification todo\|noop [--summary "..."] | VERSION_PLANNER: set classification |
| `tools/govuk/version-add-change.sh` | --run-id TICKET --repo R --version V --file F --why "..." --change "..." | VERSION_PLANNER: append change entry |
| `tools/govuk/apply-version.sh` | --run-id TICKET --repo R --version V [--final] | Phase 3 per-version: package.json + install + test + commit + mark-implemented |
| `tools/govuk/version-mark-implemented.sh` | --run-id TICKET --repo R --version V [--commit SHA] | Phase 3: mark version applied |
| `tools/govuk/version-mark-failed.sh` | --run-id TICKET --repo R --version V --reason "..." | Phase 3: mark version failed |
| `tools/govuk/render-version-plan.sh` | --run-id TICKET --repo R --version V | Markdown view of one version's plan |
| `tools/govuk/list-plan-summaries.sh` | --run-id TICKET [--repo R] [--json] | PLAN_WALKER: one summary row per pending version |
| `tools/govuk/list-plans.sh` | --run-id TICKET [--repo R] [--filter F] [--sort-semver] [--json] | Filterable Phase 1/2 status.<br>e.g. `tools/govuk/list-plans.sh --run-id EUDPA-1 --filter todo`<br>Boundary: Phase 1/2 planning/classification view only (vs `upgrade-status.sh`, which also folds in the Phase 3 implementation view). |
| `tools/govuk/upgrade-status.sh` | --run-id TICKET [--repo R] [--filter F] [--sort-semver] [--json] | Combined Phase 1/2/3 status (delegates to list-plans.sh).<br>e.g. `tools/govuk/upgrade-status.sh --run-id EUDPA-1 --filter done`<br>Boundary: combined planning + Phase 3 implementation view (vs `list-plans.sh`, which stops at Phase 1/2 classification). |
| **ticket** | | |
| `tools/ticket/prepare-plan.sh` | EUDPA-X [--repos r1,r2] [--json] | Pre-bake `ticket.md` + `.plan-meta.json` + per-repo `best-practices/<repo>.md` for PLANNER |
| `tools/ticket/prepare-implement.sh` | EUDPA-X [--repo R] [--json] | Assert plan, re-validate detect-tech, cache prior PR diff, emit `.implement-meta.json` |
| `tools/ticket/setup-branch.sh` | EUDPA-X\|NO_JIRA --repo R --slug S [--type feat\|fix\|chore] [--base B] [--json] | Fetch → checkout base → pull → checkout -b `<type>/EUDPA-X-<slug>` in one dispatch. `--type` defaults to `feat`; any other value is refused |
| **ticket-creator** | | |
| `tools/ticket-creator/prepare-ticket-creation.sh` | [--board ID] [--cap-page ID] | Refresh `workareas/ticket-creation/.prereqs/` with active EUDPA epics + EUDP capability codes.<br>e.g. `tools/ticket-creator/prepare-ticket-creation.sh`<br>Boundary: only refreshes the prereqs cache for the interview; creates nothing (vs `tim jira create`, which actually creates the ticket in Jira). |
| `tim capabilities extract` | \<markdown-file\> [--format list\|tsv] [--json] | Strict parser for the capability map. `list` emits `CODE — Name [STATUS]` or refuses outright; `tsv` emits every anchored row with a verdict.<br>Boundary: parses only — the caller decides what to do with a violation. |
| `tools/ticket-creator/check-capabilities.sh` | [--cap-page ID] [--quiet] | Diagnostic report on capability-map conformance: per-row verdicts, violations grouped by rule, unknown status values. Exits non-zero while any row is non-canonical.<br>Boundary: read-only reporting (vs `prepare-ticket-creation.sh`, which writes the prereqs cache). |
| **skill-creator** | | |
| `tim skill start` | "<trigger phrase>" [--json] | Step 0 dispatcher — parses trigger, emits `MODE: CREATE` / `MODE: AUDIT_ONE` / `MODE: AUDIT_ALL` + JSON payload (`--json`: the mode is `result.mode`) |
| `tim skill answer` | --run-id NAME --field PATH --value JSON [--json] | CREATE — atomic mutation of `decisions.json` (one shape question per call) |
| `tim skill render` | --run-id NAME [--json] | CREATE — markdown view of `decisions.json` (mid-interview recap) |
| `tim skill scaffold` | --run-id NAME [--dry-run] [--json] | CREATE — materialise SKILL.md + references/ + assets/ + tools/<name>/ stubs + `decisions.md` from `decisions.json`; append allowlist entries |
| **understanding-check** | | |
| `tools/understanding-check/start-check.sh` | EUDPA-X | Step 0 dispatcher — emits `MODE: FRESH` or `MODE: RESUME` |
| `tools/understanding-check/prepare-check.sh` | EUDPA-X [--json] [--max-diff-bytes N] | Step 1 — fetch ticket + PRs, cache redacted diffs, bake best-practices, seed meta + per-repo analysis placeholders |
| `tools/understanding-check/redact-diff.js` | IN OUT | Helper — redact env vars / API keys / PEM blocks in a diff before it lands on disk |
| `tim understanding-check analysis add-finding` | EUDPA-X --repo R --section S --evidence-file F --evidence-lines L --field K=V ... [--json] | ANALYST helper — append finding (rejects without evidence) |
| `tim understanding-check analysis complete` | EUDPA-X --repo R --change-summary "..." --why-it-changed "..." [--json] | ANALYST helper — mark per-repo analysis complete |
| `tools/understanding-check/question-add.sh` | EUDPA-X --category C --prompt "..." --anchor-file F --anchor-lines L --expected-concepts CSV --rubric-pass "..." --rubric-partial "..." --rubric-fail "..." | QUESTION_GENERATOR helper — append question (caps at 12; rejects hedged rubrics) |
| `tools/understanding-check/question-replace.sh` | EUDPA-X --id QN ... | Plan-gate edit — replace question by id |
| `tools/understanding-check/question-remove.sh` | EUDPA-X --id QN | Plan-gate edit — drop a question (renumbers downstream ids) |
| `tools/understanding-check/transcript-record-answer.sh` | EUDPA-X --question-id QN --answer-file F [--skipped] | Interview — persist developer's answer |
| `tools/understanding-check/transcript-add-score.sh` | EUDPA-X --question-id QN --verdict V --rubric-match "..." --missed-concepts CSV --evidence-cited file:lines[,...] [--follow-up "..."] | SCORER helper — append score (forces FAIL/unscorable if rubric_match doesn't overlap a clause) |
| `tim understanding-check counts` | EUDPA-X [--json] | Diagnostic — PASS/PARTIAL/FAIL/security-FAIL/coverage-gap counts |
| `tim understanding-check verify` | EUDPA-X [--json] | Step 7 gate — every question scored, every finding has evidence; gaps on stderr, exit 1 |
| `tim understanding-check finalize` | EUDPA-X [--json] | Step 7 — apply deterministic counting rule, stamp verdict + exit code (0 pass, 1 needs-review, 2 high-risk) |
| `tools/understanding-check/render-report.sh` | EUDPA-X [--preview] | Plan-gate preview (Step 4) or full report (Step 7) |
| **sonar** | | |
| `tools/sonar/sonar-push-check.sh` | (reads `.tool_input.command` from stdin JSON) | Canonical `PreToolUse(Bash)` hook body, referenced by every SonarCloud-integrated repo's `.claude/settings.json` via its `$HOME`-absolute path rather than duplicated per repo. Fires only when the command is an actual `git push`; runs the real build/test/analysis pipeline CI uses (`mvn clean verify sonar:sonar` for Java repos, `npm ci && npm test` then `sonar-scanner` for Node repos, scoped to the current branch's open PR when one exists) and blocks the push (exit 2) if the SonarCloud quality gate fails. Requires `SONAR_TOKEN` in the environment; skips gracefully (exit 0) if it's unset, `jq`/`gh` are missing, or the repo isn't recognised as Java/Node. See CLAUDE.md's "SonarCloud integration" section for why this replaced the (unlicensed-for-this-org) `sonar analyze agentic` Stop hook. |
