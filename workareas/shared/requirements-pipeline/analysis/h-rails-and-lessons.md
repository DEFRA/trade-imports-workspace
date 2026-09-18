# H — Workspace rails, permissions and lessons

Analysis H of the requirements-pipeline design (distiller → `backlog.json` → implementor skill driving a
Workflow, in Claude-only or Claude-driving-Codex mode). This file answers one question: **what operational
constraints must a new skill + workflow honour to run silently, safely and resumably in this workspace, and
which proven patterns should it inherit rather than re-invent?**

Sources read in full: `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/guard-bash.sh`,
`.claude/hooks/guard-edits.sh`, `.claude/rules/*.md`, `.claude/workflows/README.md` (main and the
`feat/NO_JIRA-frontend-alignment` diff), `.claude/workflows/increment-build-loop.js` (config, rails, codex,
ticket/branch/baseline stages), `.claude/workflows/codex/implement.md` head and both `codex/schemas/*`,
`.claude/skills/build-orchestrator/SKILL.md`, `.claude/skills/skill-creator/SKILL.md` +
`references/AUDITOR.md`, `docs/best-practices/skills/{patterns,anti-patterns,scaffold-template}.md`,
`docs/agent-skills.md`, the branch's `frontend-alignment.js` (header, config, rails, prompt blocks),
`docs/analysis/frontend-alignment-workflow-run.md`, the `stages.json` header, the
`chore/NO_JIRA-plants-snagging-workarea` branch (loop diff, `HANDOVER-CODEX.md`, `backlog.json` shape), the
user-level `~/.claude/settings.json` keys, and 30+ memory files (listed in §9).

---

## 1. TL;DR — the ten rails that decide whether a run is silent or a prompt-flood

1. **The skill that drives a Workflow runs in the MAIN session.** A subagent cannot invoke `Workflow`
   (`.claude/workflows/README.md:7-11`, `build-orchestrator/SKILL.md:12-25`). The two-tier batch orchestrator
   died of exactly this. The implementor skill is therefore a *main-session orchestrator*; the workflow's own
   `agent()` calls are the context "death boundary".
2. **Launch by `scriptPath`, never `name`.** `name` runs a registry snapshot from session start
   (memory `reference_workflow_name_uses_stale_snapshot`: 57 agents / ~4.7M tokens rebuilt a merged increment).
3. **`args` do not reliably arrive → `FALLBACK` is the real switch.** Both workflows say so
   (`increment-build-loop.js:26-27`, `frontend-alignment.js:27-28`). The proven idiom is: copy the tracked script
   to a gitignored *run copy* in the workarea, patch `FALLBACK` with the Edit tool, launch the copy by
   `scriptPath`, pass the same `args` too (`build-orchestrator/SKILL.md:160-220`). Then **verify the executed
   snapshot** (grep the persisted copy the tool names) before claiming what is being built.
4. **Resume = same `scriptPath` + same `args` verbatim + `resumeFromRunId`.** Completed agents replay from
   `journal.jsonl`; only failed ones re-run (memory `reference_workflow_session_limit_resume`). Read results
   from `<transcriptDir>/journal.jsonl` with jq, not the truncated notification.
5. **Guard rails block goes FIRST in every agent prompt**, and it must include: no Grep/Glob TOOLS; one
   command per Bash call (no `&&` `;` `|` `cd`, no env-var prefixes `VAR=x cmd`); tilde paths in Bash,
   absolute paths only for Read/Write/Edit, *never an absolute path near a Bash example*; no `awk`/`sed`/pipes;
   no bare `node`/`npx`/node_modules binaries — only named npm scripts via `npm --prefix`; no `sonar`; no
   `sleep`; tests to a log file, read once; rollback only `git stash push -u`; never force-push; headless —
   decide, record, keep going. The most complete block is `frontend-alignment.js:102-117`; the loop's
   (`increment-build-loop.js:315-334`) is missing three clauses (see §5).
6. **Two path spellings, two constants.** `ABS` for Read/Write/Edit, `TILDE` for Bash; never let `ABS` touch a
   Bash example (memory `feedback_workflow_prompts_leak_abs_paths`: ~90 agents about to prompt on EUDPA-249).
   Resolve them at runtime with a resolver agent (`increment-build-loop.js:219-261`), not a hardcoded
   `/Users/samfarrington` (`frontend-alignment.js:71` — a portability defect).
7. **Model tier per agent, set explicitly.** haiku = mechanical watch/land/record; sonnet = implement, per-file
   review, verify, fix, ladder; opus = plan, judge, consistency review, report, requirement synthesis
   (memory `feedback_subagent_model_selection`; proven on `frontend-alignment.js:8-22,95-97`: 35 opus /
   256 sonnet / 57 haiku over 348 agents, 0 failures).
8. **Opus fan-out and an opus-tier Workflow share one session window.** Keep concurrent opus fan-out to ≤5-6
   while a workflow runs (memory `reference_opus_session_limit_under_fanout`); a 33-agent judges panel hit the
   limit (`reference_workflow_session_limit_resume`). Split big panels across turns.
9. **Codex offload = `codex exec` in FOREGROUND slices with `--output-schema`, via a two-agent
   shell + relay pair** (`increment-build-loop.js:682-825`). A stage that produced no result THROWS — a crashed
   reviewer must never read as approval (`README.md:98-102`).
10. **Merge policy is programme data, default "never merge without Sam's explicit go".** Unattended merge on
    green exists *only* for the EUDPA-409 plants loop by explicit ruling (memories
    `feedback_never_auto_merge_wait_for_sam`, `unattended-merge-on-green`). Draft-PR-never-merge
    (frontend-alignment) and local-commit-no-push (snagging `lifecycle: local`) are the other two proven
    variants.

---

## 2. The permission surface as it actually is

### 2.1 Project allowlist (`.claude/settings.json:62-91`)

Allowed without prompt:

