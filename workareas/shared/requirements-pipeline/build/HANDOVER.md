# Requirements pipeline: overnight handover (21 September 2026)

You are taking over the build of Sam's requirements pipeline. It is two skills and two workflows:
- a **distiller**: loose requirements from many sources in, a two-pass `backlog.json` and a
  decision-led report out;
- an **implementor**: builds each backlog increment as a full-stack slice, in Claude or Codex mode.

Your job overnight is to **run the bootstrap build over the remaining backlog, one batch at a
time, verify every landing yourself, and keep going until the backlog is done or something needs
Sam.** The previous agent's context filled up, which is why you have it now.

## Read these first, in this order

All paths below are under `~/git/defra/trade-imports-workspace/workareas/shared/requirements-pipeline/`.

1. `analysis/sam-requirements.md`: Sam's hard requirements, R1 to R9. **R9 matters most:** scope
   with sense, and no gold-plating.
2. `design/RESCOPE.md`: **the authoritative scope.** It lists 10 remaining increments. `design/DESIGN.md`
   is reference only, for the parts RESCOPE says still stand. It is 468 KB, so grep it and never
   read it whole.
3. `build/lessons.md`: real failures and their fixes, L1 to L5.
4. `build/deferred.md`: findings deferred to named later increments. The D2, D3, D5, D8 and D9
   entries are **withdrawn**; do not act on them.

Branch: `chore/NO_JIRA-requirements-pipeline` in the workspace repo. **Never push, open a PR or merge.**

## Step 0: settle inc-011 (the last run of the previous session)

inc-011 ("The writer refuses layer-split work") was building in run `wf_83588845-0d3` when this
was written.

1. `git -C ~/git/defra/trade-imports-workspace log --oneline -5 --grep "requirements-pipeline/inc-011"`.
   A result means it landed. Then:
   - verify it (see "After every batch" below);
   - set its status to `done`, with `commit` set to the sha.
2. If it has not landed, check `git -C ~/git/defra/trade-imports-workspace status --porcelain -- tim .claude tools docs .github`.
   **If there are changes there, the run died part-way, and the next launch will refuse to start.**
   The baseline requires those folders to be clean. Stash the partial work by name. It is
   non-destructive:
   `git -C ~/git/defra/trade-imports-workspace stash push -u -m "inc-011 partial (run died)" -- tim .claude tools docs .github`
   Then build inc-011 again in your first batch.
   - The script was lightened after that run started, so a resume would not replay its cache.
     Just launch fresh.

## How to run a batch

Pick the next buildable increments. A buildable increment has status `todo`, and every one of its
`dependsOn` is `done`. List them with:

```
jq -r '.increments[] | select(.status=="todo") | .id + " deps=" + ((.dependsOn//[])|join(","))' ~/git/defra/trade-imports-workspace/workareas/shared/requirements-pipeline/design/backlog.json
```

Expected order: inc-011, inc-017, inc-018, inc-019, inc-021, inc-022, inc-014, inc-029, inc-033,
inc-025, inc-038.
- Put at most 3 or 4 in one launch. They run one after another, and an increment may depend on
  one landed earlier in the same run.
- Launch with:

```
Workflow({ scriptPath: "/Users/samfarrington/git/defra/trade-imports-workspace/workareas/shared/requirements-pipeline/build/bootstrap-build.js",
           args: { "increments": ["inc-017", "inc-018", "inc-019"], "trailer": "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" } })
```

Always launch by `scriptPath`, never by name. Pass args as a real JSON object.

Each increment runs:
1. survey
2. plan (Opus)
3. two-round convergence audit
4. implement
5. grouped review, reading the `review` and `code-style` skills live
6. verification of the critical and major findings
7. judge
8. fix, then fix-verify
9. ladder: tim test and lint
10. late review
11. acceptance by a fresh Opus task that never sees the plan
12. land: one local commit, product folders staged wholesale, then a leftover check

A red stops the run at that increment.

## After every batch (do this yourself; never trust the report alone)

