# Handoff: build the INS performance-testing backlog

## Parked on 29 September 2026: start here

Step 0 is done. The build is parked before inc-001, because the loop's baseline gate is red on unchanged `main`.

- **Done:** the k6 conversion (DEFRA/trade-imports-performance-tests#1, merged). Workspace PR DEFRA/trade-imports-workspace#77 holds the loop change, gates, docs and this backlog, and is waiting for Sam.
- **Sam's answers:** epic EUDPA-641. Build all 12 open-question defaults as written. INS is not deployed to CDP perf-test yet, so inc-003 stays blocked.
- **inc-001:** ticket EUDPA-642, branch `feat/EUDPA-642-a-k6-smoke-run-of-both-journeys-and-the` in the performance-tests repo. Nothing is built on it yet. Relaunching resumes it.
- **Why it stopped:** in the baseline's e2e phase, ins-tests `--project=animals` failed two tests on `main`: "allows signing out after signing in" and "lands on the sign in page when opening a page further in the journey". Both pass when run alone. The unit phase (20 rungs), the FIT phase and the ins, plants and k6 e2e rungs pass.
- **To resume:**
  1. Pull every repo with `tim workspace update`, then `tim workspace install` for the programme's Node repos.
  2. Stop the stack with `tim docker down`, because FIT needs its ports free.
  3. Run `tim build gate shared/ins-performance-testing --phase e2e`.
  4. When the gate is green, relaunch the loop by `scriptPath`, with the args below.
- **Args:** the full lifecycle; `branch: main`; epic EUDPA-641; statuses "In Dev" and "Done" (the status names, not the "In Progress" transition); board 13780; `requireApproval: false`; `repos` copied from the envelope (9 keys, including `instests`); `increments: null`; `stopAfter: "all"`.

You are overseeing the build of the INS performance-testing backlog: 19 increments of k6 load tests for the Import Notification Service. You orchestrate and verify. Agents and the build loop write the code. Use the `requirements-pipeline` skill (BUILD phase) for the build itself.

## Read first

- `workareas/shared/ins-performance-testing/report.md`: the summary, step 0, 12 open questions with defaults, the increments, what is out of scope.
- `workareas/shared/ins-performance-testing/backlog.json`: the rows. The envelope's `invariants` are rules every increment keeps.
- `.claude/skills/requirements-pipeline/references/BUILD.md` and `workflow/README.md`: how the build loop runs.
- The backlog and report sit on branch `feat/NO_JIRA-ins-performance-testing` in this workspace repo, which is not merged yet. A local copy is also in the canonical checkout's `workareas/shared/ins-performance-testing/`, with its `sources/` and `distil/` folders. Those folders are deliberately not pushed, because the repo is public and they hold a meeting transcript and a security finding.

## Where things stand

- **The performance-test repo exists:** https://github.com/DEFRA/trade-imports-performance-tests, created from CDP's JMeter template. It holds `Dockerfile`, `entrypoint.sh`, `.github/workflows/publish.yml`, `compose.yml`, `compose/` (LocalStack set-up), `scenarios/test.jmx`, `user.properties`, `README.md`, `LICENCE`, `.editorconfig`, `.dockerignore` and `.gitignore`. Its name matches the backlog's `perftests` entry.
- **It is not in the workspace yet.** It is not in `repos.json`, `CLAUDE.md`'s repo map, `README.md` or `docs/repos/`, and it is not cloned.
- **The build loop is not ready.** Its full lifecycle only accepts the repo keys `frontend`, `backend` and `tests`. This backlog uses 8 keys: `perftests`, `stub`, `idstub`, `insfrontend`, `animalsfrontend`, `plantsfrontend`, `referencedata` and `gateway`.
- **The tests repo was renamed** to `trade-imports-ins-tests` (EUDPA-630) after the backlog was written. The backlog and `sources.json` still name `trade-imports-animals-tests` in a few places.
- **DISTIL now runs as a workflow** (PR #75). You do not need it to build, but use it if new requirements arrive: edit `sources.json`, then relaunch per `references/DISTIL.md`. Because this programme was distilled by hand, run `tim distil adopt` on each source first, or the first launch re-extracts everything.

## Step 0, in this order

Do each on a branch and pull request per repo, following the workspace's branch naming and same-name rule. Sam reviews and says when to merge. Never merge without his go-ahead.

1. **Add the repo to the workspace.** Copy how `trade-imports-plants-prototype` (commit `2cfceea4`) and `trade-imports-ins-tests` (commit `d439ad61`) were added:
   - an entry in `repos.json`; decide `dockerStack` (it is probably not a stack service) and say why
   - a row in `CLAUDE.md`'s repo map and in `README.md`
   - a page in `docs/repos/`, copying an existing page's shape
   - the clone under `repos/`, made the way the workspace's setup tooling clones any repo, so that `tim workspace status` shows it

2. **Set the repo up for k6.** Rip out the JMeter material: `scenarios/test.jmx`, `user.properties`, and every JMeter reference in `README.md`, `compose.yml` and `entrypoint.sh`. Keep and adapt the parts CDP depends on:
   - the Docker image the Portal runs
   - `entrypoint.sh`'s contract: read `ENVIRONMENT`, run the tests, write the report and upload it to `RESULTS_OUTPUT_S3_PATH` on S3 so the CDP Portal shows it
   - `publish.yml`
   - local running with Compose and LocalStack

   Add the Node tooling the build loop's gates need (lint, format, a unit-test command), matching the house style of the other Node repos. Then add one trivial k6 script that runs locally and in the image, proving the contract end to end. This is plumbing only. inc-001 builds the real smoke run on top of it. Follow `docs/best-practices/k6/BEST_PRACTICES.md`. k6 is ruled; JMeter is not a fallback.

3. **Extend the build loop.** The full lifecycle must take its repos from the backlog envelope, whatever their keys: a ticket, then per repo touched a branch, pull request, CI and merge. Update the Codex briefs to match. Cover it with the contract tests in `tim/src/backlog/workflow-contract.test.js`, which already cover the branch lifecycle's any-key repos. inc-014, which touches 6 repos, is the hardest case, so prove it with a `planOnly: true` dry run.

4. **Bring the backlog up to date, then merge its branch.**
   - Replace `trade-imports-animals-tests` with `trade-imports-ins-tests` wherever it describes today's repo. Leave the provenance brackets alone: they record what was read.
   - Check inc-001's criteria against what step 2 already built, and remove anything now done.
   - Run `tim backlog check shared/ins-performance-testing`.
   - Raise a pull request for `feat/NO_JIRA-ins-performance-testing`.

5. **Ask Sam, once:**
   - which Jira epic the increments go under (the full lifecycle raises a ticket each)
   - whether any of the 12 open questions in the report should change before building starts; otherwise each default is built as written
   - whether INS and the stubs are deployed to CDP perf-test yet; inc-003 is blocked until they are, and inc-016 and inc-018 wait on it

## Then build

Launch the build loop per `BUILD.md`, by `scriptPath`, never by name. Take `repos` from the backlog envelope. `tim backlog next shared/ins-performance-testing` gives the first increment, which is inc-001. The loop stops at the review points on inc-001, inc-003 and inc-009. Bring each to Sam with what he should look at, taken from the row's `gate` text.

## Rules that matter here

- **Protect other sessions' work.** Another session may be working in the canonical checkout. Check `git status` before switching branches there. If it holds someone else's changes, work in a fresh clone under `workareas/` (gitignored) rather than switching branches or stashing, then push from the clone.
- **Stay on the allowlist.** Every agent prompt carries a guard-rails block: tilde paths in Bash, absolute paths in Read/Write, one command per Bash call, no `cd`, no `sonar`, `git -C` and `npm --prefix`, no spawning subagents or forks, and finish your own task if a user message is relayed mid-task.
- **Keep the invariants on the backlog envelope.** Stubbed outside the INS boundary in every environment. SNS, SQS and cdp-uploader are real. Both journeys from the first increment. Every threshold ties to a volumetrics figure or a stated default.
- **Keep sensitive material out of public repos.** `trade-imports-workspace` and `trade-imports-performance-tests` are public. Never push the meeting transcript, Confluence copies or detail of the access-control finding (req-070).
- **Report as Sam likes it.** Progress as N of TOTAL (P%), plain English, and flag the calls you made rather than blocking on them. Only a real authorisation question stops the work.