| Pattern | Notes |
|---|---|
| `Bash(~/git/defra/trade-imports-workspace/tools/**)` (+`:*`) | **Every** `tools/<anything>/` script, recursively. This already satisfies skill-creator's "pattern 8" for any new `tools/<name>/` — per-skill entries are redundant (see §7.3). |
| `Bash(~/git/defra/trade-imports-workspace/scripts/**)` | stack wrappers etc. |
| `jq cat head tail wc sort uniq grep ls file basename dirname` | any args, any path |
| `awk * ~/git/defra/trade-imports-workspace/*`, `sed * …`, `find ~/git/defra/trade-imports-workspace/*` | only under the tilde workspace path |
| `git -C ~/git/defra/trade-imports-workspace[/*]` | the only sanctioned git form |
| `npm --prefix ~/git/defra/trade-imports-workspace/*` | the only sanctioned npm form |
| `mvn -f ~/git/defra/trade-imports-workspace/*` | the only sanctioned maven form |
| `~/…/repos/*/node_modules/.bin/*` | allowed by settings — **but** memory `feedback_subagent_permission_prompts` cause 4 bans workers from calling binaries directly; route through named npm scripts |
| `tim:*` | the CLI; prefer `tim … --json` in skills (CLAUDE.md), plain (no `--no-ui`) when Sam watches (memory `feedback_tim_keep_ink_ui`) |