For each increment that landed:
1. Run `git -C ~/git/defra/trade-imports-workspace show --stat <sha>`, and check the files match
   what the increment is about.
2. Run `npm --prefix ~/git/defra/trade-imports-workspace/tim test > <scratch>/tim.log 2>&1` and
   `npm --prefix ~/git/defra/trade-imports-workspace/tim run lint > <scratch>/lint.log 2>&1`, then
   read each log once. Both must be green.
   - At the handover, HEAD had 141 test files and 1,740 tests passing.
3. Run `git -C ~/git/defra/trade-imports-workspace status --porcelain -- tim .claude tools docs .github`.
   It must be empty.
4. Set the increment's `status` to `done` and its `commit` to the sha in `design/backlog.json`:
   - Write jq output to a scratch file, check it with jq, then `cp` it into place.
   - The tim writer does not have a status command yet.
5. Add the judge's `deferred` findings to `build/deferred.md`, under the increment they name, with
   a "How to apply" line each. Drop any that target a dropped increment, and say so.
6. Commit `design/backlog.json` and `build/deferred.md` by name. Never use `git add -A`: other
   people's untracked work lives under `workareas/shared/`.

## When a run stops

Read the stop reason in the result, and in `journal.jsonl` if it was truncated. Then:
- **Plan audit failed after 2 rounds.** Read the objections. If they are real, and the design or
  the atom is wrong, fix the atom's wording (keep it requirement-shaped) or record a decision.
  Then relaunch. Do not add audit rounds.
- **Landed but left files out.** Read the leftover files. Check the commit imports them
  (`git grep`). Read them, since they were probably created after review. Commit them as a
  `fix(...)` commit, then run the tests.
- **The row reader returned the wrong id, or another bookkeeping slip by a cheap agent.** Relaunch.
  If it repeats, replace that judgement with a check in the script, and add a lesson.
- **Ladder red.** Never call a failure "pre-existing" or "unrelated": the baseline was green. Look
  at the cause in the logs under `build/logs/`, then relaunch or fix it.
- **Anything that needs Sam's decision.** Stop, write it at the top of this file under "Waiting for
  Sam", and move on to any other buildable increment that does not depend on it.

## Sam's standing rules

These are hard rules. They are also in memory.
- **Scope with sense (R9).** Build what RESCOPE lists, no more. A mechanism earns its place only
  against a failure that has actually happened.
- **Never backport.** Existing work and other programmes are not this programme's business.
- **Codex is available, not preferred.** Use it only if Sam asks.
- **Full-stack slices (R7).** One increment spans every repo it needs.
- **No pushes, PRs or merges.** Sam does those.
- Progress is always given as "N of TOTAL (P%)". Never give time estimates.
- **Bash rails:**
  - one command per call; no `&&`, `;`, `|` or `cd`;
  - tilde paths in Bash, absolute paths only in the Read, Write and Edit tools;
  - no Grep or Glob tools;
  - never bare `node`, never `sonar`.
- If a Claude usage limit is close, **stop cleanly**. Stop the workflow, and do not edit the script
  afterwards. Write the resume command, with `resumeFromRunId` and the same args, at the top of
  this file.

## State at handover

- **Done:** inc-003, inc-004, inc-005, inc-006, inc-009, inc-012.
- **In flight:** inc-011.
- **Remaining:** inc-017, inc-018, inc-019, inc-021, inc-022, inc-014, inc-029, inc-033, inc-025,
  inc-038.
- **Progress:** 6 of 17 live increments (35%). The re-scope cut 19 increments.
- **A stash exists** named "inc-001 partial (dropped 2026-09-21)". It holds unreviewed tim
  PR and CI code that inc-022 may read for reference (see `build/deferred.md`). Never pop it
  whole: it also holds old-loop backports.
- **Sam has three open questions from the re-scope,** each with a default in force. See
  `design/RESCOPE.md`.

## When you finish, or stop for the night

Write a short summary at the top of this file for Sam:
- what landed, with shas;
- progress as N of TOTAL (P%);
- anything waiting for him;
- the exact next step.
