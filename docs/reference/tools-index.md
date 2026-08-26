# Tools (`tools/`)

Shared shell scripts called by skills via
`~/git/defra/trade-imports-workspace/tools/<domain>/<script>`. Environment:
`JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY`.

| Script | Args | Purpose |
|---|---|---|
| **auth** | | |
| `tools/auth.sh` | | All services umbrella |
| `tools/jira/auth.sh` | | Jira |
| `tools/github/auth.sh` | | GitHub |
| `tools/confluence/auth.sh` | | Confluence |
| **jira** | | |
| `tools/jira/ticket.sh` | EUDPA-X [full\|summary\|json] | Get ticket |
| `tools/jira/comments.sh` | EUDPA-X | Get comments |
| `tools/jira/create-ticket.sh` | [-t Type][-p Parent][-P Priority][-l Label][-a] "Summary" | Create ticket.<br>e.g. `tools/jira/create-ticket.sh -t Task -p EUDPA-215 "Add boundary notes"`<br>Boundary: performs the live Jira creation (vs `ticket-creator/prepare-ticket-creation.sh`, which only pre-caches epics/capabilities beforehand). |
| `tools/jira/add-subtask.sh` | EUDPA-X "Summary" ["Desc"] | Add subtask |
| `tools/jira/add-comment.sh` | EUDPA-X "Comment" | Add comment |
| `tools/jira/attach-file.sh` | EUDPA-X FILE | Attach a file to a ticket.<br>e.g. `tools/jira/attach-file.sh EUDPA-333 diagram.svg`<br>Reference it inline from the description with wiki markup — `!diagram.svg\|thumbnail!`.<br>Re-attaching the same filename ADDS a second attachment rather than replacing it, so pair it with `delete-attachment.sh` when refreshing a file. |
| `tools/jira/delete-attachment.sh` | EUDPA-X FILENAME [--all] \| --id ID \| EUDPA-X --list | Delete an attachment, or list what a ticket has.<br>e.g. `tools/jira/delete-attachment.sh EUDPA-333 diagram.svg`<br>Refuses to act when several attachments share the filename, listing them instead — pick with `--id` or take all with `--all`.<br>Boundary: the delete half of the regenerate loop (vs `attach-file.sh`, which only adds). |
| `tools/jira/update-ticket.sh` | EUDPA-X field=value | Update fields |
| `tools/jira/transition-ticket.sh` | EUDPA-X "Status"\|--list | Change status |
| `tools/jira/get-issues-for-board.sh` | board-id [list\|summary\|json] | Board issues |
| `tools/jira/list-board-epics.sh` | board-id [list\|json] [--include-done] | List epics on a board |
| `tools/jira/list-board-labels.sh` | board-id [list\|json] | Aggregate label frequencies from a board's backlog |
| `tools/jira/search.sh` | "JQL" [list\|summary\|json] [--fields ...] | Run JQL across the project (paginates via v3 endpoint) |
| **github** | | |
| `tools/github/prs.sh` | EUDPA-X [list\|json\|urls] | Find PRs |
| `tools/github/pr-details.sh` | repo pr-num [full\|files\|json] | PR details |
| `tools/github/diff.sh` | repo pr-num | PR diff |
| `tools/github/file-diff.sh` | repo pr-num file-path | PR diff filtered to one file |
| **confluence** | | |
| `tools/confluence/page.sh` | page-id [summary\|json] | Get page |
| `tools/confluence/update-page.sh` | page-id "Title" content-file | Update page |
| `tools/confluence/sync-docs.sh` | [--dry-run] [--root-id ID] | Sync Confluence tree to docs/confluence/ |
| `tools/confluence/clean-docs.sh` | [args forwarded] | Wipe + re-sync docs/confluence/ |
| **github-actions** | | |
| `tools/github-actions/get-logs.sh` | repo run-id-or-url | Workflow run logs |
| `tools/github-actions/get-failure.sh` | repo run-id-or-url | Failed step logs |
| `tools/github-actions/run-status.sh` | repo run-id-or-url | Run status |
| `tools/github-actions/wait-for-run.sh` | repo run-id-or-url [timeout] | Wait for run |
| `tools/github-actions/trigger-workflow.sh` | repo workflow-file [branch] [key=value...] | Trigger workflow |
| `tools/github-actions/list-runs.sh` | repo [branch] [workflow] | List recent runs |
| **review** | | |
| `tools/review/start-review.sh` | EUDPA-X | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `tools/review/prepare-review.sh` | EUDPA-X [--json] | Setup workspace |
| `tools/review/verify-coverage.sh` | EUDPA-X [--json] | Check coverage |
| `tools/review/verify-consistency.sh` | EUDPA-X [--json] | Check consistency |
| `tools/review/verify-style-coverage.sh` | EUDPA-X [--json] | Check JS style review coverage |
| `tools/review/diff-since-review.sh` | EUDPA-X [--json] | Diff since last review |
| `tools/review/file-review-init.sh` | EUDPA-X --repo R --file F --commit SHA --pr N --mode M | Initialise per-file `.review.json` placeholder |
| `tools/review/file-review-add-item.sh` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." [--best-practice PATH] | Append a finding to a per-file JSON |
| `tools/review/file-review-set-verdict.sh` | EUDPA-X --repo R --file F --verdict V [--reason "..."] | Set verdict (marks file as reviewed) |
| `tools/review/aggregate-file-reviews.sh` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Populate `items.{repo}.json` + emit File Analysis Summary / Items markdown.<br>e.g. `tools/review/aggregate-file-reviews.sh EUDPA-1 --repo backend --write-items`<br>Boundary: without `--write-items` it only emits markdown to stdout; `--write-items` (re)writes `items.{repo}.json` and renumbers IDs — FRESH population only, prior dispositions/status not preserved. |
| `tools/review/review-items.sh` | EUDPA-X [--repo R] [--filter ...] [--status ...] [--json] | List items from `## Items` table |
| `tools/review/review-mark.sh` | EUDPA-X --repo R --item N --disposition V [--note "..."] | Set Disposition (auto-sets Status).<br>e.g. `tools/review/review-mark.sh EUDPA-1 --repo backend --item 3 --disposition Fix`<br>Boundary: sets Disposition and lets it drive Status (vs `review-set-status.sh`, which sets Status alone). |
| `tools/review/review-set-status.sh` | EUDPA-X --repo R --item N --status V [--note "..."] | Set Status only.<br>e.g. `tools/review/review-set-status.sh EUDPA-1 --repo backend --item 3 --status Done`<br>Boundary: sets Status directly and leaves Disposition untouched (vs `review-mark.sh`, which sets Disposition and derives Status). |
| `tools/review/review-add-item.sh` | EUDPA-X --repo R --file F --line L --severity S --category C --issue "..." --fix "..." | Append new item; prints new ID |
| `tools/review/review-counts.sh` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tools/review/render-items.sh` | EUDPA-X --repo R | Render `items.{repo}.json` as the `## Items` markdown view |
| `tools/review/refresh/scope.sh` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--human] | Refresh: pull + diff + lists A/B/C/D.<br>e.g. `tools/review/refresh/scope.sh EUDPA-1 --write-snapshot`<br>Boundary: read-only — classifies files into the refresh work-lists (vs `reconcile.sh`, which mutates `items.{repo}.json`). |
| `tools/review/refresh/reconcile.sh` | EUDPA-X --repo R [--dry-run] [--json] [--force] | Refresh Step R5 — fold `.review.json` findings into items.json + emit Fix+Done spot-check advisory.<br>e.g. `tools/review/refresh/reconcile.sh EUDPA-1 --repo backend`<br>Boundary: runs after `scope.sh` and appends new findings into `items.{repo}.json` (vs `scope.sh`, which only lists them). |
| `tools/review/refresh/pull-repos.sh` | EUDPA-X [--repo R] [--json] | Refresh helper |
| `tools/review/refresh/list-merge-resolved.sh` | REPO_DIR PRIOR_SHA HEAD_SHA [--tsv\|--json] | Refresh helper |
| `tools/review/refresh/list-coverage-gaps.sh` | REVIEW_DIR REPO PR_NUM [--tsv\|--json] | Refresh helper |
| **style** | | |
| `tools/style/start-style.sh` | EUDPA-X | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `tools/style/prepare-style.sh` | EUDPA-X [--json] | Fresh Step 1 — init `.style.json` placeholders + per-repo rules bundle |
| `tools/style/bake-rules-bundle.sh` | EUDPA-X REPO | Concatenate `docs/best-practices/` into `style-rules.{repo}.md` |
| `tools/style/aggregate-file-reviews.sh` | EUDPA-X --repo R [--write-items] [--section ...] [--json] | Write `items.{repo}.json` from per-file `.style.json` + emit markdown sections |
| `tools/style/render-items.sh` | EUDPA-X --repo R | Render `items.{repo}.json` as the `## Items` markdown view |
| `tools/style/style-items.sh` | EUDPA-X [--repo R] [--file F] [--filter ...] [--status ...] [--by-file] [--json] | List items |
| `tools/style/style-mark.sh` | EUDPA-X --repo R --item N --disposition V [--note "..."] | Set Disposition |
| `tools/style/style-set-status.sh` | EUDPA-X --repo R --item N --status V [--note "..."] | Set Status only |
| `tools/style/style-add-item.sh` | EUDPA-X --repo R --file F --line L --rule R --severity S --issue "..." --fix "..." [--best-practice PATH] | Append new item |
| `tools/style/style-counts.sh` | EUDPA-X [--repo R] [--json] | Summary by Disposition+Status |
| `tools/style/file-style-init.sh` | EUDPA-X --repo R --file F --commit SHA --pr N --mode M | Initialise per-file `.style.json` placeholder |
| `tools/style/file-style-add-item.sh` | EUDPA-X --repo R --file F --line L --rule R --severity S --issue "..." --fix "..." [--best-practice PATH] | Append a finding to a per-file `.style.json` |
| `tools/style/file-style-set-verdict.sh` | EUDPA-X --repo R --file F --verdict V [--reason "..."] | Set per-file verdict (marks file as reviewed) |
| `tools/style/refresh/scope.sh` | EUDPA-X [--repo R] [--no-pull] [--write-snapshot] [--human] | Refresh, filtered to `.js` |
| `tools/style/refresh/reconcile.sh` | EUDPA-X --repo R [--dry-run] [--json] [--force] | Refresh Step R5 — fold `.style.json` findings into items.json + emit Fix+Done spot-check advisory |
| **npm** | | |
| `tools/npm/start-upgrade.sh` | EUDPA-X --phase 1\|2\|3 [--repo R ...] [--strategy LEVEL] | Single dispatcher — phase 1 discovers + emits PACKAGE_PLANNER spawn manifest, phase 2 fans out per-repo runners, phase 3 emits WALKER handoff |
| `tools/npm/verify-classification-coverage.sh` | --run-id TICKET [--repo R] [--json] | Phase 1 coverage gate — fail iff any package.classification == null |
| `tools/npm/prebake-context.sh` | --run-id TICKET --repo R --package PKG | Best-effort fetch of changelog + grep usages; updates `context_baked` field |
| `tools/npm/bake-best-practices.sh` | --run-id TICKET --repo R | Concatenate dependency-relevant best-practices into per-repo bundle |
| `tools/npm/discover-upgrades.sh` | repo-path --run-id TICKET [--strategy LEVEL] [--json] | Discover outdated deps + seed `packages.{repo}.json` |
| `tools/npm/packages-init.sh` | --run-id TICKET --repo R --repo-path PATH --strategy LEVEL --ncu-version VER (--ncu-json JSON \| --ncu-file PATH) | Seed `packages.{repo}.json` from ncu output |
| `tools/npm/packages-list.sh` | --run-id TICKET [--repo R] [--package PKG] [--classification ...] [--risk ...] [--status ...] [--json] | List packages with filters |
| `tools/npm/packages-counts.sh` | --run-id TICKET [--repo R] [--json] | Counts by classification × status × risk |
| `tools/npm/packages-set-classification.sh` | --run-id TICKET --repo R --package PKG --classification auto\|manual --risk LOW\|MEDIUM\|HIGH --safe-for-automation true\|false --rationale "..." [--files-affected CSV] [--changes-required "..."] [--changelog-url URL] [--migration-guide-url URL] [--demoted-from-auto true\|false] | Set PACKAGE_PLANNER fields on one package |
| `tools/npm/packages-set-status.sh` | --run-id TICKET --repo R --package PKG --status todo\|inprogress\|done\|failed [--failure-reason "..."] [--commit-sha SHA] | Set implementation_status (+ commit_sha / failure_reason) |
| `tools/npm/run-automated-upgrades.sh` | repo-name --run-id TICKET | Phase 2 per-repo runner (JSON-state-driven) |
| `tools/npm/upgrade-one-package.sh` | --run-id TICKET --repo R --package PKG | Phase 2 internal: install + test + commit + rollback |
| `tools/npm/run-manual-upgrade.sh` | --run-id TICKET --repo R --package PKG | Phase 3 per-package manual runner (spawned by WALKER) |
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
| **parity** | | |
| `tools/parity/corpora.json` | (data) | Corpus profile: which repos a comparison's findings cite, where the captured evidence lives, the ordered path roots that turn a path as written in a finding into a path inside a repo, the bands, the pins, and the Pass A baseline. `sides[]` is a list, not a pair. Each side carries `app.baseURL`, `app.startCommand` and `app.cwd` — how `tim parity capture` starts it when nothing is already listening — and `requireVerification` says whether an ingest refuses a finding no verifier recorded looking at. |
| `tools/parity/start-comparison.sh` | [EUDPA-X] | Where a comparison picks up. With no run id, the corpora that exist and the interviews that are half finished; with one, `resume_at` for that run.<br>Boundary: the front door of COMPARE mode (vs `phase.sh`, which records and gates the phases it names). |
| `tools/parity/setup-add-answer.sh` | --run-id EUDPA-X --field F --value JSON | Write one interview answer atomically into `workareas/parity-setup/<run>/setup.json`, so an interrupted interview resumes from what was answered. |
| `tools/parity/scaffold-corpus.sh` | --run-id EUDPA-X [--dry-run] | Turn a finished interview into a corpus: the `corpora.json` entry, the workarea with its `specs/<side>/` directories, and a seeded `FINDING-CONTRACT.md` whose six per-corpus sections are marked and wrong on purpose. Refuses a side on a port the workspace stack owns, and a corpus that has not said whether the requirements side is signed off. |
| `tools/parity/phase.sh` | EUDPA-X status\|start\|done\|gate\|reset [phase] [--note "why"] | The phase ledger, so a run that stops is resumable. `--note` required on `done`. `gate` refuses a phase whose prerequisites have not run — an authoring agent spawned before the slicing is proven writes findings nobody owns, and an ingest run before the verification freezes the prose permanently. |
| `tools/parity/next-decision.sh` | EUDPA-X [--gate sam] [--domain D] [--json] | Pop the next undecided gated increment, newest-blocking-first. Exits 3 when the gate is clear.<br>Boundary: one at a time in the terminal (vs the report, which presents all of them at once for a batch). |
| `tools/parity/rule-decision.sh` | EUDPA-X inc-NNN accept\|reject\|defer\|falsified\|note --note "why" | Record a ruling, or attach a revalidation note. `--note` is required on every one. `falsified` also strips the id from anything that depended on it, because the build loop never treats a dropped dependency as satisfied. |
| `tools/parity/decision-counts.sh` | EUDPA-X [--json] | How many rulings are outstanding, by gate and domain. |
| `tim parity capture` | EUDPA-X --side S [--specs P] [--headed] | Run that side's own hand-written Playwright specs from `<workarea>/specs/<side>/` and record what the application does: on every screen a spec names, a full-page shot, an element crop per anchor, a page model and the rendered DOM, all from one page visit, plus `manifest.json` beside them. Starts the application when nothing is listening on the side's `baseURL`, and stops only what it started.<br>Boundary: takes the pictures (vs `coverage`, which says what the source claims exists). **Cannot run in parallel** — one server, one session. |
| `tim parity coverage` | EUDPA-X [--side S] [--strict] | Did we get everything? Enumerate a side's screens statically through the corpus's `enumerate.cjs` and diff that against the manifest. Honest by construction: it cannot be wrong about a screen it never reached, because it never has to reach one.<br>Boundary: what the source says exists (vs `capture`, which records what a spec could reach). |
| `tim parity slices` | EUDPA-X [--file P] [--strict] | Prove the slicing **before** anything is spawned: every captured screen owned by exactly one slice, exactly one slice owning the chrome, plus the split pairs and the one-sided screens with their owners.<br>Boundary: runs before the authoring fan-out (vs `yield`, which weighs what came back). |
| `tim parity yield` | EUDPA-X [--file P] [--fraction N] [--strict] | Did every slice deliver, and did a verifier record looking at every finding? Flags a slice well under the middle of the pack — a slice that ran out of context and truncated looks exactly like a quiet one — and names every finding with no `finding.verification`.<br>Boundary: run before `ingest`, which freezes the prose permanently. |
| `tim parity duplicates` | EUDPA-X [--all] | Candidate duplicate findings across the whole corpus at once, which no per-slice verifier can see. Finds candidates and strikes nothing: it measures two sentences, and whether two findings are one change is a judgement about what a person would do about them. |
| `tim parity heads` | EUDPA-X [--write] [--force] [--strict] | Where every application stood when the run began, and what has moved under it since. It cannot stop a mid-run commit; it makes one visible while the run is still open. |
| `tim parity ingest` | EUDPA-X [--replace] [--dry-run] | Assemble `backlog.json` from the one-file-per-finding JSON under `<workarea>/findings/`. **Composes `detail` at first sight of a finding and freezes it permanently**, and on a corpus declaring `requireVerification` refuses any finding no verifier recorded looking at. |
| `tim parity anchors` | EUDPA-X [--side S] [--write] | Write `anchors.<side>.json` from the `controls` each finding names: which controls the capture crops. Names every increment that named no control, because a whole-page shot may not stand in for a finding about one control.<br>Boundary: after `ingest`, before the re-capture that shoots the crops. |
| `tim parity check-evidence` | EUDPA-X [--strict] | Pin drift, capture integrity, screens with no picture, anchors that matched nothing, citations whose target has moved, and the exact commands that regenerate what is absent. The only command that reads all of them together — each alone can read green over a stale one of the others.<br>Boundary: the state of the evidence (vs `tim parity check`, which is the ten prose-migration invariants). |
| `tim parity repoint` | EUDPA-X --side S --to SHA [--accept] | Preview moving one side to a new capture, old picture beside new, before anything is superseded. `--accept` moves the corpus and nothing else — the seals still hold the old pictures, so the next report render lists every moved screen in its drift panel. |
| `tim parity report --reseal` | EUDPA-X | Accept every picture that moved since it was last shown. A person's statement, not a build step — never run it on someone's behalf. |
| `tim parity report --target artifact` | EUDPA-X | One self-contained `artifact.html` to send someone: element crops inlined as WebP, full-page shots named and linked rather than downsized. Requires `cwebp` (`brew install webp`). Does not write to the seal store. |
| **refine** | | |
| `tools/refine/prepare-refinement.sh` | EUDPA-X [--json] | Fetch Jira ticket + comments + Confluence links, seed `.refinement-meta.json` (verdict=null), stub `review.md`.<br>e.g. `tools/refine/prepare-refinement.sh EUDPA-1`<br>Boundary: Step 1 setup — fetches inputs and seeds verdict=null (vs `refine-finalize.sh`, which stamps the verdict at Step 5). |
| `tools/refine/refine-finalize.sh` | EUDPA-X --verdict V [--reason "..."] | Stamp verdict (READY \| NEEDS WORK \| SPIKE REQUIRED) + `completed_at` onto `.refinement-meta.json`.<br>e.g. `tools/refine/refine-finalize.sh EUDPA-1 --verdict READY`<br>Boundary: Step 5 — stamps the final verdict after `review.md` is filled (vs `prepare-refinement.sh`, which does the Step 1 setup). |
| **ticket** | | |
| `tools/ticket/prepare-plan.sh` | EUDPA-X [--repos r1,r2] [--json] | Pre-bake `ticket.md` + `.plan-meta.json` + per-repo `best-practices/<repo>.md` for PLANNER |
| `tools/ticket/prepare-implement.sh` | EUDPA-X [--repo R] [--json] | Assert plan, re-validate detect-tech, cache prior PR diff, emit `.implement-meta.json` |
| `tools/ticket/setup-branch.sh` | EUDPA-X --repo R --slug S [--base B] | Fetch → checkout base → pull → checkout -b `feature/EUDPA-X-<slug>` in one dispatch |
| **ticket-creator** | | |
| `tools/ticket-creator/prepare-ticket-creation.sh` | [--board ID] [--cap-page ID] | Refresh `workareas/ticket-creation/.prereqs/` with active EUDPA epics + EUDP capability codes.<br>e.g. `tools/ticket-creator/prepare-ticket-creation.sh`<br>Boundary: only refreshes the prereqs cache for the interview; creates nothing (vs `jira/create-ticket.sh`, which actually creates the ticket in Jira). |
| `tools/ticket-creator/extract-capabilities.sh` | \<markdown-file\> [--format list\|tsv] | Strict parser for the capability map. `list` emits `CODE — Name [STATUS]` or refuses outright; `tsv` emits every anchored row with a verdict.<br>Boundary: parses only — the caller decides what to do with a violation. |
| `tools/ticket-creator/check-capabilities.sh` | [--cap-page ID] [--quiet] | Diagnostic report on capability-map conformance: per-row verdicts, violations grouped by rule, unknown status values. Exits non-zero while any row is non-canonical.<br>Boundary: read-only reporting (vs `prepare-ticket-creation.sh`, which writes the prereqs cache). |
| **skill-creator** | | |
| `tools/skill-creator/start-skill-creator.sh` | "<trigger phrase>" | Step 0 dispatcher — parses trigger, emits `MODE: CREATE` / `MODE: AUDIT_ONE` / `MODE: AUDIT_ALL` + JSON payload |
| `tools/skill-creator/interview-add-answer.sh` | --run-id NAME --field PATH --value JSON | CREATE — atomic mutation of `decisions.json` (one shape question per call) |
| `tools/skill-creator/render-interview.sh` | --run-id NAME | CREATE — markdown view of `decisions.json` (recap + `decisions.md` sidecar) |
| `tools/skill-creator/scaffold-skill.sh` | --run-id NAME [--dry-run] | CREATE — materialise SKILL.md + references/ + assets/ + tools/<name>/ stubs from `decisions.json`; append allowlist entries |
| **understanding-check** | | |
| `tools/understanding-check/start-check.sh` | EUDPA-X | Step 0 dispatcher — emits `MODE: FRESH` or `MODE: RESUME` |
| `tools/understanding-check/prepare-check.sh` | EUDPA-X [--json] [--max-diff-bytes N] | Step 1 — fetch ticket + PRs, cache redacted diffs, bake best-practices, seed meta + per-repo analysis placeholders |
| `tools/understanding-check/redact-diff.js` | IN OUT | Helper — redact env vars / API keys / PEM blocks in a diff before it lands on disk |
| `tools/understanding-check/analysis-add-finding.sh` | EUDPA-X --repo R --section S --evidence-file F --evidence-lines L --field K=V ... | ANALYST helper — append finding (rejects without evidence) |
| `tools/understanding-check/analysis-set-verdict.sh` | EUDPA-X --repo R --change-summary "..." --why-it-changed "..." | ANALYST helper — mark per-repo analysis complete |
| `tools/understanding-check/question-add.sh` | EUDPA-X --category C --prompt "..." --anchor-file F --anchor-lines L --expected-concepts CSV --rubric-pass "..." --rubric-partial "..." --rubric-fail "..." | QUESTION_GENERATOR helper — append question (caps at 12; rejects hedged rubrics) |
| `tools/understanding-check/question-replace.sh` | EUDPA-X --id QN ... | Plan-gate edit — replace question by id |
| `tools/understanding-check/question-remove.sh` | EUDPA-X --id QN | Plan-gate edit — drop a question (renumbers downstream ids) |
| `tools/understanding-check/transcript-record-answer.sh` | EUDPA-X --question-id QN --answer-file F [--skipped] | Interview — persist developer's answer |
| `tools/understanding-check/transcript-add-score.sh` | EUDPA-X --question-id QN --verdict V --rubric-match "..." --missed-concepts CSV --evidence-cited file:lines[,...] [--follow-up "..."] | SCORER helper — append score (forces FAIL/unscorable if rubric_match doesn't overlap a clause) |
| `tools/understanding-check/counts.sh` | EUDPA-X [--json] | Diagnostic — PASS/PARTIAL/FAIL/security-FAIL/coverage-gap counts |
| `tools/understanding-check/verify-coverage.sh` | EUDPA-X [--json] | Step 7 gate — every question scored, every finding has evidence |
| `tools/understanding-check/finalize-verdict.sh` | EUDPA-X [--json] | Step 7 — apply deterministic counting rule, stamp verdict + exit code |
| `tools/understanding-check/render-report.sh` | EUDPA-X [--preview] | Plan-gate preview (Step 4) or full report (Step 7) |
