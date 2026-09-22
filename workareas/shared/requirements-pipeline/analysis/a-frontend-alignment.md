# Analysis A: the frontend-alignment workflow (the "good" one)

Source of truth: branch `feat/NO_JIRA-frontend-alignment` of the workspace repo (54 commits ahead of `main`,
14 to 17 September 2026). Files read in full unless noted:

- `.claude/workflows/frontend-alignment.js` (1373 lines, all read)
- `.claude/workflows/README.md` on the branch (183 lines)
- `workareas/shared/frontend-alignment/stages.json` (header in full, every stage's key set, s01, s04, s13, s17, s24 in full)
- `workareas/shared/frontend-alignment/HANDOVER.md`, `report.md` (714 lines: head, "Rulings applied" opening, and lines 425 to 714 in full)
- plans: `s24-cross-service-shape.md` (743 lines, full), `s17-auth-convergence.md` (1076 lines: head, decisions, §4 to §8 in full, headings for the rest), `s04-services-shape.md` (2804 lines: heading structure)
- `docs/analysis/frontend-alignment-workflow-run.md` (142 lines, full)
- `tools/github/pr-ensure-draft.sh`, `tools/github-actions/wait-for-pr-checks.sh` (both full)
- For contrast only: `readIncrement` in `main`'s `.claude/workflows/increment-build-loop.js:666-680`.

Line numbers below cite `frontend-alignment.js` unless another file is named.

---

## 1. What it is, in one paragraph

A single Workflow script that drains a JSON stage backlog (`stages.json`) serially, one stage at a time,
through a fixed per-stage lifecycle: sync with main, plan just in time (Opus), implement (Sonnet), review
fan-out (Sonnet per file plus Opus across the change), adversarial verification of findings, judge (Opus),
fix, verification ladder, land (commit and push), ensure the draft PR, watch CI with a bounded fixer, a local
end-to-end run with a bounded fixer, refresh the human-facing report, record the state on the workspace
repo, then watch the workspace PR's cross-repo E2E. It halts at the first red and writes a resumable
status. The script knows almost nothing about the programme: "the programme is data and this script
knows nothing about it" (`:42-44`). That is only partly true; see §7.

It ran 13 proposal stages unattended on 14 September (348 agents, 36.4M subagent tokens, 8h56m, zero
failed agents, `docs/analysis/frontend-alignment-workflow-run.md:31-42`) and then 11 more "ruling" stages
(s14 to s24) over 15 to 17 September as Sam answered the report's open questions.

---

## 2. The stage lifecycle, exactly

The outer loop is `while (!halted)` over rounds (`:512`). Each round:

| # | Phase | Model helper | Lines | What it does | Output written |
|---|---|---|---|---|---|
| 0 | Baseline | `watcher` (Haiku, low) | 518-565 | Reads header and statuses with `jq`; works out `todo` (status `todo`, `ci-retry`, `e2e-retry`), `ciRetry`, `e2eRetry`; checks only the repos the pending stages touch are on the branch and clean (workspace exempt for untracked files and the programme's own state files). Any stage in a red status is a `problem`. | nothing; throws on `!ok` (`:549-551`) |
| - | Special case: report stage | `think` | 571-606 | If `id === 's13-alignment-report'` (hardcoded) a thinker writes `report.md` from every plan, every stage's notes and a three-way `diff -rq`, then `recordState`. | `report.md`, status `done` |
| 1 | Sync | `doer` (Sonnet) | 613-661 | Every stage opens by merging `origin/main` into each touched repo, plus the workspace and the tests repo. Uses `git merge-tree --write-tree --name-only` to detect conflicts without touching the tree; clean merges get the ladder then a push; conflicts are never attempted ("a judged port, not a merge"). | status `sync-blocked` + notes on failure (`:648-656`) |
| 2 | (retry short-circuit) | `watcher` | 668-681 | For `ci-retry` / `e2e-retry` stages, reads the recorded `prs` and skips straight to CI or local E2E. | - |
| 3 | Plan | `think` (Opus, high) | 687-731 | Writes `plans/<id>.md` (structure in §4). Returns `reviewFocus`, `behaviourChanges`, `decisions`, `risks`. `ok:false` only if "the brief cannot be carried out as written". | plan file; stage `notes` |
| 4 | Implement | `doer` | 736-780 | "Execute the plan and nothing else… follow it verbatim" (`:745`). Narrow npm scripts as it goes, max 3 self-repairs, stages but never commits; `DEFERRED:` lines for anything left out. | staged tree; on failure a pushed `wip(...)` commit + status `implement-failed` (`:765-776`) |
| 5 | Review | 2n Sonnet + 1 Opus | 791-858 | Style reviewer and code reviewer per `reviewFocus` file (capped at 12, `:783`) using the `code-style` / `review` skill personas; one Opus consistency reviewer across the whole change that also **runs the plan's "invariants to prove" section** (`:850-851`). Run under `parallel`. | findings in memory |
| 6 | Verify findings | `doer` per file | 863-909 | Findings grouped by file; one adversarial verifier per file, "Default to refuted" (`:877-878`). A dead verifier or missing verdict keeps the finding "unrefuted, treat with caution" (`:897-901`). | confirmed findings in memory |
| 7 | Judge | `think` | 914-945 | Rules each survivor `fix-now` / `defer-to-open-question` / `reject`; deferrals are appended to the stage's `openQuestions` so they reach the report. Writes complete fix instructions. | `openQuestions`, `notes` |
| 8 | Fix | `doer` | 950-968 | Applies only `fixNow`, using `REVIEW_ITEM_FIXER.md` / `STYLE_IMPLEMENTOR.md`. | staged tree |
| 9 | Ladder | `doer` | 973-1021 | Runs the stage's `ladder` npm scripts per repo in order to logs, 3 repairs max, never weakens a test; one sanctioned exception for framework-wrong assertions with cited `error-context.md` evidence; "a rung the repo does not define is not a failure… where the stage brief names a different rung list for a repo, the brief wins" (`:995-996`). | on red: pushed `wip` commit + status `ladder-red` |
| 10 | Land | `watcher` | 1026-1060 | Proves branch, commits `<type>(alignment): <id> — <title>` where type is `fix` if ruling or behaviour change else `refactor`, pushes with a fully-qualified refspec, writes `commit` and status `landed`. | `commit`, status `landed` |
| 11 | Pull request | `watcher` | 1065-1099 | One draft PR per repo for the whole programme, reused across stages via `pr-ensure-draft.sh`. | `prs` |
| 12 | CI | `watcher` + `doer` fixer | 1104-1133 | `wait-for-pr-checks.sh` per PR; up to `ciFixAttempts` (2) fix/re-watch rounds; `hardStop` when the watcher says `blocked`. | `ci`; on red status `ci-red` + record |
| 13 | Local E2E | `doer` runner + fixer | 1140-1234 | First decides whether the stage's commits could change what the stack serves; if not, records "skipped: …" and does not start the stack (`:1148-1155`). Otherwise fast-forwards clean `main` checkouts, `tim docker dev`, `npm run test:docker-compose`, one retry for fresh-stack 500s, reads `error-context.md`, always `tim docker down`. A fix is re-proven on the PRs' CI before the E2E re-runs. | `localE2e`; on red status `e2e-red` |
| 14 | Done | `watcher` | 1236-1242 | status `done` | status |
| 15 | Report refresh | `think` | 1248-1279 | Edits `report.md` in place: moves an answered question into "## Rulings applied", or adds a "What was built" entry; re-measures drift rows with `diff`; updates the checks table; fixes stale caveats. Failure is logged but does not halt. | `report.md`, `reportRefreshed: true` |
| 16 | Record | `watcher` | 1286-1300 | Commits only `stages.json`, `report.md` and `plans/` on the workspace repo, pushes. | workspace commit |
| 17 | Workspace E2E | `watcher` + `doer` fixer | 1307-1355 | Watches workspace PR #47, whose push re-runs the cross-repo suite on branch-tagged images; a fix is re-proven on the stage PRs, then an `--allow-empty` record commit re-triggers the suite (`:1335`). | `e2e`; on red `e2e-red` |

After the `for` over the round's stages, the `while` loops back to Baseline, which re-reads `stages.json`
(`:1358` breaks only for an explicit list). A final `recordState` commits whatever the last watcher wrote
(`:1366-1369`).

### Status vocabulary actually in use

`todo` → `landed` (`:1049`) → `done` (`:1239`, and the report stage `:590`). Red terminal states written by
the script: `sync-blocked` (`:652`), `implement-failed` (`:773`), `ladder-red` (`:1014`), `ci-red`
(`:1121`), `e2e-red` (`:1224`, `:1345`). Resume states set **by a human** after reading a red: `ci-retry`
(resume at the CI watch) and `e2e-retry` (resume at local E2E) (`:537-542`). Baseline treats every red as a
problem that blocks the run until a human re-marks it (`:543-544`).

Outcomes that do **not** write a status: `plan-refused` (`:727`), `land-failed` (`:1056`), `pr-failed`
(`:1094`), `record-failed` (`:1290`), `report-failed` (`:595`). The stage stays `todo` (or `landed`) so the
next run re-plans it. For `land-failed` after a partial multi-repo push this can double-land. `landed` is
not named in the baseline's list of statuses at all (`:537-545`), so a run that dies between Land and Done
leaves a stage the baseline neither builds nor names as a problem.

### Resume semantics

Three layers, all worth keeping:

1. **Relaunch = resume.** Baseline skips `done`; nothing else needs saying (`README.md:28`).
2. **Human-set retry statuses** re-enter mid-lifecycle without re-planning (`ci-retry`, `e2e-retry`). The
   union at `:557-558` exists because a Haiku baseline once reported a retry only in its sublist and the run
   skipped it (commit `b79e362c` "never skip a stage the baseline put in a retry list").
3. **Workflow journal resume** (`resumeFromRunId`) replays completed agents (`run.md:141-142`).

Plus "red preserves work": implement-failed and ladder-red both push a `wip(...)` commit rather than stash,
"so it survives this machine" (`:1007`). That differs from `increment-build-loop.js` (stash, never push).

---

## 3. Model tiering

`:95-97`:

```js
const think   = (opts) => ({ ...opts, model: 'opus',   effort: 'high' })
const doer    = (opts) => ({ ...opts, model: 'sonnet' })
const watcher = (opts) => ({ ...opts, model: 'haiku',  effort: 'low' })
```

- **think (Opus, high):** plan, consistency review, judge, report write, report refresh.
- **doer (Sonnet):** sync, implement, per-file style and code review, verifiers, fix, ladder, CI fixer, local E2E runner.
- **watcher (Haiku, low):** baseline, retry PR lookup, land, PR, CI watch, status recorders, record.

This is "thinking on the expensive model, doing on the mid model, watching on the cheap one", and
it matches Sam's memory rule "Pick subagent models to fit the job". Stale naming: the comments still say
"Fable" (`:93`, `:683`, `:789`, `:912`, `:1245`) and the `phases` meta is right, but commit `6ac9bc0f` moved
the thinking tier to Opus. `COMMIT_TRAILER` still hardcodes `Claude Fable 5.1` and a fixed session URL
(`:135-136`, `:1081`).

**The weak tier is Haiku writing JSON.** Every state mutation is an LLM agent Editing `stages.json`. The
evidence of drift is in the file itself (§6.1).

---

## 4. How briefs are bound into prompts, and what the plan adds

### Binding

The script never embeds the brief. Every stage prompt includes `readStage(id)` (`:140-148`), which tells the
agent to run `jq '.stages[] | select(.id=="<id>")'` and `jq 'del(.stages)'` itself. So:

- the **stage** carries `brief`, `reference`, `ladder`, `repos`, and for ruling stages `question` + `ruling`;
- the **header** carries `branch`, `repos` (with `path`, `clonePath`, `github`, `pr`), `direction`,
  `invariants`, `targetTree`, `rulings` (the meta-rule), `reviewCap`, `ciFixAttempts`, `ciWatchSeconds`.

Consequence: the script re-reads live state every time, so a human edit to a brief between stages is
picked up without a relaunch. It also means every agent parses the whole header (cost, and a chance to
misread).

Shared prompt blocks bound into every agent: `GUARDRAILS` (`:102-117`), `PATH_RULE` (`:119-123`),
`PUSH_RULE` (`:125-132`), `COMMIT_TRAILER` (`:134-138`), `stageNotes` (`:150-158`, the careful jq
field-update discipline written after "a previous run lost a stage's commit SHAs, PRs and every note"),
`RULING_RULE` (`:160-163`).

### Just-in-time plan per stage

The planner runs **immediately before** implementation, against the live tree, and writes
`plans/<id>.md`. The prompt (`:697-721`) fixes the plan's shape:

> "WHAT A PLAN IS HERE: a file-level script for a Sonnet implementor who has less context than you… 0.
> Decisions… 1. Moves… 2. Edits… 3. New files… 4. Imports… 5. Tests… 6. Invariants to prove… 7. Out of
> scope"

and adds "Capture the baseline of the target repo's ladder scripts before you plan… so a later red is
unambiguous" and "Where the brief leaves a choice open, MAKE IT and record it in decisions — never leave a
fork for the implementor."

What the plans actually contain (s24, s17, s04):

- A **path table** per repo in both spellings (s24:6-16, s17:7-13), HEAD SHAs pinned at plan time (s17:17)
  with "if a checkout has moved, stop and report".
- A **baseline table** of the ladder results (s24:18-28, s17:25-35).
- A **re-measurement** of the live state the brief asked for (s24:30-89: the actual `diff` hunks), which
  is the plan correcting the brief against reality.
- A **decision table** (s24 D1-D12, s17 D1-D18), each with rejected alternatives and reasons (s24:107-115).
- **Full target file text** for new and rewritten files (s24:249-288, 299-346; s04 has full-file
  replacements E11-E16, making it 2804 lines).
- **Invariants to prove**, each as a runnable unpiped command with the expected output (s24:617-708,
  s17:1035-1049).
- **Out of scope**, explicit and long (s24:712-742, s17:1051-1064).

So the recipe lives in the plan, which is the workflow's own artefact, written by the thinker at the
moment of building. **That is exactly the separation Sam wants**: backlog = requirement, plan = recipe
owned by the workflow. The pattern exists here; the backlog side does not honour it consistently (§5).

### What the planner returns that the script uses

- `reviewFocus` drives the review fan-out (`:784`). "Pure moves got no reviewer" (`run.md:86-88`). This is
  the main cost lever.
- `behaviourChanges` drives the commit type and body (`:1041-1045`).
- `planFile` is returned but **never persisted**. The `plan` field in `stages.json` is `null` on s04, s13,
  s17 although `plans/s04-services-shape.md` and `plans/s17-auth-convergence.md` exist; it is set on s01
  and s24 only because some agent chose to.

---

## 5. Is a stage a requirement or a recipe?

Both, and it shifted over the run. This is the most important finding for the design.

### Proposal stages s01-s12: recipes

s01's brief (`stages.json`, s01): "move src/server/plugins/{content-security-policy,logger-options,pulse,
request-logger,request-tracing,serve-static-files,session-cache}.js to the paths animals uses under
src/server/common/helpers/ (logging/ for the logger pair…); move src/server/plugins/{auth,csrf}.js to
src/plugins/; … Move each file's test beside it. Update every import. Leave src/server/routes/home… where
they are for now (s05 moves them). Keep the #/ alias in this stage (s02 removes it)."

s04's brief: "Create src/server/app/ and src/server/app/lib/. Move src/server/common/clients/{address-book,
countries,ins-backend}-client{,.real,.stub}.js into src/server/app/services/<name>/{index.js, client.js,
stub.js}… Move http-client.js to src/server/app/lib/http-client.js. Move the __mocks__ folders…"