**Not** on the project allowlist: `gh`, `codex`, `sonar`, `cd`, `docker`, `pkill`, `date`, `mkdir`, `cp`, `mv`,
`rm`. These run today only because the user-level settings enable **auto mode** (`~/.claude/settings.json`
`autoMode.allow: ["$defaults", "tim workspace status", "tim docker dev", "sonar analyze --staged"]`), where a
classifier decides. That classifier has **refused `gh pr merge`, `gh run rerun`, `git push --delete`** from an
orchestrating session (memory `project_high_risk_plants_build_phase`, "owed: gh allow rules"). Consequence:
*anything outward-facing (PR create/merge, CI watch) should go through a committed `tools/` script*, which is
allowlisted by path, rather than raw `gh`. `frontend-alignment.js:109` already mandates this ("NEVER `gh`
directly … the allowlisted scripts under tools/github/ and tools/github-actions/ do that"); the build loop
still calls `gh pr checks --watch` raw (`increment-build-loop.js:325-327`).

### 2.2 Deny list (`.claude/settings.json:4-61`)

`bash/sh/zsh/nohup/eval/exec`, `node` (every form), `python*`, `perl`, `ruby`, `osascript`, `deno`, `bun*`,
`tsx`, `ts-node`, `php`, `curl`, `wget`, `chmod`, `env`, `brew install/upgrade/uninstall`, `pip install`,
`npm install -g`, every recursive `rm`, `find -delete`, `git push --force/-f`, and Read of `.env*`,
`credentials*`, `secrets*`, `.aws`, `.ssh`, `.npmrc`, `.netrc`.

Hard implications for the new tooling:

- **Helper logic must be bash + jq** (or a Node script run through an npm script in `tim/`). A distiller
  "normaliser" or "combiner" written in Node must be invoked via `npm --prefix ~/…/tim run <script>` or a
  `tim` subcommand, never `node x.mjs` (memory `feedback_node_via_npm_script`). The workspace already prefers
  library-first `tim` surfaces with `--json` envelopes (CLAUDE.md "tim CLI").
- **No `curl`** → Confluence / Jira / web sources come in through `tools/jira/*.sh`, `tim jira`, MCP, or
  WebFetch — never a curl one-off (memory `feedback_extend_tool_not_oneoff`: add the flag and commit).
- A denied command is *user intent*: never re-route it through a wrapper or relocated file (memory
  `feedback_never_bypass_deny_rules`). The guard hook exists because of exactly that incident
  (`guard-bash.sh:5-6`).

### 2.3 Guard hooks

`guard-bash.sh` (PreToolUse on Bash) **denies** with a reason that names the sanctioned alternative so an
unattended agent self-corrects (`guard-bash.sh:21-30`):

| Check | Line | Consequence for the design |
|---|---|---|
| `chmod` anywhere, incl. `find -exec`/`xargs` | 90-93, 132-135 | New scripts get their exec bit via `git add --chmod=+x` / `update-index --chmod=+x` then `git checkout -- <file>` (memories `reference_new_executables_chmod_and_guard`, `reference_write_tool_drops_execute_bit`) |
| path-invoked executable must be **committed at HEAD and unmodified** | 106-129 | New `tools/<skill>/*.sh` must be committed before any agent runs them; **never edit a script running subagents call** — an uncommitted fix stalls every caller mid-run |
| secret-path reads via jq/grep/awk/… | 95-104 | Distiller extractors must not grep `.env`-like paths |
| `git commit --no-verify` | 138-141 | Pre-commit hooks are part of the ladder |
| `git commit --amend` on a pushed HEAD | 143-149 | Fix forward |
| literal `/Users/<user>/` in a command | 158-160 | The two-constants rule (§1.6) — confirmed live in this very session: a Bash `jq` over a `/Users/…/tool-results/…` path was denied |
| raw `npx playwright test` | 163-165 | Use `npm run test:docker-compose` |
| `npm --prefix …workspace… install/ci/…` | 168-170 | **Clones/installs need the canonical `pwd -P` path** (or `tools/npm/npm-in-repo.sh`) — relevant to any stage that installs deps |
| unquoted `&&` | 189-192 | one command per call |

Also note what the hook **does not** stop but the rails must: `;` and `|` (intentionally unguarded,
`guard-bash.sh:172-175`) still break allowlist matching; env-var prefixes break it too.

Undocumented extra: the executable guard blocks a `git commit -m` whose message *names an uncommitted path* —
commit with `-F <file>` written by the Write tool (`frontend-alignment.js:134-138`, memory
`project_frontend_alignment_run` "commit-message gotcha"). The build loop does not carry this rule.

`guard-edits.sh` **denies agent edits** to `.claude/settings.json`, `.claude/settings.local.json` and
`.claude/hooks/**` (`guard-edits.sh:37-42`). So: **no skill, workflow or scaffold may add allowlist entries
itself**; any required permission change is a line in the completion output that Sam applies by hand.

The Read tool passes a sonar pre-tool hook (`settings.json:121-129`) that has **refused to read `stages.json`**
when a note quoted a password-like value (`frontend-alignment.js:150-158`). Backlog prose that quotes secrets,
tokens or test credentials verbatim can make the canonical state unreadable to agents — the distiller must not
copy credential-shaped strings from sources into `backlog.json`.

### 2.4 Path-scoped rules (`.claude/rules/*.md`)

Six `paths:`-glob rules (`copy.md`, `gds.md`, `java.md`, `k6.md`, `node.md`, `playwright.md`) inject a pointer
to `docs/best-practices/<topic>/` when a matching file is edited. They are pointers, not content ("Read the
files relevant to the change before editing. Do not inline their content here"). Two consequences:

- The implementor stages inherit house standards for free when they edit source; the backlog must **not**
  re-state them per increment (a recipe smell — see §8).
- `.claude/rules/` is for rules only; catalogues and references go under `docs/` (memory
  `feedback_claude_rules_are_rules_not_catalogues`). The new pipeline's schema doc belongs in
  `docs/` or the skill's `assets/`, not `.claude/rules/`.

---

## 3. Workflow invocation — hard facts and the proven idiom

| Fact | Evidence | Rule for the new implementor skill |
|---|---|---|
| Subagents cannot call `Workflow` | `README.md:7-11`; `build-orchestrator/SKILL.md:12-25`; memory `check-live-branch-before-following-handover` (three-tier orchestrator abandoned 21 Aug) | The implementor skill is main-session only. Its body is: derive → patch run copy → invoke → check landed → repeat. No middle tier. |
| `name` runs a stale snapshot | memory `reference_workflow_name_uses_stale_snapshot` | Always `scriptPath`. After launch, grep the persisted snapshot for the patched `increments`/`FALLBACK` before reporting. |
| `args` unreliable | `increment-build-loop.js:26-27,111`; `frontend-alignment.js:27-28,59` | Run-copy + patched `FALLBACK` is authoritative; pass `args` identically as belt-and-braces. Note the two scripts gate `args` on different sentinel keys (`args.increments` vs `args.workarea`) — a unified loop should use one. |
| Workflow size limit | `build-orchestrator/SKILL.md:107-109` ("one increment is 22–46 agents against a default guideline of 15") | Completion/handover output reminds Sam to raise *Dynamic workflow size* in `/config` — the agent cannot set it. |
| Resume | memory `reference_workflow_session_limit_resume`; `frontend-alignment-workflow-run.md` "How to run it again" | Handover prints the run id; resume is `resumeFromRunId` + identical `scriptPath`/`args`. Workflow-internal resumability is state-driven too: the loop's ticket stage derives `resumeAt` from persisted `ticket/branch/commit/prs` (`increment-build-loop.js:938-946`); alignment derives from `status` values `todo/ci-retry/e2e-retry/sync-blocked`. |
| Journal is the record | `frontend-alignment-workflow-run.md` ("preserved … `run-wf_a52aa0bf-91f.journal.jsonl`") and the "165 agents returned an empty result" note | Preserve the journal next to the report for audit; give record-keeping agents a required non-empty field so "empty" never looks like "dead". |
| Never edit the tracked loop | `build-orchestrator/SKILL.md:160-161,404` | Programme-specific tweaks go in the run copy; genuine fixes to the tracked loop are separate commits (the snagging `local`-lifecycle fix `5271d04a` lives only on `chore/NO_JIRA-plants-snagging-workarea` — not on main — which is exactly the drift this rule is meant to avoid; see §6). |
| One increment per invocation | `build-orchestrator/SKILL.md:119-123,203,405` ("A list committed five deep throws away everything the first increment teaches") vs alignment "drains every todo stage, re-reading the backlog after each" (`frontend-alignment.js:6`) | Two proven cadences. The alignment drain works because its loop *re-reads* state between stages and stops at first red; it also means one Workflow run can carry many stages' agents (348) — fine when the context is the workflow's, not the session's. Recommend: the implementor skill picks per programme (`cadence: one | drain`), default `drain` with re-derive-after-each inside the script, since the derive query is deterministic jq and the parent's context cost is the same. |

**The parent's duties are narrow.** Memory `feedback_parent_orchestrates_never_implements`: claim → spawn →
re-verify → commit/rollback → record. "Operational" tasks (run a container, place a baseline) are
implementation too. On a subagent/stage failure: cheap diagnosis, reset state, re-spawn with notes; never pull
work inline to dodge prompts — fix the rails instead. `build-orchestrator/SKILL.md:396-409` encodes this
("Do not read diffs, test logs or review argument").

**Verify claims in the parent shell.** Memory `feedback_verify_subagent_failure_claims`: a subagent's
"environmental / pre-existing" failure must be reproduced before it is relayed. The alignment state shows the
failure mode live: `stages.json` header `."s17-auth-convergence".notes[0]` ends "Pre-existing, unrelated to
auth-convergence" — exactly the phrase memory `feedback_dont_ignore_test_failures` bans.

**Never idle, no increment budget.** Memories `feedback_never_idle_between_increments`,
`no-increment-budget-keep-going`: launch the next unit *before* writing prose; never stop on a count or a
context guess; keep state on disk after every increment so a handover costs nothing. This contradicts
`build-orchestrator`'s `stopAfter` parameter only if it is used as a pacing budget; keep it as a user-chosen
ceiling, default `all`.

---

## 4. Codex — two different "Codex modes" exist, and the design must name which

### 4.1 Claude-driving-Codex inside a Workflow (proven, `executor: 'codex'`)

`increment-build-loop.js:682-825` + `.claude/workflows/codex/{implement,review,fix}.md` + `schemas/`:

- **Only the token-heavy stages go to Codex** (implement, review, fix). Baseline, verify-findings, judge,
  ladder, land stay on Claude: they are orchestration and adjudication (`README.md:77-80`,
  `build-orchestrator/SKILL.md:380-384`). Agent count `18 + n` vs `15 + 3n`.
- **Two agents per codex stage**: a *shell* (haiku-tier `light`) that writes the resolved prompt file and runs
  `codex exec`, reporting only whether it RAN; a *relay* that re-emits `lastmsg.txt` as schema output. Keeps
  "the run died" distinguishable from "Codex found nothing" (`increment-build-loop.js:682-687,715-804`).
- **Invocation form** (`:756`):
  `codex exec -C <TILDE> --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema <schema> -o <lastmsg> "Read <prompt file> and follow it in full." > <log> 2>&1`
- **Foreground slices, never `run_in_background`** — a subagent that stops making tool calls is finalised and
  kills Codex with it (`:744-753`, commit `3d4d51bf`). On a Bash timeout (570000 ms): kill, grep the
  `session id:`, `codex exec … resume <SESSION_ID> "Continue…"` with **every flag before `resume`**
  (`:761-770`). At most five slices.
- **`--output-schema` gotcha**: OpenAI structured output requires every property in `required`; optional =
  nullable type (memory `reference_codex_orchestration_pattern`; `schemas/findings.json` `line: ["number","null"]`).
- **Briefs are placeholder-bound** (`<workspace>` `<workarea>` `<backlog>` `<logs>` `<skills>` `<branch>`
  `<INCREMENT_ID>` `<frontendRepo>` …) and open by telling Codex to *ignore the Claude-only GUARD RAILS*
  (`codex/implement.md` "Your shell is normal"). Absolute `/Users/…` paths are fine *inside* Codex prompts,
  but must never appear in the Claude shell agent's own Bash (`:756` uses `TILDE` throughout; the prompt file
  carries `ABS` bindings, written by the Write tool).
- **No-result = throw** for review/fix; implement routes to its rollback path (`README.md:98-102`,
  `:820-825`).
- Standing preference (memory `reference_codex_orchestration_pattern`, 2026-07-30): "whenever heavy lifting CAN
  go to Codex, it SHOULD"; Claude Workflows remain right for read/classify fan-outs where structured-output
  plumbing matters.

Rail defects in the proven path (fix when consolidating):

- Step 2b is `pkill -f "codex [e]xec…" ; grep -m1 "session id:" <log>` (`:762`) — a `;` compound inside a
  prompt whose own GUARD RAILS forbid `;`. It also uses `pkill`, which is not allowlisted. Split into two calls,
  or wrap the kill-and-find in a committed `tools/codex/` script.
- `codex` itself is not on the project allowlist; it runs under auto mode's classifier. A non-auto session
  would prompt on every slice. Owed: `Bash(codex exec:*)` in `settings.json` (Sam applies — agents cannot edit
  it) or a committed `tools/codex/run-stage.sh` wrapper, which is path-allowlisted already and would also own
  the slice/resume logic in bash rather than in prompt prose.

### 4.2 Codex-as-orchestrator (a handover, not a mode)

`workareas/shared/plants-snagging/HANDOVER-CODEX.md` (on `chore/NO_JIRA-plants-snagging-workarea`) is a
`/goal` prompt that hands the *whole* orchestration to Codex when Claude usage runs out: Codex reads the same
backlog, the same `codex/*.md` briefs and the same review personas, fans out its own subagents, runs the ladder,
lands, pushes, raises PRs. It binds placeholders to absolute paths in a table. This is a third operating mode
the user's "claude-only or claude-driving-codex" framing does not name. Recommendation: treat it as a
**handover target** — the implementor skill's handover prompt should be emittable in a Codex-flavoured variant
(bindings table + "you have a normal shell" + the same backlog/briefs), so all three modes read one backlog
and one set of briefs.

---

## 5. Guard-rails block — the canonical superset

Compare the two proven blocks:

| Clause | build loop `:315-334` | alignment `:102-117` | Keep |
|---|---|---|---|
| No Grep/Glob tools | yes | yes | yes |
| One command/call, no `&&` `;` `|` `cd` | yes | yes | yes |
| No env-var prefixes (`VAR=x cmd`) | **no** | yes | yes — the loop's own ticket stage violates it: `JIRA_PROJECT_KEY=${JIRA_PROJECT} ${JIRA}/create-ticket.sh …` (`increment-build-loop.js:898`) |
| Tilde in Bash / absolute for tools, "stop and convert" | partial | yes | yes |
| No awk/sed/text pipes; Read tool to inspect | **no** | yes | yes (memory cause 5, "tonnes of awk commands") |
| No bare node / npx / node_modules binary; named npm scripts; format only via `run format`; STOP and report the wanted command if no script | partial (node only) | yes | yes (memory cause 4: a direct prettier call blocked an overnight run for ~6h) |
| No sonar | yes | yes | yes |
| No raw `gh`; use `tools/github*` scripts | **no** (uses `gh pr checks --watch`) | yes | yes |
| Tests to a log, read once; Playwright `error-context.md` | yes | yes | yes |
| Rollback `git stash push -u` only | yes | yes | yes, **path-scoped** `stash push -u -- <paths>` when another session owns files (memory `reference_build_loop_local_lifecycle_snagging`, `PARALLEL_SESSION_RULE`) |
| Never sleep | "never sleep-poll; block on `gh … --watch`" | "never sleep; watcher scripts poll" | alignment's form (polling in a committed script, `tools/github-actions/wait-for-pr-checks.sh`, exit codes 0/1/2/4 where 2 = timed-out ≠ green, 4 = no checks ≠ green) |
| Never force-push; refspec push form; prove branch before commit | yes (`PUSH_RULE` `:354-364`) | yes (`:125-132`) | yes — `--no-track` cut + `refs/heads/X:refs/heads/X` push are both load-bearing (a commit once landed on tests `main`, `:336-353`) |
| Commit via `-F <file>` | no | yes (`:134-138`) | yes |
| Commit trailer | hardcoded "Claude Opus 5 (1M context)" on main; `commitTrailer` config only on snagging branch | hardcoded "Claude Fable 5.1" + a fixed session URL (`:134-136`) | make it config supplied by the launching session (snagging branch's `COMMIT_TRAILER`), never hardcoded |
| Headless: never ask; decide, record, keep going | yes | yes, "write the decision into the stage's notes" | alignment's form — decisions land in state |
| Safe JSON mutation (targeted jq path, prove nothing else moved) | no | yes (`stageNotes`, `:150-158`) | **yes, but move it into a committed helper** — see §6.2 |
| Parallel-session files | no (only in snagging run copy) | clones mode rule (`:115`) | yes, as config: `foreignPaths[]` the run must never stage/stash |

A new workflow should define this block **once**, as a shared module or a doc fragment both workflows embed,
rather than two drifting copies (skill pattern 5: "point, don't inline … copies drift").

---

## 6. State-mutation and branch-hygiene lessons

### 6.1 The backlog is JSON state the loop consumes, not a document

Memory `feedback-backlogs-are-json-state-not-docs`: canonical `backlog.json`; markdown/HTML are generated
views; statuses `todo/inprogress/done/failed/blocked`, gated work born `blocked` with `gate`; extra fields ride
along harmlessly; write the generator as a script so the backlog is reproducible. Sam *does* like the
generated page as well — build both, never only the document.

Buildability is **status + dependsOn, nothing else** (`build-orchestrator/SKILL.md:125-156`): withheld set
`done, deferred, dropped, blocked, rejected, merged-into`; unknown status fails loudly (gets picked up).
`merged-into` was added for the EUDPA-409 combination pass (commit `fe5ed046`: "inc-029 absorbs inc-030,
inc-032 absorbs inc-033+inc-034, inc-039 absorbs inc-040") — **this is the existing precedent for Sam's
"second distillation phase that combines related increments"**: absorbed items keep their ids with
`status: "merged-into"` (plus a pointer to the absorber), ids are never renumbered
(`build-orchestrator/SKILL.md:409`), and the combination was proposed and then ruled "as recommended" before
being applied (memory `project_high_risk_plants_build_phase`). The combiner should reproduce exactly that
shape, but headlessly (make the call, flag it after — memory `feedback-headless-make-calls-dont-gate`).

Big-design-up-front is out (memory `big-design-up-front-not-the-way`): never fan planners across a whole
backlog; a plan, if wanted, is written by one planner for the one increment about to be built. The alignment
workflow is consistent with this: its *Plan* step runs **inside** each stage, just-in-time, against the live
tree (`frontend-alignment-workflow-run.md` "A thinker writes the plan as a file; a doer executes it"). That
is precisely where "how" belongs — in the workflow, not in `backlog.json`. By contrast
`journey-builder/references/INCREMENT_PLANNER.md` plans "ten at a time" into the backlog
(`docs/reference/worker-references.md:39`) — the recipe pattern this design should retire.

Deferred work must become state: the loop's judge writes deferrals to `openQuestions`
(`README.md:114-123`); the orchestrator's step 3b turns any `DEFERRED:` line or CI-fixer "out of scope" into
either a pointer to an existing `todo` or a new appended increment with a fresh id and `dependsOn` the source
(`build-orchestrator/SKILL.md:239-261`).

### 6.2 Agents corrupt JSON when they hand-write jq — use a committed helper

Live evidence in the alignment `stages.json` header: top-level keys `"s17-auth-convergence"`, `"s22"` (whose
value is `{"address-book-links": {...}}` — an id split on `-`), `"s24-cross-service-shape"`, and a stale
top-level `ci: {state:"red", …}` — stage state written onto the *programme header* by recorder agents
mis-targeting a jq path. The script comment admits an earlier loss: "a previous run lost a stage's commit SHAs,
PRs and every note that way" (`frontend-alignment.js:155-156`). The loop does the same by instructing agents
to "Edit ${BACKLOG}" freehand (`increment-build-loop.js:901-902,930-931,387-389`).

Skill pattern 6 already prescribes the fix: **idempotent, atomic, id-validated helpers**
(`jq … > tmp; mv tmp file`, gates on JSON fields). The new pipeline should ship
`tools/<skill>/backlog-set.sh <workarea> <id> <field> <json-value>` /
`backlog-append-note.sh` / `backlog-add-increment.sh` (or `tim backlog …` subcommands) that refuse an unknown
id, never touch the header, and print the before/after of the one field. Agents then run one allowlisted
command instead of composing jq. (`journey-builder` already has this shape: `next-increment.sh --claim`,
`backlog-set-status.sh`, `backlog-counts.sh` — but they hardcode `workareas/journey-builder/$RUN_ID/backlog.json`,
memory `feedback-backlogs-are-json-state-not-docs`; generalise the path to a workarea argument.)

### 6.3 Branch strategy — three proven variants, pick per programme

| Variant | Where proven | Shape | When |
|---|---|---|---|
| **Branch-per-increment, PR-per-increment, merge on approval or on green** | `increment-build-loop.js` `lifecycle: 'full'`; EUDPA-409, DR1 | ticket → `<type>/<KEY>-<slug>` in every touched repo (same name, `--no-track`) → PR per repo → CI → merge backend→tests→frontend (`:299-309`) → ticket Done | Jira-tracked programmes a colleague may pick up |
| **One branch + one (draft) PR per repo for the whole programme** | frontend-alignment (24 stages, `feat/NO_JIRA-frontend-alignment`); memory `feedback_stack_programme_on_one_branch` | commit per stage, push as you go so CI runs on the long-lived PR (`tools/github/pr-ensure-draft.sh` reuses it), merge once at the end or never | Multi-task programme in the same repos; design demonstrations; Sam's stated default when a brief lists several tasks for one repo |
| **Local commits, orchestrator owns branches/PRs** | `lifecycle: 'local'` snagging (`reference_build_loop_local_lifecycle_snagging`) | orchestrator cuts `fix/NO_JIRA-<slug>` in both repos, loop commits, orchestrator runs E2E, pushes, raises PRs | No-Jira snagging; also what a Codex takeover does |

A long-lived branch **must sync with main every stage**: a PR conflicting with main gets *no* Actions runs at
all, which watchers misreport as API failures (memory `reference-no-pr-runs-when-conflicting`; alignment
commit `d4ff0ee2` added a sync step; a real conflict marks `sync-blocked` and stops). Sync must include the
tests repo even if the stage does not name it, because the E2E runs its suite regardless (alignment lesson,
commit `474e6b2a`). `workflow_run` workflows run *main's* copy of the workflow file — a branch cannot prove
one green until merged.

Cross-repo branch parity (CLAUDE.md rule 2) is non-negotiable in every variant. `NO_JIRA` naming precedent:
`fix/NO_JIRA-<slug>` / `feat/NO_JIRA-<slug>` / `chore/NO_JIRA-<slug>`.

### 6.4 Merge policy — encode as data, default to the safe one

| Policy | Source | Encode as |
|---|---|---|
| Never merge; report ready with evidence and stop | memory `feedback_never_auto_merge_wait_for_sam` (overrides any brief) | `merge: 'never'` — **default** |
| Merge on green, unattended | memory `unattended-merge-on-green` — EUDPA-409 loop only, ruled in as many words | `merge: 'on-green'` — requires a recorded ruling in the programme header (who, when, quote) |
| Merge on GitHub approval of every PR in the increment | loop default `requireApproval: true` (`:52-65`) | `merge: 'on-approval'`; know it caps throughput at ~1 increment/working day (memory `project_dr1_build_loop_throughput`) |
| Draft PRs, never merged | frontend-alignment | `merge: 'never'` + `draft: true` |

The build-orchestrator's `ci-red` stop (`SKILL.md:285`) conflicts with memory
`platform-blocked-increment-park-and-move-on`: a platform-blocked red (missing secret, org setting) should park
the increment `blocked` with a `notes` line naming the fix owed, re-point dependants to its own `dependsOn`,
and continue. The skill text on main has not absorbed that ruling.

Never write to CDP platform repos (`cdp-app-config` etc.) — draft locally, Sam commits (memory
`feedback_no_ai_on_cdp_platform_repos`). A requirement that implies a platform change must become a
`gate: "sam"` / `blocked` item, not an increment the loop builds.

### 6.5 Checkouts move under you

Memories `feedback_repo_checkouts_move_mid_session`, `feedback_explore_main_not_working_checkout`: `repos/`
checkouts are shared mutable state; pin `git rev-parse HEAD` before a read-heavy phase and re-check before
acting. For the **distiller**, that means evidence citations (file:line) must record the commit they were read
at, and the combiner/implementor must treat a moved citation as "re-derive", not "defect". For the
**implementor**, the baseline stage records HEAD per repo; the alignment baseline checks only repos pending
stages touch, not every repo in the header (run-doc "What to change next time").

### 6.6 Sonar

CLAUDE.md rule 3 says run `sonar analyze --staged` before committing, but: it is not allowlisted, cannot be run
without `cd`, and rule analysis 403s for the org (memory `reference_sonar_analyze_unavailable`); workflow
agents must never run it (memory `feedback-no-sonar-cd-in-workflow-agents`). Meanwhile SonarCloud runs on every
PR and accounted for most of the alignment run's 8 CI-fix commits (run-doc "SonarCloud is a check the ladder
cannot see"). Design implication: sonar is a **CI-stage concern** handled by the CI-fix loop (or a milestone
gate the parent runs), never a ladder rung; state plainly in reports that no local rule analysis ran.

---

## 7. How a skill must be structured in this workspace

### 7.1 Shape (agentskills.io + workspace conventions)

- `.claude/skills/<name>/SKILL.md` with frontmatter `name` (== folder name, `[a-z0-9-]{1,64}`) and
  `description` (≤1024 chars: WHAT + WHEN + trigger phrases + NOT-for disambiguation)
  (`docs/agent-skills.md:119-133`). Body target <500 lines / ~5k tokens — but memory
  `feedback_lean_skill_means_narrow_scope`: **lean = narrow scope, not short prose**; never trim
  correctness-bearing detail to hit a cap. Split scope, not prose.
- Worker personas in `references/<NAME>.md`, spawned `subagent_type: general-purpose` (never custom types —
  anti-pattern A9, they get a no-write guardrail) with a prompt that begins
  `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/<owner>/references/<NAME>.md.`
  Each worker persona carries the **one-line pointer** to `docs/agent-skills.md` → "Bash call hygiene"
  (pattern 5) — *but* memory `subagent-permission-prompts` shows the pointer alone was not enough in practice;
  the proven prompts put a concrete GUARD RAILS block at the TOP of every spawn. Reconcile: the persona file
  points; the spawn prompt (or workflow `GUARDRAILS` const) inlines the concrete block.
- Schemas/templates in `assets/`. No private `scripts/` — shared scripts live under `tools/<name>/`
  (`docs/agent-skills.md:131-132`).
- Paths: literal `~/git/defra/trade-imports-workspace/...` in LLM-typed prose; `$HOME/...` only inside
  `tools/*.sh` bodies; no env vars in LLM-typed Bash (A10, GH#51001).
- Scripts: single `start-<name>.sh` dispatcher printing `MODE: <X>` first when there are ≥3 deterministic setup
  steps (pattern 2); pre-bake only context read >1 time by fan-out workers (pattern 3, A7); atomic idempotent
  mutation helpers (pattern 6); walker only for N-item human triage (pattern 7, A1); render helper only when
  helpers — not the LLM — write the JSON (A6).
- Register the skill in CLAUDE.md's **skill routing index** (rule 4) and any fan-out persona in
  `docs/reference/worker-references.md`.

### 7.2 Mapping the two requested skills onto the checklist

| Pattern | Distiller skill | Implementor skill |
|---|---|---|
| 1 JSON state | yes — `sources.json` (inventory), per-source extracts, `requirements.json` (atomic), `backlog.json` (increments), `conflicts.json`/open questions; HTML/MD report as a *render* | yes — reads/writes `backlog.json` only via helpers |
| 2 dispatcher | yes — `start-distil.sh` → `MODE: NEW / RESUME / COMBINE / REPORT` | yes — `start-build.sh` → `MODE: RUN / RESUME / HANDOVER`, emitting derive result + resolved config |
| 3 pre-bake | yes — fetched source snapshots (Confluence, Jira, canvases, repo skeleton) cached once, read by N extractors | minimal — the workflow's baseline does its own |
| 4 hygiene | prose must comply | prose must comply |
| 5 worker pointer | extractors, verifiers, combiner are fan-out → pointer + GUARD RAILS at top | workflow agents carry the `GUARDRAILS` const |
| 6 atomic helpers | `backlog-add-increment.sh`, `backlog-merge-into.sh`, `requirement-add.sh` | `backlog-set.sh`, `backlog-append-note.sh`, `next-increment.sh` |
| 7 walker | only for Sam's rulings on open questions (N items) — but default headless: decide + flag (memory `feedback-headless-make-calls-dont-gate`) | no |
| 8 allowlist | already covered by `tools/**` | already covered by `tools/**` |

Where distillation is judgement-heavy (reconciling sources, combining increments) anti-pattern A5 applies —
don't spread cross-cutting judgement over N parallel workers. Fan out *extraction* (one per source, local
context) and *verification* (adversarial, one per slice), but keep *synthesis* and *combination* in one opus
agent (journey-builder's `SPEC_RECONCILER` is one-shot for this reason, `worker-references.md:38`). The
distiller can itself be a Workflow run from the main session (extract fan-out → reconcile → verify → combine →
render), which gives it resume-by-run-id for free.

### 7.3 skill-creator mismatches to know about

- CREATE "appends allowlist entries to `.claude/settings.json`" (`skill-creator/SKILL.md:112-115,134`) — but
  `guard-edits.sh:38-39` denies agent edits to that file. And the existing `tools/**` glob makes per-skill
  entries unnecessary. Pattern 8 is effectively satisfied workspace-wide; skill-creator should say so.
- AUDITOR tells workers to "use Glob to list" (`AUDITOR.md:39-40`) — the Glob TOOL is not allowlisted and
  prompts (memory `subagent-permission-prompts` cause 1).
- `skill-creator/SKILL.md:6` lists `allowed-tools: [Bash, Read, Glob, Grep, …]` — same contradiction.
- `docs/agent-skills.md:92-96,109-110` recommends Glob for "find then read"; the proven workflow rails ban
  Glob/Grep tools. The canonical hygiene doc and the proven rails disagree; the new skill should follow the
  rails and the doc should be corrected.

### 7.4 Neighbouring-skill descriptions to disambiguate against

`build-orchestrator` ("NOT for authoring or ordering a backlog — that is parity or journey-builder"),
`journey-builder` (digest/backlog/build — "too fat" per memory `feedback_lean_skill_means_narrow_scope`),
`parity` (findings backlog, hands `status/gate/dependsOn` to journey-builder), `frontend-change` (one
recipe-verbatim increment — the *repo's* recipes, which is legitimate "how" knowledge owned by the implementor,
not the backlog), `ticket-creator`, `openspec-propose`, `ralph-skills:prd`/`ralph` (PRD → prd.json).
CLAUDE.md's routing table omits `journey-builder` and `build-orchestrator` entirely, and a stray blank line
before the `parity` row (CLAUDE.md:43) breaks that row out of the table.

---

## 8. Recipe smells in the rails-bearing assets

The user's principle: **`backlog.json` states WHAT/WHY (a requirement with acceptance criteria and evidence);
the workflow owns HOW.** The rails and loops currently pull the other way in these places:

1. `increment-build-loop.js:670-672` `readIncrement` enumerates recipe fields it will honour —
   `filesToTouch (paths + action + what)`, `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`,
   `verification (the ladder, in order)` — and `:678-679` a `recipe` field it reads. It *tolerates* thin
   increments ("THE BACKLOG SAYS WHAT IS WRONG, AND WORKING OUT WHAT TO CHANGE IS YOUR JOB") but its prompt
   still advertises the recipe shape as a first-class input, so authors keep producing it.
2. `increment-build-loop.js` ladder stage "runs the increment's own `verification` array"
   (`README.md:64`) — the ladder is a property of the *repo/target*, not of the requirement. In the snagging
   backlog every increment repeats the same 6-9 `npm --prefix …` commands verbatim
   (`plants-snagging/backlog.json` `.increments[].verification`). The alignment header holds
   `ciFixAttempts`, `reviewCap`, `invariants` at programme level but still puts `ladder` per stage.
   Move ladders into a target/programme profile (journey-builder's `tools/journey-builder/targets.json`
   precedent); an increment may *add* a rung only when the requirement genuinely needs a new proof.
3. Snagging `snag-003` carries 26 `filesToTouch` entries plus `recipe`; `HANDOVER-CODEX.md` step 3 says
   "Implement per implement.md, following the increment's `filesToTouch`". A pre-computed file list goes stale
   the moment another increment lands (memory `big-design-up-front-not-the-way`).
4. `increment-build-loop.js:948-959` derives `repos[]` from `band` heuristics when `repo` is absent — a
   legitimate *workflow* inference; keep it there (and prefer the requirement naming affected surfaces,
   not repos).
5. `frontend-alignment` stage `brief` is long prescriptive prose (s21's opens "…a single-page feature holds
   controller.js, template.njk, page.js…") — acceptable there because the *ruling* was about structure, but the
   generic lesson is: the per-stage **Plan** step is where file-level detail should be generated
   (`plans/<stage>.md`, 330–2,800 lines each), and it was.
6. `journey-builder` `INCREMENT_PLANNER` writes plans into the backlog ten at a time — the canonical recipe
   anti-pattern to retire in favour of just-in-time planning inside the workflow.

What the rails *should* let a requirement carry that is not a recipe: `acceptanceCriteria` (observable
outcomes), `evidence` (source citations with commit/URL + retrieval date), `surfaces` (pages/endpoints/
features affected — not files), `constraints` (house rules or rulings that bound the solution), `gate`,
`dependsOn` (genuine only — memory `platform-blocked…`: linear `dependsOn` chains stall runs), `openQuestions`,
`provenance` (which source(s) and which atomic requirements this increment realises — needed for the combine
phase and for the report).

---

## 9. Integration gaps between the assets

1. **Two stage vocabularies, two state files.** Loop: `backlog.json` `.increments[]`, statuses `todo/done/
   blocked/…`, fields `ticket/branch/commit/prs/notes/openQuestions`. Alignment: `stages.json` `.stages[]`,
   statuses `todo/landed/done/ci-retry/e2e-retry/sync-blocked`, fields `plan/ci/localE2e/e2e/reportRefreshed/
   question/ruling/reference/ladder`. Neither consumes the other's file; `build-orchestrator`'s derive query
   would treat `ci-retry` as buildable (unknown ⇒ buildable, by design).
2. **The best machinery is on unmerged branches.** `tools/github/pr-ensure-draft.sh`,
   `tools/github-actions/wait-for-pr-checks.sh`, the `--clone` mode of `tools/npm/npm-in-repo.sh`, the
   alignment workflow and README section live only on `feat/NO_JIRA-frontend-alignment` (workspace PR #47);
   the loop's `lifecycle: local` fix and `commitTrailer` config live only on
   `chore/NO_JIRA-plants-snagging-workarea`. Main's loop has the local-lifecycle contradiction that commit fixes.
   Memory `check-live-branch-before-following-handover` applies: port before building on top.
3. **`README.md` on main is stale**: says the loop "commits but never pushes" (`:112`) and its config table
   (`:23-31`) omits `lifecycle`, `epic`, `jiraBoard`, `requireApproval`, `ciFixAttempts` etc., while the script
   runs a full ticket-to-merge lifecycle.
4. **No codex executor in the alignment workflow**; no plan step in the loop. The consolidated loop needs
   both: JIT opus plan → implement (claude or codex) → review (claude fan-out or one codex reviewer) → verify →
   judge → fix → ladder → land → PR/CI → merge-policy.
5. **Portability**: alignment hardcodes `ROOT_ABS = '/Users/samfarrington/…'` (`:71`) and a session URL in
   the trailer (`:134-136`); the loop resolves the root with an agent (`:219-261`). Keep the loop's approach.
6. **build-orchestrator vs headless memory**: "Ask for anything the user has not given" (`SKILL.md:29`) and
   `ci-red` as a hard stop conflict with `feedback-headless-make-calls-dont-gate` and
   `platform-blocked-increment-park-and-move-on`.
7. **Hygiene doc vs proven rails**: `docs/agent-skills.md` recommends Glob; skill-creator writes to
   `settings.json`; the workflow rails ban both.
8. **CLAUDE.md routing index** lacks `journey-builder`, `build-orchestrator` (and would need the two new
   skills); table is broken by a blank line before `parity`.

---

## 10. Hard constraints checklist (for the design doc)

**Permission-safe prompts**
- GUARD RAILS first, the superset in §5, defined once.
- Two constants (`ABS` tools-only, `TILDE` Bash-only), resolved by a resolver agent; never `/Users/` in Bash.
- Outward actions via committed `tools/` scripts (PR ensure, CI wait, codex slice, backlog mutate), not raw
  `gh`/`jq` composition — path-allowlisted, exit-coded, testable.
- No env-var prefixes, no `;` compounds even in codex shells, commit with `-F`.
- New scripts committed (exec bit via git) before any agent runs them; never edit one mid-run.

**Model tiers**: haiku (resolve, preflight, baseline, land, PR, CI watch, record) · sonnet (extract,
implement, per-file review, verify, fix, ladder, E2E) · opus (requirement synthesis, conflict resolution,
combine, plan, judge, consistency review, report). Set `model` on every `agent()`; `effort: 'high'` on opus
thinkers. Cap concurrent opus at ~5-6 while a workflow runs.

**Workflow invocation**: main session only; `scriptPath`; run copy + patched `FALLBACK` + identical `args`;
verify the executed snapshot; resume with `resumeFromRunId` + identical args; results from `journal.jsonl`;
remind Sam to raise Dynamic workflow size.

**Codex**: executor switch per increment; codex for implement/review/fix only; shell+relay pair;
foreground 570 s slices, kill+resume by session id, flags before `resume`, ≤5 slices; `--output-schema` with
all-required/nullable fields; briefs placeholder-bound and "ignore Claude rails"; no result ⇒ throw.
Owed to Sam: `codex` allow rule or a `tools/codex/` wrapper. Codex-as-orchestrator is a handover variant.

**Merge policy**: `merge: never | on-approval | on-green`, default `never`; `on-green` needs a recorded
ruling; merge order backend → tests → frontend; whole-increment gate; never approve own PR, never `--admin`.

**Branching**: `branchStrategy: per-increment | programme | local`; programme branch is Sam's stated default
for multi-task work in one repo set; same name across repos; `--no-track` cut; refspec push; sync with main
every stage (incl. tests repo); `sync-blocked` stops for a human.

**Failure handling**: red ladder ⇒ preserve (pushed `wip` commit under full/programme, path-scoped stash under
local) and stop that increment; platform-blocked red ⇒ park `blocked` + re-point dependants + continue;
subagent "pre-existing" claims reproduced in parent before relay.

**Skill structure**: narrow scope per skill, detailed prose; dispatcher with `MODE:` line; JSON state +
render; atomic helpers; general-purpose workers with pointer + inline rails; routing-index entry; no
settings.json edits by agents.

---

## 11. Open questions

1. Does Sam want `gh` and `codex` allow rules added to `.claude/settings.json` (he must do it by hand), or
   should all such calls be wrapped in `tools/` scripts so the allowlist never needs to grow?
2. Default cadence for the implementor: one increment per Workflow invocation (build-orchestrator) or drain
   with re-derive inside one invocation (alignment)? The latter proved 24 stages without a human; the former
   keeps the parent's landed-check between increments.
3. Default branch strategy for the new implementor: programme branch (Sam's 2026-09-15 ruling) vs
   per-increment PRs (Jira lifecycle)? Should `lifecycle: full` Jira ticket-per-increment survive at all when
   the combine phase produces larger increments?
4. Should the ladder live in a target profile (`targets.json` style) keyed by repo, with increments allowed
   only to *add* rungs?
5. Should PRs be merged or left as drafts by default for distilled programmes — i.e. is
   `merge: 'never'` + one draft PR per repo (alignment) the house default, with `on-green` opt-in per ruling?
6. Where should the shared GUARD RAILS / PUSH_RULE / state-helper contract live so both the distiller workflow
   and the implementor workflow import one copy (a `.claude/workflows/lib/` module, if the Workflow runtime
   supports imports, or a `docs/` fragment the script reads)?
7. Is the Codex-as-orchestrator handover (`HANDOVER-CODEX.md`) a supported third mode the implementor skill
   should emit, or a one-off?
8. Should `docs/agent-skills.md` and skill-creator be corrected in the same programme (Glob advice,
   settings.json edits), since the new skills will be audited against them?

---

## Memory files read

`reference_workflow_name_uses_stale_snapshot`, `reference_workflow_session_limit_resume`,
`reference_opus_session_limit_under_fanout`, `feedback_workflow_prompts_leak_abs_paths`,
`feedback_no_sonar_cd_in_workflow_agents`, `feedback_subagent_permission_prompts`,
`reference_codex_orchestration_pattern`, `feedback_subagent_model_selection`,
`feedback_parent_orchestrates_never_implements`, `feedback_never_auto_merge_wait_for_sam`,
`feedback_unattended_merge_on_green`, `feedback_platform_blocked_increment_park_and_move_on`,
`feedback_stack_programme_on_one_branch`, `reference_build_loop_local_lifecycle_snagging`,
`feedback_headless_make_calls_dont_gate`, `feedback_lean_skill_means_narrow_scope`,
`feedback_check_live_branch_before_following_handover`, `feedback_backlogs_are_json_state_not_docs`,
`feedback_big_design_up_front_not_the_way`, `feedback_never_idle_between_increments`,
`feedback_no_increment_budget_keep_going`, `feedback_verify_subagent_failure_claims`,
`feedback_best_output_not_cheapest`, `reference_new_executables_chmod_and_guard`,
`reference_write_tool_drops_execute_bit`, `feedback_workspace_config_shareable_committed`,
`feedback_claude_rules_are_rules_not_catalogues`, `feedback_never_bypass_deny_rules`,
`feedback_node_via_npm_script`, `project_frontend_alignment_run`, `project_dr1_build_loop_throughput`,
`project_high_risk_plants_build_phase`, `feedback_tim_keep_ink_ui`, `reference_sonar_analyze_unavailable`,
`reference_no_pr_runs_when_conflicting`, `feedback_repo_checkouts_move_mid_session`,
`feedback_no_ai_on_cdp_platform_repos`.
