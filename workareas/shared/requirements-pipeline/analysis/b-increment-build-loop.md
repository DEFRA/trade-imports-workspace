# B. increment-build-loop and its Codex executor: analysis

Scope: `.claude/workflows/increment-build-loop.js` on `main` (1925 lines), `.claude/workflows/README.md` (123 lines), `.claude/workflows/codex/{implement,review,fix}.md` and `codex/schemas/{increment,findings}.json`, the diff against `origin/feat/parity-report-triage-view`, and a stage-by-stage comparison with `feat/NO_JIRA-frontend-alignment:.claude/workflows/frontend-alignment.js` (1374 lines). I also read `.claude/skills/build-orchestrator/SKILL.md` (the loop's only driver), the real backlogs the loop consumes (`workareas/journey-builder/EUDPA-409/backlog.json`, `workareas/trace-requirements/ched-pp/backlog.json`), `workareas/shared/build-loop-evolution/HANDOVER.md` and `workareas/shared/build-loop-amalgamation/DESIGN.md`, because they are the design record for this loop.

Line numbers are for `main` unless marked `FA:` (frontend-alignment.js on its branch).

---

## 1. What it is, in one paragraph

`increment-build-loop.js` is a serial, per-increment, ticket-to-merge pipeline. For each id in `CFG.increments` it raises or reuses a Jira ticket, cuts a branch in every repo the increment touches, checks the baseline is green, implements, fans out review (2n+1 Claude reviewers, or one Codex reviewer), adversarially refutes each finding, has a judge rule fix-now / defer / reject, fixes, runs the increment's own verification ladder, commits, pushes and raises one PR per repo, watches CI with a bounded fixer, collects GitHub approvals for the whole increment, merges in provider-before-consumer order, watches the base branch, moves the ticket to Done, and finally halts if the increment carries a `gate`. Every write-back goes to `backlog.json` (`ticket`, `branch`, `commit`, `prs[].merged/sha`, `status`, `notes`, `openQuestions`), which is also the resume state. It is driven one increment at a time by the `build-orchestrator` skill from the main session, because a subagent cannot call `Workflow` (README:7-11, build-orchestrator SKILL.md:12-25).

The lifecycle half (ticket, branch, PR, CI, merge, done) is mature, generic in shape, and paid for in incidents. The build half (implement, review, ladder) is where the recipe assumption lives and where the programme coupling to the animals/plants frontends is concentrated. It has **no planning stage**, and that single absence is what pushes backlogs toward being recipes.

---

## 2. Configuration: `FALLBACK` / `args`

`FALLBACK` at lines 90-110, read into `CFG` at line 111 only if `args.increments` is set (`args` plumbing is described as unreliable at 26-27). Every field and what uses it:

| Field | Default | Validation | Used by |
|---|---|---|---|
| `workarea` | `'shared/plant-products-ched-pp'` | required (137-141) | `BACKLOG = <abs>/workareas/<workarea>/backlog.json` (263-266); logs dir |
| `branch` | `'main'` | required (142-146). It is the BASE branch (32-33) | branch cut, PR base, merge target, guard rails |
| `scope` | `'plant-products'` (else workarea basename, 114) | none | commit subject `<type>(<scope>): <title>` (1470), wip subject (381) |
| `executor` | `'claude'` | `claude` or `codex` (147-149) | implement/review/fix branch (1100, 1247, 1359) |
| `lifecycle` | `'full'` | `full` or `local` (150-152) | whether Ticket/Branch/PR/CI/Merge/Done run; preserveWork mode (371) |
| `jiraProject` | `'EUDPA'` | none | `create-ticket.sh` env (898) |
| `epic` | `''` | must match `^[A-Z]+-\d+$` under full (153-157) | parent of raised ticket |
| `jiraInProgressStatus` / `jiraDoneStatus` | `'In Progress'` / `'Done'` | non-empty under full (158-162) | Ticket STEP 3, Done stage |
| `jiraBoard` | `13780` | numeric under full (163-167) | `move-to-board.sh` (919) |
| `ciFixAttempts` | `3` | non-negative int (168-170) | CI loop bound (1606) |
| `ciWatchMinutes` | `30` | none | `CI_WATCH_WINDOWS = ceil(min/10)` (130) |
| `requireApproval` | not in FALLBACK; `?? true` (125) | none | merge-stage STEP A (1729-1762) |
| `approvalWaitMinutes` | not in FALLBACK; `?? 20` (126) | none | `APPROVAL_POLLS = ceil(min/2)` (135) |
| `repos` | animals frontend/backend/tests (103-107) | all three keys, path `^repos/[^/]+$`, github `owner/name` (178-190) | `REPO_RULE`, every repo path, merge rank |
| `models` | `{}` | `heavy`/`light` strings (196-208) | `heavy()`/`light()` wrappers |
| `increments` | `['pp-053']` | none | the serial loop (847) |

Observations:

- **The default `workarea` no longer exists** in the canonical workspace (`workareas/shared/` has no `plant-products-ched-pp`; it lived in the retired `trade-imports-animals` clone per HANDOVER.md:51-55). A bare run throws at preflight (835-839). Harmless because build-orchestrator always patches `FALLBACK`, but it is stale.
- **`repos` is fixed at exactly three role keys**, `frontend | backend | tests` (179). An increment in `trade-imports-ins-frontend`, `-address-book`, `-reference-data`, `-dynamics-gateway`, `-ins-backend`, `-schemas` or the workspace repo itself can only be built by re-pointing one of the three roles for the whole run. A cross-repo increment spanning, say, ins-frontend + address-book + tests cannot be expressed. frontend-alignment's header `repos` map (N named keys, each `{path, clonePath, github, pr}`) has no such ceiling.
- The README config table (README:23-31) lists 7 of the 17 fields and omits `lifecycle`, all Jira fields, `requireApproval`, `ciFixAttempts`. The worked example (README:40-48) sets `branch: 'spike/trace-to-requirements'`, which is the *old* meaning; HANDOVER.md:67-68 warns that old configs carrying that value "will cut increment branches from the wrong place". README "The stages" table (56-65) stops at Land and says "Commits on green and marks the increment done; `git stash push -u` on red", and "What still stops for a human" says "Pushing. The loop commits but never pushes" (112). Both are wrong under `lifecycle: 'full'`, which is the default. **The README describes the pre-lifecycle loop.**

---

## 3. Every stage, in order, with what it reads from the increment

Legend: fields are those of the increment object in `backlog.json` unless stated.

### 3.0 Pre-loop

| Stage | Lines | Model tier | Does | Increment fields |
|---|---|---|---|---|
| workspace resolver | 238-261 | light | tries three candidate roots, returns `abs` + `tilde` | none |
| preflight | 827-839 | light | `jq -e '.increments | length'` | none |

The workspace resolver is a good pattern (the script has no filesystem, so an agent resolves the root and nothing hardcodes `/Users/...`). frontend-alignment hardcodes `ROOT_ABS = '/Users/samfarrington/...'` (FA:71), which is exactly what this avoids.

### 3.1 Ticket (full only) — 857-993, light

Reads: `ticket, branch, commit, prs, repo, kind, title` (867), plus `band` in STEP 7 (951-953), plus `acceptanceCriteria` copied into the Jira description (884-885, 891-896).

- Reuses `ticket` if set; else writes a wiki-markup description and calls `create-ticket.sh` once, then **immediately** persists `ticket` (901-902). Idempotent by construction.
- Transitions to the configured in-progress status by **exact string compare only** (904-916), never by inferring order.
- **Always** runs `move-to-board.sh` and reports `movedToBoard`; the script, not the agent, then refuses to continue if false (977-986).
- Computes `branch` = `<type>/<KEY>-<slug>` with `<type>` derived from `kind` (932-935); persists it.
- Computes `resumeAt` from `prs`/`commit` (938-946) and **explicitly never from the Jira status** (944-946).
- Computes `repos[]` from `repo` (`frontend|backend|tests|both`), falling back to `band` (`frontend-work`, `needs-backend`) with "include tests in every case that changes what a user sees" (948-959).

Coupling: `band` is a field of the DR1 parity backlogs, not a general concept. `both` means backend+frontend only. The acceptance-criteria copy assumes the increment has them; there is no instruction for an increment that doesn't (the template literally says `<first acceptance criterion>`).

### 3.2 Branch (full only) — 999-1045, light

Reads nothing from the increment directly (uses `ticket.repos`, `ticket.branch`). Refuses a dirty tree, fetches, checks out an existing local/remote branch or cuts `--no-track origin/<base>`, verifies upstream is not the base branch and repairs it if so (1027-1032). The `--no-track` + fully-qualified refspec pair (`PUSH_RULE`, 336-364) is the fix for a real incident where a work branch tracked `origin/main` in a `push.default=tracking` repo and a commit landed on the tests repo's `main`.

### 3.3 Baseline — 1062-1093, light

Reads the whole increment via `readIncrement` (1068), but uses only `repo`. Checks clean trees; refuses if any repo is on the base branch (1076-1079); runs `npm test` for frontend, `mvn -q test` for backend, "unit/lint script if one exists" for tests (1080-1083).

Defect: on red it `continue`s to the **next increment** (1092), whereas every other failure `break`s. Under `full`, the ticket has been raised, moved to the board and put In Progress, and the branch cut, and the run then carries on to another increment. The README says "the run stops at the first failure" (33). In practice build-orchestrator passes one id, so it surfaces as `not-landed`, but the loop contract is inconsistent.

Coupling: suite commands are hardcoded per role, not read from the repo or the backlog. frontend-alignment's planner captures the baseline of the stage's own `ladder` scripts (FA:701-702) instead.

### 3.4 Implement — 1098-1171, heavy

Reads (via `readIncrement`, 666-680): the whole object, naming `filesToTouch (paths + action + what), obligations, flowChanges, schemaFields, copyKeys, specs, acceptanceCriteria, verification, notes, openQuestions`, and the `recipe` field ("read ONLY what the increment's `recipe` field cites", 678-679).

Routes on `repo` (1109-1126):
- **frontend** → "the workspace frontend-change skill is your script... follow it verbatim... Do NOT improvise around a recipe" and "Where the increment cites a gap that no recipe covers, **the increment's own filesToTouch IS the script**" (1117-1119).
- **backend** → Java best practices, "the animals backend is the house reference" (1122).
- **tests** → Playwright best practices.

RULES (1128-1150) include programme-specific ones: `copy.en.js` AND `copy.cy.js` (1143), "NO display logic in obligations or the model" (1143-1144), "A page added to a journey breaks the preceding page's E2E spec... On this programme that has caught out EVERY add-page increment so far" (1131-1137). Also the generic and good ones: scope fence but "Work that belongs to THIS increment gets DONE, never deferred", `DEFERRED: <what>` marker (1138-1142), stage don't commit, 3 self-repair attempts, never weaken a test.

Codex mode (1100-1101): `codexStage(id, 'implement', ..., 'You are implementing increment ${id}.')`, i.e. the Codex brief carries everything.

Failure → `preserveWork` (370-406): under full, commit `wip(<scope>)` on the increment branch and push (so it travels between machines); under local, `git stash push -u`. Writes an "ATTEMPT FAILED" note and deliberately does **not** write `commit` (387-389) so resume does not skip the build. Good.

Note the increment's `implementorSkill` field (present on every EUDPA-409 increment, value `null` or a skill name) and `type` (`add-page`, `restore`, ...) are **never read by the loop**; routing is by `repo` only, and `type` reaches frontend-change only because frontend-change itself reads it.

### 3.5 Review — 1179-1251, heavy

Targets: `impl.changedFiles` minus `.log` (1173), **uncapped**. For each file one style reviewer (persona `code-style/references/STYLE_FILE_REVIEWER.md`) and one code reviewer (persona `review/references/FILE_REVIEWER.md`), plus one consistency reviewer (`CONSISTENCY_REVIEWER.md`).

Increment fields read: `acceptanceCriteria` ("what this code is supposed to do", 1211-1212), and in the consistency reviewer **"anything the increment's filesToTouch listed that is NOT in the diff, or in the diff but NOT listed"** (1241-1242), and "the named exemplar the increment cites" (1238). The code reviewer's trap list is frontend-set-specific ("route-shape vs link-builder confusion... PREFIX-FREE builders", 1220-1223). Style reviewer house rules (1195-1197) are workspace-generic and good.

All reviewers see only `git diff --staged` (1192, 1213, 1236). **On a resumed increment whose earlier attempt was preserved as a pushed `wip(...)` commit, the Claude reviewers do not see that part of the change.** The Codex review brief was fixed for exactly this (commit `256f8177` "review the increment's whole change, not just the index": review.md:59-76 diffs `<baseBranch>...HEAD` and the index). The Claude-mode prompts were not updated. The verify-findings prompt (1287) has the same gap.

Dead reviewers are silently dropped in Claude mode: `reviewResults.filter(Boolean)` (1250). In Codex mode a dead review throws (`codexResult`, 820-825; README:98-102 "A crashed reviewer must never read as approval"). Same principle, opposite behaviour by executor.

### 3.6 Verify findings — 1257-1311, heavy

Groups findings by file, one adversarial verifier per file, "Default to refuted" (1273-1274), numbered verdicts, reads `acceptanceCriteria`. A dead verifier or a missing verdict passes the finding through **marked unrefuted** rather than dropping it (1297-1304). This is the best-engineered piece of adjudication in the workspace and is byte-for-byte shared with FA:860-909.

### 3.7 Judge — 1316-1351, heavy

Reads the whole increment and the confirmed findings. Rules `fix-now | defer-to-open-question | reject`; defers are **written into the increment's `openQuestions`** in `backlog.json` (1337-1340). Bias: "a small correct increment over a large polished one" (1343-1345). fixNow items must be complete, self-contained instructions (1346-1347).

Defect: `(await agent(...)) ?? judgement` (1350). A dead judge silently becomes `{fixNow: []}`, so every confirmed finding is dropped and the increment proceeds as clean. Contradicts the "crashed reviewer must never read as approval" principle.

### 3.8 Fix — 1356-1390, heavy

Claude: persona `REVIEW_ITEM_FIXER.md` (+ `STYLE_IMPLEMENTOR.md`), applies `fixNow` only, stages. **The result is not checked at all** (1373 `await agent(...)` discarded). A fixer that reports ok:false or dies still proceeds to the ladder. Codex: `codexResult` throws on no result (1360-1371).

### 3.9 Ladder — 1395-1426, light

Reads `verification` and **runs it "IN ORDER"** (1401). Up to 3 repairs; never weaken a test; the one exception for an assertion that is wrong about the framework (four conditions, 1405-1415), which is a thoughtful rule. Flaky journey specs with retries count as pass if said explicitly (1418-1420). "could not run" is `green:false` (1421-1422).

**This is the stage that most requires a recipe.** If the increment carries no `verification`, the Claude ladder has no rule for what to run. (The Codex fix brief has a fallback, fix.md:45-46: "or where it has none, the unit, format and lint rungs the repo defines"; the Claude ladder does not.) EUDPA-409's verification entries are full shell commands with absolute tilde paths into one specific repo (`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend run test:fit:ci`), i.e. the backlog author wrote the test plan into the requirement.

The ladder model tier is **light** (1425) while it is allowed to edit code for repairs. frontend-alignment runs its ladder on Sonnet (FA:1000).

### 3.10 Land — 1431-1481, light

Red ladder → `preserveWork` and **break** (1433-1454). Green → commit per repo on the work branch after proving `HEAD` is not the base branch (1463-1467); subject `<type>(<scope>): <title>` (1470); writes `commit` (and `status: done` under local only, 1475). Trailer hardcoded `Co-Authored-By: Claude Opus 5 (1M context)` (1472).

### 3.11 Pull request (full) — 1510-1564, light

Per repo: prove on branch, skip repos with zero commits ahead (1526-1530: repos are "listed generously so they get branched"), push by refspec, reuse an open PR, refuse if only merged/closed exist (1537-1538), otherwise create; persist `prs[]` **after each repo** (1545-1548).

### 3.12 CI (full) — 1570-1708, watch light / fix heavy

Watcher blocks on `gh pr checks --watch` with the 10-minute Bash ceiling repeated `CI_WATCH_WINDOWS` times; unresolved = RED; "no checks configured" is `blocked` (1590-1591). Fixer reads the real failed log and `test-results/*/error-context.md`, and must branch any **new** repo it touches (1631-1643) and register any PR it raises in both the backlog and `newPrs` (1647-1670), which the script folds into `prs` (1682-1687). Exhausted → `ci-red`, PR left open.

### 3.13 Merge (full) — 1714-1854, light

`sortForMerge` by `MERGE_RANK = {backend:0, tests:1, frontend:2}` (299-301): provider before consumer, tests before frontend because CDP runs the tests suite against the deployed frontend. Whole-increment approval gate first (STEP A, 1732-1761), then merges one by one, re-watching each later PR after the previous merge, watching the base branch after every merge, and a **final sweep** of all three GitHub repos for any open PR still on the branch (1797-1806). Machine-readable `stopReason` enum (657-660) distinguishes `awaiting-approval` / `changes-requested` (healthy pauses) from `main-red` / `pr-left-open` (1826-1850).

Defect: the approval wait uses `sleep 120` (1748) although `GUARDRAILS` says "NEVER sleep-poll. Foreground `sleep` is denied" (325). frontend-alignment solved this with allowlisted watcher scripts (`tools/github-actions/wait-for-pr-checks.sh`, FA:427) that poll for the agent.

### 3.14 Done (full) — 1860-1905, light

Transition to Done by exact name; verify; set `status: "done"` in the backlog, keep `ticket/branch/commit/prs` as the record.

### 3.15 Gate check — 1909-1922, light

`jq -r '... | .gate'`; anything but `null` halts the run **after** landing. A gate of `false` or `""` would halt too (it only tests the literal string `null`).

### 3.16 Stage shape summary

`Ticket → Branch → [Baseline → Implement → Review(2n+1) → Verify → Judge → Fix → Ladder → Land] → PR → CI(watch/fix)* → Merge(approve-all → merge-in-order → watch base → sweep) → Done → Gate`

Agents per increment: README/orchestrator quote `15 + 3n` (Claude) and `18 + n` (Codex).

---

## 4. The ticket-to-merge lifecycle and its resume model

The resume model is the loop's strongest design element and should be kept verbatim:

1. **Every externally visible artefact is persisted onto the increment the moment it exists**: `ticket` (901-902), `branch` (929-931), `commit` (1475), `prs[]` per repo (1545-1548, 1666-1668), `prs[].merged/sha` per merge (1794-1795), `status: done` last (1873-1875).
2. **`resumeAt` is derived only from those fields** (938-946): `prs` all merged → done; `prs` non-empty → ci; `commit` set → pr; else build. Never from the Jira status.
3. **Failed attempts are preserved on a pushed `wip(...)` commit**, and `commit` is deliberately left unset so the next attempt rebuilds on top (387-390).
4. Two machine-state channels for the same fact where needed: `newPrs` for the running script, `prs` in the backlog for a resume (1669-1670).

What the loop does **not** persist: any explicit failure status. A failed increment keeps whatever `status` it had (typically `todo`) plus an "ATTEMPT FAILED" note; `ci-red`, `awaiting-approval` etc. live only in the workflow's return value. build-orchestrator infers "not landed" from `status != done` (SKILL.md:222-233). frontend-alignment instead writes explicit statuses (`ladder-red`, `ci-red`, `e2e-red`, `sync-blocked`, `implement-failed`, and human-set `ci-retry` / `e2e-retry`; FA:537-544, 652, 773, 1014, 1121, 1224), and its baseline refuses to build past them. That is more legible for a human and for a report.

---

## 5. The Codex executor

### 5.1 Wiring

`CODEX` table (688-705) maps `implement → implement.md + increment.json`, `review → review.md + findings.json`, `fix → fix.md + increment.json`, each with a relay instruction.

Two agents per Codex stage (`codexStage`, 809-818):

1. **Shell** (`codexRun`, 715-788, light): writes a prompt file `logs/<id>-<stage>.prompt.md` that says "Read `<BRIEFS>/<brief>` and follow it in full" plus a **placeholder binding table** (`<workspace> <workarea> <backlog> <logs> <skills> <branch> <baseBranch> <INCREMENT_ID> <frontendRepo> <backendRepo> <testsRepo>`, 729-740) and the stage instructions. Then runs `codex exec -C <TILDE> --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema <schema> -o <lastmsg> "Read <prompt> and follow it in full." > <log>` in **foreground slices**: 570s per call, and if the Bash tool backgrounds it, `pkill` + find the `session id:` and `codex exec ... resume <id>` (755-772), at most five slices. Reports **transport only**: ok iff the last slice exited 0 and `jq empty` accepts the last-message file (774-785).
2. **Relay** (`codexRelay`, 790-804, light): reads the last-message file and re-emits it in the Claude-side schema; for review, folds `confidence` into `why` and drops `summary` (697-698).

Why two agents: "keeps 'the run died' distinguishable from 'Codex reviewed the change and found nothing'" (683-687). That separation is sound and worth keeping for any external executor.

### 5.2 Briefs

- **implement.md**: "Your shell is normal", so ignore the Claude GUARD RAILS (8-12); repo bindings "bound per run... Never substitute a repo name you remember from another run" (31-33); Step 1 is the clearest statement anywhere of the requirement stance: "**How detailed it is varies enormously between backlogs, and a thin one is normal, not broken**... **You work out the solution. That is the job**... **Thin is fine; wrong is not.**" (47-62). Then Step 2 routes on `repo` exactly like the Claude implementor, including "the increment's own `filesToTouch` **is** the script" (78-81). Rules add "**Never edit `backlog.json`**... describe [new increments] fully in `notes`" (107-111), "run `npm run format`" (116-119), and "Browser-driven suites are not yours to run" because the Codex sandbox refuses Chromium its Mach port (123-132).
- **review.md**: one reviewer wearing all three personas (34-38); load tech rules only for languages present, read each at most once (40-52); whole-change diff including `<baseBranch>...HEAD` (59-76); priority list led by **scope-fence breaches against `filesToTouch`** (84-87); self-refute and set `confidence` (102-112); "Always report, even if you did not finish" (119-123).
- **fix.md**: ruled fixes only, finish every fix you start, a ruling overrides the finding's own fix, run the increment's `verification` or the repo's unit/format/lint rungs as fallback, `mvn verify` if backend `src/main` touched, skip browser rungs (21-56).

### 5.3 Schemas

`increment.json`: `ok, summary, changedFiles, notes`, all required, `additionalProperties: false`. `findings.json`: `findings[]{file, line|null, severity, category, what, why, fix, confidence}` + `summary`. The Claude-side `FINDINGS_SCHEMA` (452-475) has no `confidence` and no `summary`, hence the lossy relay (README:94-97, HANDOVER.md:82-83).

### 5.4 Codex-mode issues

- **Only implement / review / fix move to Codex.** Baseline, verify, judge, ladder, land, and the entire lifecycle stay on Claude (README:77-80). Fine as a design, but Codex review is 1 agent versus Claude's 2n+1, so "Codex mode" is not the same quality bar; the adversarial verifier then runs on Codex's already-self-refuted findings.
- **The shell prompt breaks its own guard rails**: step 2b is `pkill -f "..." ; grep -m1 "session id:" ...` (762), a `;` compound command, inside a prompt that also includes `GUARDRAILS` ("No `&&`, no `;`", 318).
- **Codex writes nothing to the backlog** (implement.md:107) but its `notes` channel is only read by the judge/orchestrator as prose. There is no structured `newIncrements[]` / `deferred[]` in `increment.json`, so "describe it fully in `notes`" relies on build-orchestrator's grep for `DEFERRED:` (SKILL.md:239-261).
- **No Codex plan stage** exists, because there is no plan stage at all.

---

## 6. Diff against `origin/feat/parity-report-triage-view`

The triage-view branch is **behind** main for this file, not ahead. `git log` shows main carries seven later commits on the loop that the branch lacks:

```
a66c3725 fix: let the ladder correct an assertion that is wrong about the framework
1cd8207d fix: a page added to a journey must update the preceding page's E2E spec
4fca1d7a fix: finish in-scope work, and check every deferral is tracked
3d4d51bf fix: run codex in resumable foreground slices, never in the background
09a694f0 fix: tell the codex shell agent how to wait, instead of letting it poll
256f8177 fix: review the increment's whole change, not just the index
c2f73cbc fix: make codex mode able to build, and to build the right repos
```

So `diff main origin/feat/parity-report-triage-view` shows those as removals. What the branch would regress if merged as-is:

- Codex run back to a single `run_in_background` call with `-C ${WORKAREA_TILDE}` (the bug 3d4d51bf/09a694f0 fixed), and no `<baseBranch>/<frontendRepo>/<backendRepo>/<testsRepo>` bindings.
- The preceding-page E2E rule, the `DEFERRED:` rule, and the framework-assertion exception all removed.
- Codex briefs back to hardcoded animals repos and the `uk.gov.defra.trade.imports.animals` package.
- A **duplicated `if (!ticket.movedToBoard)` block** (branch lines 943 and 957), a merge artefact.

The most important thing the diff reveals is **the direction of travel on the recipe question**. The branch's `codex/implement.md` says:

> "That object is your complete specification: `filesToTouch` (paths + action + what), `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, `acceptanceCriteria`, `verification`... It is self-contained **by design** — if you find yourself needing information that is not in it, that is a defect worth reporting in your `notes`, not a licence to improvise."

and its `review.md`: "Its `acceptanceCriteria` are the contract; its `filesToTouch` is the agreed scope fence."

Main's versions replaced that with "a thin one is normal, not broken... You work out the solution. That is the job... Thin is fine; wrong is not" and "Never raise a finding whose substance is that the increment was underspecified". **The briefs have already moved from recipe to requirement; the Claude-mode prompts in the .js file only half moved** (`readIncrement` 666-680 says both things at once, and the implement routing, consistency reviewer and ladder still depend on recipe fields). Nothing on the triage branch is worth salvaging for the loop.

---

## 7. Where the loop expects the increment to be a recipe

| # | Where | What it assumes | Why it is recipe-shaped |
|---|---|---|---|
| R1 | Ladder, 1401 | "run the increment's `verification` array IN ORDER" | The test plan is authored in the backlog as literal commands (EUDPA-409: full `npm --prefix ~/...plants-frontend run ...` strings). No fallback in Claude mode. The workflow should own "how do we prove this", from the repo's scripts plus the acceptance criteria. |
| R2 | Implement, 1117-1119 (+ implement.md:78-81) | "the increment's own `filesToTouch` IS the script" | The file list is the implementation plan. It belongs to a planner inside the workflow, not to the backlog. |
| R3 | Consistency reviewer, 1241-1242 (+ review.md:84-87) | flag anything in `filesToTouch` not in the diff, or in the diff and not listed | Uses the recipe as the scope fence, so a better solution than the backlog author imagined is reported as a defect. |
| R4 | `readIncrement`, 669-672, 678-679 | enumerates `filesToTouch, obligations, flowChanges, schemaFields, copyKeys, specs` and reads the `recipe` field | The loop's vocabulary for an increment is recipe vocabulary, and the field is literally named `recipe`. It does add "THE BACKLOG SAYS WHAT IS WRONG, AND WORKING OUT WHAT TO CHANGE IS YOUR JOB" (673-675), so the stance is mixed. |
| R5 | Implement routing, 1109-1126 | `repo` → a fixed skill (`frontend-change` = recipe-verbatim, "Do NOT improvise around a recipe") | Routing by a role key to a recipe-following skill means the increment has to be phrased as one of frontend-change's modes (`add-field`, `add-page`, ...) to build well. `type` is effectively a recipe selector. |
| R6 | Implement rule, 1145-1146 | "Write the specs the increment lists (co-located Playwright spec, axe test)" | Tests are expected to be enumerated in the backlog (`specs`). |
| R7 | Ticket stage, 884-885 | copies `acceptanceCriteria` into Jira verbatim | Fine as a requirement, but EUDPA-409's ACs are implementation assertions ("beforeAll wires it exactly as routes.js boots it — configureObligationSet(...), configureFulfilmentRegistry(...)"). The loop does nothing to distinguish outcome ACs from implementation steps. |
| R8 | Code reviewer, 1219-1223 | "the programme-specific traps the increment or its cited plan names" | Expects the backlog (or its `recipe` citation) to carry review focus. frontend-alignment's planner produces `reviewFocus` itself. |

Evidence the backlogs followed this pressure: in EUDPA-409, 31 of 65 increments carry all of `filesToTouch`, `verification`, `acceptanceCriteria` and `recipe`; `filesToTouch` entries cite specific line ranges ("replace the 'Read these files first' EXEMPLAR PLACEHOLDER (lines 12-30)"). Line numbers in a backlog go stale the moment an earlier increment lands, which is why the loop had to add "a citation whose line has moved on" to the defect list (676-677).

By contrast `trace-requirements/ched-pp/backlog.json` increments are `{id, title, kind, acceptanceCriteria, dependsOn, gate, milestone, sizeGuess, status, notes, blockedQuestion}` with **no** `repo`, `verification` or `filesToTouch`: a requirement-shaped backlog. Run through this loop it would hit STEP 7's `band` fallback (absent too), default nothing sensible for `repos`, and reach a ladder with nothing to run. So the loop today cannot actually build the requirement-shaped backlogs it claims to support ("Thin is fine").

---

## 8. Programme-coupled versus generic

**Generic and good (keep):** workspace resolver; guard rails block; `PUSH_RULE` + `--no-track`; `preserveWork`; the ticket stage's idempotency, exact-string status and unconditional board move; `resumeAt` from persisted fields; per-repo PR persistence; CI watch semantics (unresolved = red, no-checks = blocked); CI fixer's new-repo branching and `newPrs`; whole-increment approval gate; `stopReason` enum; final open-PR sweep; adversarial verify with fail-open-to-unrefuted; judge with defer-to-`openQuestions`; `DEFERRED:` marker; framework-assertion exception; Codex shell/relay split and slicing.

**Programme-coupled (needs lifting into config or into the plan stage):**

| Coupling | Where |
|---|---|
| Exactly three role keys `frontend/backend/tests`, `both` = backend+frontend | 179, 282-283, 948-959 |
| `MERGE_RANK` hardcoded to those keys | 299 |
| `band` values `frontend-work`, `needs-backend` | 951-953 |
| Default repos = animals | 103-107 |
| frontend → `frontend-change` skill (targets `src/server/app/sets/<set>/docs/add-a-*.md`) | 1110-1119 |
| "animals backend is the house reference" | 1122 |
| copy.en.js / copy.cy.js, obligations/model display-logic rule | 1143-1144 |
| "add a page breaks the preceding page's E2E spec... EVERY add-page increment so far" | 1131-1137 |
| route-shape vs link-builder, PREFIX-FREE builders, "platform-layer file that has learned a set's vocabulary" | 1220-1223 |
| consistency checks "page in dispatch but not in the contract table, features/index.js but not evaluation.js" | 1239-1241 |
| baseline commands `npm test` / `mvn -q test` | 1081-1083 |
| "Journey E2E specs on a fresh stack are known to be flaky" | 1419-1420 |
| trailer model string | 1472 |
| `kind` → branch type vocabulary (`test-coverage`, `test-infrastructure`, `fixture`) | 932-933 |

These are good *knowledge*, earned in incidents. The problem is placement: they sit in the generic stage prompts, so every programme pays for them and none can switch them off. They belong in (a) a per-target profile (the idea in `build-loop-amalgamation/DESIGN.md:48-75`, which `journey-builder`'s `tools/journey-builder/targets.json` already implements) and (b) the plan stage, which can pull the right rules for the files it decides to touch.

---

## 9. Stage-by-stage: increment-build-loop vs frontend-alignment

frontend-alignment (FA) is a programme-specific drain loop over `stages.json` (24 stages), on one long-lived branch, with draft PRs never merged. Its stage list (FA:7-23): Baseline, Sync, Plan, Implement, Review, Verify findings, Judge, Fix, Ladder, Land, Pull request, CI, (local) E2E, Report, Record, (workspace PR) E2E.

| Stage | Loop | FA | Stronger | Why |
|---|---|---|---|---|
| Config / programme data | `FALLBACK` holds programme config; `repos` fixed at 3 roles | `FALLBACK` holds only run knobs; **the programme is data in the `stages.json` header**: `branch, base, repos{key:{path,clonePath,github,pr}}, direction, invariants, targetTree, ciFixAttempts, ciWatchSeconds, reviewCap, rulings` (FA:42-44, header keys) | **FA** | The backlog is self-describing; N repos; invariants and direction are programme requirements the reviewers judge against. |
| Workspace path | resolver agent | hardcoded `/Users/samfarrington/...` (FA:71) | **Loop** | Portable. |
| Selecting work | fixed `increments[]` list; orchestrator derives one id at a time from `status` + `dependsOn` | each round re-reads `stages.json`, takes every `todo` in file order, so **stages appended mid-run are picked up** (FA:512-565) | **FA** for liveness, **loop+orchestrator** for dependency ordering | FA has no `dependsOn`; loop has no re-read. Combine: re-derive after each unit, by status + dependsOn. |
| Ticket | full Jira lifecycle, board move | none (NO_JIRA) | **Loop** | — |
| Branch | per-increment branch from fresh base, `--no-track`, upstream repair | one programme branch; baseline asserts it | **Loop** for per-increment delivery | FA's model suits a design demo, not a delivery. |
| Baseline | hardcoded `npm test` / `mvn test`; `continue` on red | checks branch + clean tree only for repos *pending* stages touch; classifies stage statuses including retry states; refuses to build past a red status (FA:520-551) | **FA** | Status-aware and scoped; test baseline moved into Plan using the stage's own ladder. |
| Sync with main | n/a (fresh cut per increment) | merge `origin/main` into every touched repo + tests + workspace; `merge-tree` dry run; conflicts → `sync-blocked` for a human (FA:613-661) | **FA** for long-lived branches | Solves "GitHub runs no checks on a conflicting PR". Relevant to the loop only if units become long-lived (e.g. a combined increment resumed days later). |
| **Plan** | **absent** | Opus planner reads the brief, the reference files and the current target files in full, the relevant best-practice docs, captures the ladder baseline, and writes `plans/<id>.md` with **0 Decisions, 1 Moves, 2 Edits, 3 New files, 4 Imports, 5 Tests, 6 Invariants to prove, 7 Out of scope**; returns `reviewFocus[]` (capped by `reviewCap`), `behaviourChanges[]`, `decisions[]`, `risks[]`; may refuse with ok:false (FA:687-731) | **FA, decisively** | This is the stage that lets the backlog be a requirement: the recipe is produced inside the workflow, by the strongest model, against the live code, at build time, so it cannot be stale. It also feeds review scope, the commit body and the report. |
| Implement | follows backlog recipe / frontend-change; Claude or Codex | Sonnet executes **the plan** verbatim; `git mv` for moves; DEFERRED marker; format/lint/unit as it goes; no Playwright (FA:736-780) | **FA** on input, **loop** on executor choice | Implementor gets a fresh, verified plan instead of a backlog recipe. |
| Review | 2n+1 over every changed file, uncapped; heavy tier | style + code per **plan.reviewFocus** (capped at 12), consistency on Opus; reviewers judge against **plan, reference files, invariants, ruling** (FA:787-858) | **FA** | Review focused where content changed (not pure moves); consistency reviewer **runs the plan's invariant proofs**. Loop's consistency reviewer compares against backlog `filesToTouch` instead. |
| Verify findings | identical code | identical code, plus checks against plan, ruling, invariants | **Tie** (FA slightly richer context) | Same mechanism. |
| Judge | heavy tier; defers to backlog `openQuestions`; dead judge = no fixes | Opus; defers to stage `openQuestions` "so it reaches the report"; RULING_RULE stops it reopening settled questions (FA:911-945) | **FA** | Ruling-aware; defers flow into a report. Same dead-judge weakness (FA:944). |
| Fix | Claude result ignored; Codex throws | result ignored (FA:953) | **Tie** (both weak) | Neither checks the fixer. |
| Ladder | `verification` array of literal commands from the backlog; light tier | `ladder` array of **npm script names** from the stage (header supplies repos); skip-if-undefined; brief overrides array; environment rules (EADDRINUSE, playwright:install); Sonnet (FA:973-1001) | **FA** | Script names are a requirement-level vocabulary ("format:check, lint, test, test:fit"), repo-portable, and cannot go stale the way a command line with a path does. |
| Land | commit per repo; `status` done only under local | commit per repo; `<type>` from ruling/behaviourChanges; body says "No behaviour change." or lists them; `Ruling:` line; records `commit` (object keyed by repo) and `status: landed` (FA:1026-1060) | **FA** on commit content; **loop** on the base-branch guard | Plan-derived commit bodies are a better audit trail. |
| PR | one PR per repo per increment, raised for merge | one long-lived **draft** per repo, via allowlisted `pr-ensure-draft.sh` (FA:1065-1099) | **Loop** for delivery | FA never merges by design. FA's script-over-raw-gh is better hygiene. |
| CI | `gh pr checks --watch` in 10-min windows; CI fixer can open PRs in new repos | allowlisted `wait-for-pr-checks.sh` with exit codes 0/1/2/4; `get-failure.sh` (FA:416-444) | **FA** on mechanism, **loop** on coverage | Script exit codes are deterministic; loop's `newPrs` handling is more complete. |
| Merge | whole-increment approval gate, ordered merges, base-branch watch, open-PR sweep | none | **Loop** | — |
| Local E2E | none (ladder may include an E2E leg if the backlog lists one) | decides whether the stage can change what the stack serves (skip otherwise), pulls clean `main` checkouts, `tim docker dev`, compose suite with one retry, reads `error-context.md`, always `tim docker down`; bounded fixer (FA:1140-1234) | **FA** | A real cross-repo end-to-end gate owned by the workflow, not by a backlog line. |
| Report | none; only the return value | **Report refresh** on Opus after each stage: move ruled question to "Rulings applied", add to "What was built", re-measure residual drift rows with `diff`, update checks table, fix stale caveats; `reportRefreshed` flag (FA:1248-1279); plus the one-off `s13` report writer (FA:571-606) | **FA** | The human-facing artefact is maintained continuously by the workflow. Sam's brief calls out report quality specifically. |
| Record state | backlog edits happen in place, never committed by the loop (orchestrator pushes) | `recordState` commits `stages.json`, `report.md`, `plans/` to the workspace repo and pushes (FA:474-499) | **FA** | State survives a dead session; build-orchestrator relies on the human/orchestrator to push. |
| Workspace-PR E2E | none | watches the workspace PR's cross-repo E2E on branch-tagged images; bounded fixer; re-push to re-run (FA:1302-1352) | **FA** | Programme-specific, but the idea (a final cross-repo gate) is general. |
| Models | `heavy`/`light`, both optional | `think` (Opus, high effort) for Plan, Judge, Consistency, Report; `doer` (Sonnet); `watcher` (Haiku, low effort) (FA:95-97) | **FA** | Three tiers mapped to thinking / doing / watching is the right split. Loop puts the ladder (which edits code) on the light tier. |
| Executor | Claude or Codex | Claude only | **Loop** | — |
| State-write safety | Edit tool on backlog, `jq empty` after | `stageNotes`: targeted jq updates only, "NEVER assign a whole stage object, never `|= select(...)`", prove nothing else moved (FA:150-158) | **FA** | Learned from lost SHAs/PRs. But see FA defect below. |

### FA defects worth knowing before borrowing from it

- **State corruption in `stages.json`**: the header carries stray keys `"s17-auth-convergence"`, `"s22"`, `"s24-cross-service-shape"` and a root-level `"ci"` object. These are per-stage `ci`/`localE2e`/`e2e`/`notes` records written at the document root instead of into `.stages[]`, almost certainly by the watcher's "Edit ${STAGES} so this stage's `${field}` holds ..." instruction (FA:440) running on Haiku without the targeted-jq discipline `stageNotes` imposes. The `s17` stray record even says "Pre-existing, unrelated to auth-convergence", a phrase Sam's rules ban. Lesson: **all backlog writes should go through one deterministic writer (a `tools/` script or a tim command), never free-hand edits by an agent**.
- Hardcoded absolute root (FA:71), session URL in the trailer (FA:136, 1081), special-cased stage id `s13-alignment-report` (FA:571), ins port 3002 (FA:991-993), tests repo path (FA:1169, 1173).
- No `dependsOn`; ordering is file order.
- Fixer result unchecked; dead judge = no fixes (FA:944), as in the loop.

---

## 10. Best bits to keep in the implementor

1. **The lifecycle half of the loop, intact**: ticket idempotency, exact-string status, board move, `resumeAt` from persisted fields, `--no-track` + refspec push, wip-commit preservation, per-repo PR persistence, CI watch semantics, CI fixer `newPrs`, whole-increment approval gate, `MERGE_RANK`, base-branch watch, open-PR sweep, `stopReason` enum.
2. **The adjudication chain, shared by both workflows**: review personas → adversarial verify (fail open to unrefuted) → judge (fix-now / defer-to-openQuestions / reject) → fixer.
3. **FA's Plan stage** as the missing piece: the workflow, not the backlog, owns files, moves, tests, invariants to prove, reviewFocus, behaviourChanges, decisions. It should run on the thinking tier and write `plans/<id>.md`.
4. **FA's ladder vocabulary**: script names (plus a target profile saying which scripts exist per repo), with skip-if-undefined, not literal commands in the backlog.
5. **FA's report refresh and state recording**: a maintained human report updated after every unit, and state committed.
6. **FA's three model tiers** (think / do / watch).
7. **The Codex shell/relay split with foreground slices**, and main's Codex briefs' requirement stance ("Thin is fine; wrong is not", "You work out the solution").
8. **The `DEFERRED:` marker** plus build-orchestrator step 3b (every deferral checked against the backlog or turned into a new increment).
9. **The framework-assertion exception** in the ladder (four conditions).
10. **Workspace-root resolver** over any hardcoded path.

---

## 11. Problems to fix, ranked

1. **No plan stage, so the backlog is forced to be the plan.** Root cause of every recipe smell in section 7.
2. **Ladder depends on backlog `verification`** with no fallback in Claude mode (1401).
3. **Repo model capped at three role keys** (179) with `both` = backend+frontend and `band` fallbacks; blocks most of the workspace's repos and any N-repo increment.
4. **Silent-success paths in Claude mode**: dead reviewers dropped (1250), dead judge = no fixes (1350), fixer result ignored (1373). Codex mode throws for the same conditions. Inconsistent and unsafe.
5. **Claude reviewers/verifiers see only `diff --staged`**, missing wip-committed work on a resumed increment; the Codex brief was fixed (256f8177), the .js prompts were not.
6. **Baseline red `continue`s** instead of stopping (1092) after the ticket and branch already exist.
7. **Programme-specific rules embedded in generic prompts** (section 8 table).
8. **Guard-rail self-contradictions**: `sleep 120` in the merge stage (1748) vs "NEVER sleep-poll" (325); `pkill ... ; grep` in the Codex shell (762) vs "no `;`" (318).
9. **Backlog writes are free-hand agent Edits** with `jq empty` as the only check. FA's stray header keys show how that degrades; the loop has the same exposure (judge, preserve, ticket, PR, merge, done all Edit `backlog.json`).
10. **No explicit failure statuses written back** (only notes); the report/orchestrator must infer.
11. **README is stale** (describes pre-lifecycle behaviour, wrong worked example, 7 of 17 config fields). FALLBACK default workarea does not exist.
12. **`implementorSkill` and `type` are ignored by the loop**; routing is by `repo` only.
13. **Uncapped review fan-out** (2n+1 over every changed file including moves and generated files) versus FA's plan-selected, capped `reviewFocus`.
14. **No combining of related increments.** EUDPA-409 already does this by hand after the fact (`absorbs: ["inc-030"]` on inc-029; `status: "merged-into"` + `mergedInto` on inc-030/033/034/040), and build-orchestrator's derive query treats `merged-into` as withheld. HANDOVER.md Thread A (111-139) frames exactly Sam's "second distillation phase", including the tension with "one ticket at a time" and the rollback-granularity cost.
15. **No backlog reassessment after a landing** (HANDOVER.md Thread B, 140-186). The loop's `readIncrement` tolerates stale line citations rather than preventing them. A plan stage that reads live code at build time removes most of the need.
16. The gate check halts on any non-`null` string, including `false`.

---

## 12. The backlog contract the loop implicitly defines

Fields the loop READS: `id`, `title`, `kind`, `repo`, `band`, `acceptanceCriteria`, `filesToTouch`, `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, `verification`, `recipe`, `notes`, `openQuestions`, `gate`, `ticket`, `branch`, `commit`, `prs`.
Fields the loop WRITES: `ticket`, `branch`, `commit`, `prs[] {repo,url,number,merged,sha}`, `status` (`done` only), `notes` (ATTEMPT FAILED), `openQuestions` (judge defers).
Fields the orchestrator READS: `status` (withheld set `done, deferred, dropped, blocked, rejected, merged-into`), `dependsOn`, `title`, `key`, `detail`.
Top-level: only `increments[]` is read. EUDPA-409 also has `run_id, schema_version, target`; ched-pp has `brief, source, milestones, scopeExclusions, sequencingNotes, deviations, bornBlocked, generated, regenerationOf`. None of it reaches the loop, so programme-level requirements (invariants, direction, scope exclusions) have no channel into the build. FA's header does carry them (`invariants`, `direction`, `targetTree`, `rulings`).

Suggested split for the unified format (requirement vs state vs workflow-owned):

- **Requirement (distiller writes, implementor never edits):** `id, title, outcome/detail, acceptanceCriteria (outcome-phrased), sources[] (citations to the requirement sources, not to code lines), repos[] (keys into a header repo map), dependsOn, gate, milestone, openQuestions (distiller's), ruling, absorbs[] (from the combine pass), kind`.
- **Programme header (distiller writes):** `repos{key:{path,github,ladder[] script names}}, invariants[], direction, scopeExclusions[], base branch, target profile id`.
- **State (workflow writes via one deterministic writer):** `status` (incl. explicit failure states), `ticket, branch, commit{repo:sha}, prs[], plan (path), notes, deferred[], reportRefreshed`.
- **Workflow-owned, never in the backlog:** files to touch, moves, tests to write, verification commands, review focus, exemplar choice. These go in `plans/<id>.md` produced by the Plan stage.