These are file-by-file instructions and cross-stage sequencing ("s05 moves them", "s02 removes it"). For a
pure restructuring programme where the requirement *is* a target tree, this is defensible, but it
duplicates what the header's `targetTree` already states as the end state, and the planner then re-derives
the same moves in more detail anyway. It is the recipe smell Sam is objecting to.

### Ruling stages s15-s24: mostly requirement-shaped, with recipe residue

The HANDOVER (line 59) gives the template for a ruling stage: "`question` (the report's number the stage
leads with), `ruling` (Sam's words, dated), `repos`, a `brief` written the way s17's is — every question it
settles, the direction per item, the end state to prove with diff, what is out of scope — `reference`
paths under `repos/...`, the ladder, and `status: "todo"`."

s24's brief is the best example in the file of a requirement:

- **Why:** "A browser enforces form-action across the 302 that follows a cross-service POST, which is why
  ins allows the journey origins."
- **Measure first:** "Start by re-measuring, because s22 moved one of them."
- **End state as acceptance:** "content-security-policy.js and its test, and src/plugins/auth.js and
  auth.test.js, are byte-equal across the three; every remaining difference is a value in config.js."
- **Constraints with reasons:** "Animals keeps sid… it is the incumbent that every existing session,
  fixture and page object assumes."
- **Behaviour to declare** and **Out of scope**.

But it still carries recipe residue: "Give all three the identical helper: it reads a list of sibling
frontend origins from config and spreads it into form-action" (a design choice the planner could make),
"Rewrite the shared test to assert the configured value rather than a literal", "fixtures/auth-state.ts in
the tests repo gains a cookieName for the plants target in the shape the ins entry already uses". The
planner then had to choose *how* the config list is exposed (s24 D1: named export vs new convict key) and
did it better than the brief could have.

s17's brief is a 10-question bundle with per-item direction ("(Q2) animals and plants take ins's
src/auth/verify-token.js… (Q9) animals and plants take ins's src/server/router.js gate") and a proven end
state ("byte-equal across the three; config.js differs only in service-specific values… List every
residual line in notes with its reason"). The direction per item is requirement ("which side wins"); the
file-level naming is recipe.

### The `reference` field

Every stage carries `reference`: a list of files to imitate (s17 has 27). For an alignment programme this
is legitimately part of the requirement ("make X look like Y" needs Y named). In a general distiller it
should become "evidence / exemplars", not a file list the implementor must touch.

### Rule the design can lift

The split that emerged is: **brief = what must be true afterwards, why, what is out of scope, what to
declare; plan = how.** The plan's §0 "Decisions" is where every "how" choice lands, with the alternatives
rejected. The backlog item should stop at the acceptance end state; the planner owns the file-level shape.

---

## 6. What is broken or inconsistent

### 6.1 LLM agents writing a shared JSON state file

Every status, commit, PR, CI result and note is written by an agent Editing `stages.json`. The file shows
the damage at the top level of the **header**:

```json
"s17-auth-convergence": { "ci": {...}, "status": "done", "notes": [...], "localE2e": {...} },
"s22": { "address-book-links": { "ci": {...} } },
"ci": { "state": "red", "failures": [ "E2E Tests on …animals-frontend PR 339", … ] },
"s24-cross-service-shape": { "ci": {...}, "localE2e": {...}, "e2e": {...} }
```

These are watcher writes that landed at the wrong JSON path. As a result the real s24 stage has
`"ci": null` and no `localE2e` / `e2e` keys even though it is `done`. The s17 stage's `localE2e` and `e2e`
carry notes saying "Its write to this file failed silently because the Read tool was refusing the file at
the time; the parent set this from the journal" (a secrets-scan false positive on a note). The `stageNotes`
block (`:150-158`) is already a long defensive essay about jq discipline written after a previous loss.

The stray header note also says the local E2E red was "Pre-existing, unrelated to auth-convergence", which
is the verdict Sam's rules ban.

**Design implication:** state transitions must be deterministic (a small allowlisted `tools/`/`tim`
command that sets one field on one id and validates the schema), not LLM Edits. The script cannot read
files itself, so the command is what agents call, and the result schema carries the value.

### 6.2 Header knobs that the script ignores

- `reviewCap: 12` in the header; the script hardcodes `const cap = 12` (`:783`) and only tells the planner
  "At most the reviewCap" (`:228`). The run record says "capped at eight" (`run.md:48`).
- `ciFixAttempts: 2` in the header; the script hardcodes `const ciFixAttempts = 2` (`:409`).
- `ciWatchSeconds` is honoured, but only because the watcher agent reads it (`:425`).

### 6.3 Programme-specific code in a "data-driven" script

The header comment claims "this script knows nothing about it" (`:42-44`). Not so:

- `if (id === 's13-alignment-report')` special case (`:571`) instead of a `kind: "report"` dispatch (the
  stage does carry `"kind": "report"`, unused).
- Direction rule restated in the planner prompt: "ins moves toward animals/plants; where they differ,
  prefer plants' shape… Journey-only machinery never comes to ins" (`:715-717`).
- Programme invariant examples in the code reviewer prompt: "a string that should be in copy after s07"
  (`:827`).
- Port 3002 "for ins" (`:991`).
- Commit scope `alignment` (`:467`, `:631`, `:1041`), PR title "Design proposal: align the frontends (do
  not merge)" (`:1082`), PR body text (`:1076-1081`).
- Report section names ("Open questions", "Rulings applied", "Decisions you may want to reverse", "What
  was built", "Residual drift", "Known caveats") hardcoded in the refresh prompt (`:1257-1271`).
- `FALLBACK.workspacePr.number: 47` (`:51-56`), tests repo path hardcoded (`:1169`, `:1173`).
- Best-practice docs fixed to Node (`:699-701`), and `STYLE_FILE_REVIEWER` routing assumes JS.
- "Never merges" is built in; there is no merge or ticket phase at all.

### 6.4 Lifecycle gaps

- `landed` is not handled by Baseline (§2).
- `plan-refused`, `land-failed`, `pr-failed`, `record-failed` halt without writing a status.
- Local-E2E fixer loop: when the re-watched CI is red, `local = again; break` (`:1210-1213`), so the stage is
  then recorded as `e2e-red` carrying CI failures.
- `planFile` not persisted (§4).
- "Re-reading the backlog after each stage" (README `:34-35`, `whenToUse` `:6`) is really **after each
  round**: `stageIds` is fixed at round start (`:560`), and a stage appended mid-round is picked up by the
  next round's baseline. Behaviourally fine, but the docs overstate it.
- Report refresh failure does not halt (`:1277-1279`), so `reportRefreshed` can silently be false; nothing
  reconciles it later.
- Planner overreach is not fenced: s17 plan §8 prescribes the commit subject `chore(NO_JIRA): …` which
  contradicts the Land step's `<type>(alignment): …`. The Land step won, but the plan should not own
  lifecycle concerns.

### 6.5 No Codex executor

`grep -i codex` on the script finds nothing. Every phase is a Claude subagent. The codex pattern (shell
agent writes the prompt file and runs one `codex exec`; relay agent re-emits `lastmsg.txt`; placeholder
binding; a dead reviewer halts rather than reads as approval) lives only in `increment-build-loop.js`
(README on the branch `:131-161`, `codex/implement.md`, `codex/review.md`, `codex/fix.md`,
`codex/schemas/{increment,findings}.json`). Porting it would put implement, review and fix on Codex while
plan, verify, judge, ladder, land, report stay on Claude, which is the same split the loop already uses.
The JIT plan file is an asset here: a Codex implementor can be handed `plans/<id>.md` verbatim.

### 6.6 Backlog shape diverges from the other loop

| Concept | `frontend-alignment` (`stages.json`) | `increment-build-loop` on main (`backlog.json`, `:666-680`) |
|---|---|---|
| collection | `.stages[]` | `.increments[]` |
| requirement text | `brief` (prose) | `filesToTouch`, `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, `acceptanceCriteria`, or "a finding and cite the evidence" |
| exemplars | `reference[]` | `recipe` (cites supporting sections) |
| verification | `ladder[]` (npm script names) | `verification[]` |
| human gate | none; `question` + `ruling` are settled inputs | `gate` |
| ordering | file order | `dependsOn` in journey-builder/parity backlogs; file order here |
| repos | per-stage keys into header `repos` map | config `repos` (`frontend`/`backend`/`tests`) |
| outputs | `plan`, `commit` (string or per-repo object), `prs[]`, `ci`, `localE2e`, `e2e`, `reportRefreshed`, `notes[]`, `openQuestions[]` | `commit`, `ticket`, `branch`, `status`, `notes`, `openQuestions` |

Same idea, two vocabularies. The main loop even has a field literally named `recipe`, and `filesToTouch`
is a recipe field.

---

## 7. Programme-specific versus reusable

**Reusable as-is (lift into the generic implementor):**

- The phase skeleton and tiering helpers (`think` / `doer` / `watcher`).
- `readStage`-style binding: agents read the live item and header with `jq`, never a snapshot.
- JIT plan per item, with the fixed plan outline, baseline capture, HEAD pinning, decision table, invariant
  proofs as commands, and out-of-scope list.
- `reviewFocus` from the planner to bound review fan-out.
- Style + code per file, one Opus consistency reviewer that executes the plan's proofs.
- Adversarial verification grouped by file, default-refuted, with "unrefuted, treat with caution" when a
  verifier dies.
- Judge with three calls, deferrals written into `openQuestions` in state.
- Ladder rules: to logs read once, 3 repairs, framework-wrong-assertion exception with cited evidence,
  undefined rung is "skipped" not red, port-in-use is "could not run".
- Sync with `main` before planning, `merge-tree` conflict probe, conflicts never auto-resolved.
- Red statuses that block, human-set `*-retry` statuses to re-enter mid-lifecycle.
- `wip` commit preservation on red.
- `wait-for-pr-checks.sh` (exit codes 0/1/2/4 with 2 = "unresolved, not green", 4 = "no checks, absence
  of evidence") and `pr-ensure-draft.sh` (exit 3 if only merged/closed PRs, so lifecycle drift surfaces).
- Local E2E with "is this run worth making" pre-check, retry-once for fresh-stack 500s, always tear down.
- Report refresh after each item, record step that commits only state files by name.
- The `PUSH_RULE` refspec form and branch-proof before every commit.

**Programme-specific (must move into data or a target profile):**

- Direction rule, invariants, target tree (already header data; the prompt copies leak).
- Draft-never-merge, PR title/body, commit scope.
- The workspace-PR E2E gate (#47), tests-repo path, ins port.
- The report's section layout and "Residual drift" re-measurement.
- The `s13` report stage special case.
- Node-only best-practice docs.

---

## 8. Rulings as stages, and right-sizing

The loop that made this programme work:

1. The report ends with numbered open questions, each with a count and "if nobody answers" column
   (`report.md:9-18`).
2. Sam answers some. Each answer (or a bundle of related answers) becomes an appended stage with
   `question` (number), `ruling` (Sam's words, dated), and a brief (HANDOVER:59, header `rulings`).
3. `RULING_RULE` (`:160-163`) makes the ruling non-negotiable for planner, reviewers and judge: "Never
   reopen the question, never soften the ruling into an option, never widen it into the neighbouring
   questions the brief names as out of scope." Code reviewers judge "against the ruling, not against the
   option the ruling rejected" (`:828-829`); verifiers refute findings that contradict it (`:892`).
4. After landing, the report refresh moves the question to "Rulings applied" with SHA and PR link
   (`:1257-1263`).

**Right-sizing is already a Sam ruling.** HANDOVER:59: "One answer, one stage, right-sized. Related answers
land as one stage, not five (Sam, 16 September: 'there is a cost for every backlog item')." s17 bundled
questions 2, 3, 4, 6, 7, 8, 9, 10, 11 and 24 plus the stub sign-in shape into one stage, one commit per
repo. This is the direct precedent for the second distillation pass Sam now asks for: identify all
requirements small, then merge related ones to cut per-item overhead (each item here costs one Opus plan,
up to 25 review agents, verifiers, judge, ladder, CI, local E2E, report refresh, record, workspace E2E).

The risk the run shows: s17's plan is 1076 lines and touches four repos; a bundled item needs its
end-state proof to be crisp (s17's `diff -rq` list is) or the review surface balloons.

---

## 9. The report: why it is good

`report.md` is decision-led, not narrative:

1. **Open questions first**, as a table with `#`, question, `Count` ("one against two"), and **"If nobody
   answers"** (the default consequence). Numbers are stable identifiers: the refresh prompt keeps gaps
   ("numbers are how Sam refers to them, so gaps are fine", `:1258-1259`).
2. **Rulings applied**, each: headline in past tense, ruling date and text, SHAs + PR links, then two to
   four sentences on what changed and any declared behaviour change.
3. **Decisions you may want to reverse**, each with the count, the trade-off and "To reverse: …" (the
   touched surface, not a time estimate).
4. **What was built**: a checks table per repo dated to the landing commit, before/after tree, backports.
5. **Known caveats**: things the ladder cannot see (SonarCloud, `workflow_run` on default branch, lockfile
   quirks).
6. **Residual drift**: re-measured with `diff`, classified identical / import-path-only / deliberate /
   unexplained, each unexplained row pointing at the question that owns it.
7. **Where everything is**.

Style rules baked into the writer and refresher prompts: British English, GDS plain language, no em dashes,
no time estimates, name files, link PRs, quote decisions (`:586-590`, `:1272`). The first version put
decisions later; commit `c0f99985` "lead the report with the open questions and reversible decisions"
reordered it, which tells us Sam's preference directly.

For a requirements distiller, this is the template for the distillation report too: open questions with
defaults, decisions taken with reversal cost, then what the backlog contains.

---

## 10. Why Sam likes it

From the run record and the commit trail:

- It ran unattended end to end and every stage was green in CI ("no human input between launch and the
  final report", `run.md:6-8`).
- The thinker/doer contract via a plan file meant "Sonnet never had to decide anything" (`run.md:82-85`).
- Nothing the judge decided was lost: deferrals landed in state and came out in the report
  (`run.md:92-94`).
- It turned the report into a conversation: questions → rulings → stages → "Rulings applied", with the
  loop re-draining as answers arrived.
- Cheap watchers behind allowlisted scripts; no agent sleeping or raw `gh`.
- One branch name across repos (workspace rule 2) and one draft PR per repo, which gave CI a staging
  mechanism.
- It was hardened in flight by real failures: sync-with-main (silent PR checks on conflicting PRs,
  `:622-623`), retry statuses, baseline limited to touched repos, the local E2E rung, the skip-if-pointless
  check. Each fix is a commit on the branch.
- Planning quality: the s24 plan re-measured reality, rejected alternatives with reasons, and pre-empted
  the byte-equality trap (`format` in one repo breaking equality with the others, s24:290-292).

---

## 11. Lessons the run recorded (from `docs/analysis/frontend-alignment-workflow-run.md:107-129`)

- SonarCloud is a CI check the ladder cannot see; most of 8 CI fix commits were Sonar. Decide up front:
  Sonar rung before push, or budget a CI round-trip.
- `workflow_run` workflows cannot be proven on a branch.
- A CI fix in two repos is drift in the third; a cross-repo item must re-prove equality after any CI fix.
- Baseline must check only repos the pending items touch.
- Machine-drafted Welsh needs a translator gate.
- 165 empty results from record-keeping agents are not dead agents.

---

## 12. Recommendations for the combined design

1. **Keep the lifecycle and tiering; parameterise the programme bits** (§7) into a target/programme profile:
   direction, invariants, commit scope, PR policy (draft-never-merge vs merge-on-green), extra gates
   (workspace E2E PR), report template, best-practice bundle by language.
2. **Backlog item = requirement.** Fields: `id`, `title`, `why`, `outcome` / `acceptance` (end state as
   checkable statements), `constraints`, `outOfScope`, `behaviourToDeclare`, `evidence` (sources and
   exemplars, replacing `reference`/`recipe`), `repos`, `verification` (rungs), `gate`, `dependsOn`,
   `sources` (which input each requirement came from), optional `question`/`ruling`. No `filesToTouch`,
   no step lists. The JIT planner owns file-level shape; the plan outline in `:703-714` is the contract.
3. **Keep `plans/<id>.md` as the only recipe**, written just in time, HEAD-pinned, baseline-captured. Persist
   `planFile` deterministically.
4. **Deterministic state writes.** One allowlisted command (`tim backlog set <id> <field> <json>` or a
   `tools/` script) with schema validation, used by every recorder. Eliminates §6.1.
5. **Unify vocabulary** between this loop and `increment-build-loop`: one collection name, `verification`
   not `ladder`, one status enum including `landed`, `plan-refused`, `land-failed`, and all `*-retry`
   re-entry points.
6. **Add the executor switch** by porting the loop's codex shell+relay for implement, review and fix; hand
   Codex the plan file.
7. **Rulings loop as a first-class feature:** open questions from distillation and from the judge go to the
   report with number, count and default; an answered question becomes a requirement item with `ruling`;
   the refresh moves it to "Rulings applied".
8. **The second distillation pass** should apply Sam's "there is a cost for every backlog item" rule with
   s17 as the worked example: merge items that touch the same surfaces and share an end-state proof,
   keeping per-item acceptance statements and source traceability inside the merged item.
9. Replace the `s13` id special case with `kind` dispatch (`report`, `merge-main`, `build`).
10. Treat report refresh failure as a recorded state (`reportRefreshed:false` reconciled at the next
    round) rather than a log line.
