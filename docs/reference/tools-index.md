# Tools (`tools/`)

Shared shell scripts called by skills via
`~/git/defra/trade-imports-workspace/tools/<domain>/<script>`. Environment:
`JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`.

**`tools/` is bash only.** Each script here is bash, and its tests are bash
scripts beside it named `<script>.<aspect>.test.sh`, each with a `check()`
helper (for example `tools/review/share-review.summary.test.sh`). New
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
counts the labels in a board's backlog. `tim jira prereqs` writes the
ticket-creator's session-start files under
`workareas/ticket-creation/.prereqs/`. Every ticket the workspace raises,
epics included, goes through `tim jira create`.

| Script | Args | Purpose |
|---|---|---|
| **jira** | | |
| `tim jira ticket` | EUDPA-X [--rendered] [--json] | Get ticket |
| `tim jira comments` | EUDPA-X [--json] | Get comments |
| `tim jira comment` | EUDPA-X (--body "Comment" \| --file F) [--confirm] | Add comment (dry run without `--confirm`) |
| `tim jira transition` | EUDPA-X "Status" [--list] [--resolution R] [--json] | Change status. Takes a status or a transition name; `--list` prints `transition -> status` |
| `tim jira search` | (words \| --jql "JQL") [--limit N, up to 500] [--json] | Search the project by words or JQL |
| **github** | | |
| `gh search prs`, `gh pr view`, `gh pr diff` | EUDPA-X --owner DEFRA; N --repo DEFRA/R | Find a ticket's PRs and read their details and diffs with the GitHub CLI directly |
| `tim review file-diff` | file (--ticket EUDPA-X --repo R \| --stdin) [--json] | PR diff filtered to one file, from the review's cached `.diffs/{repo}.diff`, or a `gh pr diff` piped in with `--stdin` |
| **confluence** | | |
| `tools/confluence/page.sh` | page-id [summary\|json] | Get page |
| **review** | | |
| `tim review start` | EUDPA-X \| --local R B [--files F1,F2] | Step 0 — say MODE: FRESH (raw folder ready for gh) or MODE: REFRESH (refresh scope built) |
| `tim review prepare` | EUDPA-X \| --branch B [--desc D] \| --local R B [--files F1,F2] [--select] [--json] | Build the review workspace from what `gh search prs`, `gh pr view`, `gh api .../files` and `gh pr diff` saved (see the review skill, Step 1). `--select` lists the PR per repo to save |
| `tim review verify files` | EUDPA-X [--json] | Check every file each PR changes has a reviewed `.review.json`. Reads `.prs/{repo}-{pr}.json`, written first by `gh api repos/DEFRA/{repo}/pulls/{pr}/files --paginate --slurp` |
| `tim review verify consistency` | EUDPA-X [--json] | Check consistency |
| `tim review verify style` | EUDPA-X [--json] | Check code style review coverage |
| `tim review file init` | EUDPA-X --repo R --file F --commit SHA [--pr N] --mode M [--json] | Initialise per-file `.review.json` placeholder; prints its path |
| `tim review file add` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." [--best-practice PATH] [--json] | Append a finding to a per-file JSON; prints its id. C is a finding category; any other is refused |
| `tim review file verdict` | EUDPA-X --repo R --file F --verdict V [--reason "..."] [--json] | Set verdict (marks file as reviewed) |
| `tim review aggregate` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Populate `items.{repo}.json` + emit File Analysis Summary / Items markdown.<br>e.g. `tim review aggregate EUDPA-1 --repo backend --write-items`<br>Boundary: without `--write-items` it only emits markdown to stdout; `--write-items` (re)writes `items.{repo}.json` and renumbers IDs — FRESH population only, prior dispositions/status not preserved. |
| `tim review items list` | EUDPA-X [--repo R] [--file F] [--filter ...] [--status ...] [--json] | List items from `items.{repo}.json` as TSV (`--json`: the items are `result`) |
| `tim review items mark` | EUDPA-X --repo R --item N --disposition V [--note "..."] [--json] | Set Disposition (auto-sets Status).<br>e.g. `tim review items mark EUDPA-1 --repo backend --item 3 --disposition Fix`<br>`Merged` needs `--note "merged into #N"`, naming the owner item.<br>Boundary: sets Disposition and lets it drive Status (vs `tim review items status`, which sets Status alone). |
| `tim review items status` | EUDPA-X --repo R --item N --status V [--note "..."] [--json] | Set Status only.<br>e.g. `tim review items status EUDPA-1 --repo backend --item 3 --status Done`<br>Boundary: sets Status directly and leaves Disposition untouched (vs `tim review items mark`, which sets Disposition and derives Status). |
| `tim review items add` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." [--best-practice PATH] [--json] | Append new item; prints new ID. C is a finding category |
| `tim review items counts` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tim review items render` | EUDPA-X --repo R [--write] [--json] | Render `items.{repo}.json` as the `## Items` markdown view; `--write` puts it into `review.{repo}.md` in place of the old table; a fix's "Must:" and "One way:" parts get a column each |
| `tim review refresh scope` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--json] | Refresh: pull + diff + lists A/B/C/D. Prints a summary; `--json` gives the lists.<br>e.g. `tim review refresh scope EUDPA-1 --write-snapshot --json`<br>Boundary: classifies files into the refresh work-lists; `--write-snapshot` records the window and clears the findings of files to review again (vs `tim review reconcile`, which mutates `items.{repo}.json`). |
| `tim review reconcile` | EUDPA-X --repo R [--dry-run] [--json] [--force] | Refresh Step R5 — fold `.review.json` findings into items.json + emit Fix+Done spot-check advisory.<br>e.g. `tim review reconcile EUDPA-1 --repo backend`<br>Boundary: runs after `tim review refresh scope` and appends new findings into `items.{repo}.json` (vs `tim review refresh scope`, which only lists them). |
| `tim review refresh pull` | EUDPA-X [--repo R] [--json] | Refresh helper: pin each review clone to its PR, fetch and detach |
| `tim review refresh merge-resolved` | REPO_DIR PRIOR_SHA HEAD_SHA [--json] | Refresh helper: hand-resolved merge files |
| `tim review refresh gaps` | EUDPA-X --repo R --pr N [--json] | Refresh helper: PR files with no `.review.json`, from `.prs/{repo}-{pr}.json` written by `gh api repos/DEFRA/{repo}/pulls/{pr}/files --paginate --slurp` |
| **style** | | |
| `tim style start` | EUDPA-X [--no-pull] [--repo R] \| --local REPO BRANCH [--files F1,F2] [--json] | Step 0 — detect FRESH/REFRESH and run `tim style prepare`, or `tim style scope --write-snapshot` after a `MODE: REFRESH` line |
| `tim style prepare` | EUDPA-X \| --local REPO BRANCH [--files F1,F2] [--json] | Fresh Step 1 — init `.style.json` placeholders + per-(repo,topic) rules bundles, from the PR files in `.prs/{repo}-{pr}.json` (refuses a missing or empty one) |
| `tim style topics` | PATH [--json] | Pure path→topic router; reads `.claude/skills/code-style/assets/routing.json` |
| `tim style bundle` | EUDPA-X REPO TOPIC [REPO_DIR] | Bundles TOPIC's files (from `.claude/skills/code-style/assets/routing.json`) into `style-rules.{repo}.{topic}.md` |
| `tim style aggregate` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Write `items.{repo}.json` from per-file `.style.json` + emit markdown sections |
| `tim style items render` | EUDPA-X --repo R | Render `items.{repo}.json` as the `## Items` markdown view (the table `tim style aggregate` also writes) |
| `tim style items list` | EUDPA-X [--repo R] [--file F] [--filter ...] [--status ...] [--by-file] [--json] | List items |
| `tim style items mark` | EUDPA-X --repo R --item N --disposition V [--note "..."] | Set Disposition |
| `tim style items status` | EUDPA-X --repo R --item N --status V [--note "..."] | Set Status only |
| `tim style items add` | EUDPA-X --repo R --file F --line L --rule R --severity S --issue "..." --fix "..." [--category C] [--best-practice PATH] | Append new item. C, when given, is a code-quality or design category |
| `tim style items counts` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tim style file init` | EUDPA-X --repo R --file F --commit SHA [--pr N] --mode M | Initialise per-file `.style.json` placeholder |
| `tim style file add` | EUDPA-X --repo R --file F --line L --rule R --category C --severity S --issue "..." --fix "..." [--best-practice PATH] | Append a finding to a per-file `.style.json`. C is a code-quality or design category; any other is refused |
| `tim style file verdict` | EUDPA-X --repo R --file F --verdict V [--reason "..."] | Set per-file verdict (marks file as reviewed) |
| `tim style scope` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--json] | Refresh: pull + diff + lists A/B/C/D over the files with a style topic; List D reads `.prs/{repo}-{pr}.json` |
| `tim style reconcile` | EUDPA-X --repo R [--dry-run] [--force] [--json] | Refresh Step R5 — fold `.style.json` findings into items.json + emit Fix+Done spot-check advisory |
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
| `tim govuk start` | --ticket EUDPA-X \| --branch B [--target V] [--force] [--json] | Phase 1 dispatcher: `.run-meta.json` (repos whose `package.json` lists govuk-frontend) + branch setup per repo + version discovery from the npm registry + cached CHANGELOG and per-version sections + best-practices bundle + security pre-flight (`npm audit`) |
| `tim govuk classify` | --run-id TICKET --repo R --govuk-version V --classification todo\|noop [--summary "..."] [--json] | VERSION_PLANNER: set classification |
| `tim govuk add-change` | --run-id TICKET --repo R --govuk-version V --file F --why "..." --change "..." [--json] | VERSION_PLANNER: append change entry |
| `tim govuk apply` | --run-id TICKET --repo R --govuk-version V [--final] [--json] | Phase 3 per-version: package.json + install + test + commit + mark-done |
| `tim govuk mark-done` | --run-id TICKET --repo R --govuk-version V [--commit SHA] [--json] | Phase 3: mark version applied |
| `tim govuk mark-failed` | --run-id TICKET --repo R --govuk-version V --reason "..." [--json] | Phase 3: mark version failed |
| `tim govuk render-plan` | --run-id TICKET --repo R --govuk-version V [--json] | Markdown view of one version's plan (`--json`: `result.markdown`) |
| `tim govuk summaries` | --run-id TICKET [--repo R] [--json] | PLAN_WALKER: one summary row per version still to apply that is not a noop (`--json`: the rows are `result`) |
| `tim govuk plans` | --run-id TICKET [--repo R] [--filter F] [--sort-semver] [--json] | Filterable status of every version, classification and implementation.<br>e.g. `tim govuk plans --run-id EUDPA-1 --filter pending --sort-semver --json` (the object is `result`) |
| **ticket** | | |
| `tim ticket prepare-plan` | EUDPA-X [--repos r1,r2] [--json] | Pre-bake `ticket.md` + `.plan-meta.json` + per-repo `best-practices/<repo>.md` for PLANNER |
| `tim ticket prepare-implement` | EUDPA-X [--repo R] [--json] | Assert plan, re-validate detect-tech, emit `.implement-meta.json`. IMPLEMENTOR caches prior PR diffs with `gh` |
| `tim ticket branch` | EUDPA-X\|NO_JIRA --repo R --slug S [--type feat\|fix\|chore] [--base B] [--json] | Fetch → checkout base → pull → checkout `<type>/EUDPA-X-<slug>` (the local branch, else one tracking origin, else a new one). `--type` defaults to `feat`; any other value is refused |
| **ticket-creator** | | |
| `tim jira prereqs` | [--board ID] [--cap-page ID] [--json] | Refresh `workareas/ticket-creation/.prereqs/` with active EUDPA epics + EUDP capability codes. `capabilities.txt` is replaced only when the synced map is canonical and gives at least `MIN_CAPABILITIES` codes (default 20); prints `WARNING:` for a stale map and `ERROR:` (exit 1) when the codes were not refreshed.<br>e.g. `tim jira prereqs`<br>Boundary: only refreshes the prereqs cache for the interview; creates nothing (vs `tim jira create`, which actually creates the ticket in Jira). |
| `tim capabilities extract` | \<markdown-file\> [--format list\|tsv] [--json] | Strict parser for the capability map. `list` emits `CODE — Name [STATUS]` or refuses outright; `tsv` emits every anchored row with a verdict.<br>Boundary: parses only — the caller decides what to do with a violation. |
| `tim capabilities check` | [--cap-page ID] [--no-sync] [--quiet] [--json] | Refresh the synced capability map from Confluence (unless `--no-sync`; a failed refresh is reported and the local copy is checked), then report on its conformance: per-row verdicts, violations grouped by rule, unknown status values. Exits non-zero while any row is non-canonical.<br>Boundary: writes only the synced map, never the prereqs cache (vs `tim jira prereqs`, which writes it). |
| **skill-creator** | | |
| `tim skill start` | "<trigger phrase>" [--json] | Step 0 dispatcher — parses trigger, emits `MODE: CREATE` / `MODE: AUDIT_ONE` / `MODE: AUDIT_ALL` + JSON payload (`--json`: the mode is `result.mode`) |
| `tim skill answer` | --run-id NAME --field PATH --value JSON [--json] | CREATE — atomic mutation of `decisions.json` (one shape question per call) |
| `tim skill render` | --run-id NAME [--json] | CREATE — markdown view of `decisions.json` (mid-interview recap) |
| `tim skill scaffold` | --run-id NAME [--dry-run] [--json] | CREATE — materialise SKILL.md + references/ + assets/ + tools/<name>/ stubs + `decisions.md` from `decisions.json`; append allowlist entries |
| **understanding-check** | | |
| `tim understanding-check start` | EUDPA-X [--json] | Step 0 dispatcher — emits `MODE: FRESH` (and makes the check's `.raw/` folder) or `MODE: RESUME` |
| `tim understanding-check prepare` | EUDPA-X [--select] [--max-diff-bytes N] [--json] | Step 1 — reads the pull requests, head SHAs and diffs the skill saved into `.raw/` with `gh`; `--select` lists one pull request per repo to fetch; otherwise fetches the ticket from Jira, caches redacted diffs, bakes best-practices, seeds meta + per-repo analysis placeholders, then removes `.raw/` |
| `tim understanding-check analysis add-finding` | EUDPA-X --repo R --section S --evidence-file F --evidence-lines L --field K=V ... [--json] | ANALYST helper — append finding (rejects without evidence) |
| `tim understanding-check analysis complete` | EUDPA-X --repo R --change-summary "..." --why-it-changed "..." [--json] | ANALYST helper — mark per-repo analysis complete |
| `tim understanding-check question add` | EUDPA-X --category C --prompt "..." --anchor-file F --anchor-lines L --expected-concepts CSV --rubric-pass "..." --rubric-partial "..." --rubric-fail "..." [--json] | QUESTION_GENERATOR helper — append question (caps at 12; rejects hedged rubrics) |
| `tim understanding-check question replace` | EUDPA-X --id QN ... [--json] | Plan-gate edit — replace question by id |
| `tim understanding-check question remove` | EUDPA-X --id QN [--json] | Plan-gate edit — drop a question (renumbers downstream ids) |
| `tim understanding-check answer` | EUDPA-X --question-id QN --answer-file F [--skipped] [--json] | Interview — persist developer's answer |
| `tim understanding-check score` | EUDPA-X --question-id QN --verdict V --rubric-match "..." --missed-concepts CSV --evidence-cited file:lines[,...] [--follow-up "..."] [--json] | SCORER helper — append score (forces FAIL/unscorable if rubric_match doesn't overlap a clause) |
| `tim understanding-check counts` | EUDPA-X [--json] | Diagnostic — PASS/PARTIAL/FAIL/security-FAIL/coverage-gap counts |
| `tim understanding-check verify` | EUDPA-X [--json] | Step 7 gate — every question scored, every finding has evidence; gaps on stderr, exit 1 |
| `tim understanding-check finalize` | EUDPA-X [--json] | Step 7 — apply deterministic counting rule, stamp verdict + exit code (0 pass, 1 needs-review, 2 high-risk) |
| `tim understanding-check report` | EUDPA-X [--preview] [--json] | Plan-gate preview (Step 4) or full report (Step 7) |
| **sonar** | | |
| `tools/sonar/sonar-push-check.sh` | (reads `.tool_input.command` from stdin JSON) | Canonical `PreToolUse(Bash)` hook body, referenced by every SonarCloud-integrated repo's `.claude/settings.json` via its `$HOME`-absolute path rather than duplicated per repo. Fires only when the command is an actual `git push`; runs the real build/test/analysis pipeline CI uses (`mvn clean verify sonar:sonar` for Java repos, `npm ci && npm test` then `sonar-scanner` for Node repos, scoped to the current branch's open PR when one exists) and blocks the push (exit 2) if the SonarCloud quality gate fails. Requires `SONAR_TOKEN` in the environment; skips gracefully (exit 0) if it's unset, `jq`/`gh` are missing, or the repo isn't recognised as Java/Node. See CLAUDE.md's "SonarCloud integration" section for why this replaced the (unlicensed-for-this-org) `sonar analyze agentic` Stop hook. |
