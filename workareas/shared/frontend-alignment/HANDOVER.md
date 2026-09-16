# Handover: be interviewed about the frontend-alignment proposal

You are the agent Sam interviews about the frontend-alignment design proposal. You did not build it. Your job is to answer his questions accurately: from the report first, then by verifying against the code and the state files, and by exploring for answers the report does not hold. Never guess. If you do not know, say so, go and look, then answer with evidence cited as `file:line` or a commit SHA.

## Rails

- Never use the Grep or Glob tools; use Bash `grep -rn` and `find`, and the Read tool.
- One command per Bash call. No `&&`, `;`, `|`, `cd`, no `VAR=x cmd`. No awk or sed. Redirecting output to a file is fine.
- Bash paths are always `~/git/defra/trade-imports-workspace/...`. Read/Write/Edit take `/Users/samfarrington/git/defra/trade-imports-workspace/...`. Same directories, two spellings.
- Never merge a pull request. Never push to main. Never `--force`. Never switch the branch of any checkout under `repos/`: they are Sam's live work. Everything you need is in the clones below.
- Only edit if Sam asks for a change. Then edit in the clone, commit with the trailer below, push with the fully qualified refspec `git -C <clone> push origin refs/heads/feat/NO_JIRA-frontend-alignment:refs/heads/feat/NO_JIRA-frontend-alignment`.
- Commit trailer, two lines after a blank line: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: <this session's URL>`. Write the message to a file and commit with `-F`; the guard blocks `-m` messages that name uncommitted paths.
- Answer in Sam's register: lead with the answer, short sentences, no em dashes, no time estimates, refer to work by what it does rather than by ticket or stage number unless he uses the number first.

## What the proposal is

Bring `trade-imports-ins-frontend` into the same shape as the two journey frontends (`trade-imports-animals-frontend`, `trade-imports-plants-frontend`) without extracting a shared package, and backport the chassis hardening ins already had to the two journeys. Duplication is deliberate; the goal is alignment plus a drift check. Journey-only layers (model, bridge, engine, flow, analysis, sets, obligation purity, the L3/L4 dependency-cruiser rules) were never ported to ins. Public URLs of ins did not change. It is a demonstration for the team to accept, amend or reject; nothing is merged.

Branch, same name in every repo: `feat/NO_JIRA-frontend-alignment`. No Jira ticket by design.

## Where everything is

Clones, all on the branch, all under `~/git/defra/trade-imports-workspace/workareas/clones/` (gitignored; Read tool uses the `/Users/samfarrington/...` form of the same path):

- `trade-imports-workspace` — the report and every state file:
  - `workareas/shared/frontend-alignment/report.md` — the document Sam reads. Open questions first, then reversible decisions, then what was built, caveats, residual drift, locations.
  - `workareas/shared/frontend-alignment/stages.json` — fourteen stages. Per stage: brief, reference files, ladder, status, commit SHA, prs, `notes` (planner decisions, implementor findings, judge rulings, CI fixer diagnoses) and `openQuestions`. This is the primary source; the report is derived from it.
  - `workareas/shared/frontend-alignment/plans/s01..s14.md` — the file-level plan each stage executed, each opening with a decision table. "Why was X done this way" is answered here.
  - `workareas/shared/frontend-alignment/run-wf_a52aa0bf-91f.journal.jsonl` — every agent's return value from the first run, one JSON line each. `jq -c 'select(.type=="result") | .result.summary' <file>` lists them.
  - `workareas/shared/frontend-alignment/surfaces.json` — the draft manifest of files the three repos are meant to share, with the rule for each.
  - `docs/analysis/frontend-alignment-workflow-run.md` — how the run worked and the numbers.
  - `.claude/workflows/frontend-alignment.js` — the workflow that built it.
- `trade-imports-ins-frontend` — the aligned ins. `git -C <clone> log --oneline origin/main..HEAD` lists every stage commit.
- `trade-imports-animals-frontend` and `trade-imports-plants-frontend` — the two journeys with the backport, main merged in.
- `trade-imports-animals-tests` — the tests repo with its one-line change.

If a clone is behind, `git -C <clone> fetch origin` then `git -C <clone> merge --ff-only origin/feat/NO_JIRA-frontend-alignment`.

Pull requests, all draft, none to be merged:

- ins: https://github.com/DEFRA/trade-imports-ins-frontend/pull/27
- animals: https://github.com/DEFRA/trade-imports-animals-frontend/pull/339
- plants: https://github.com/DEFRA/trade-imports-plants-frontend/pull/69
- tests: https://github.com/DEFRA/trade-imports-animals-tests/pull/227
- workspace, the preservation PR against main, Sam's call to merge: https://github.com/DEFRA/trade-imports-workspace/pull/47

Check state with `gh pr view <n> --repo DEFRA/<repo> --json isDraft,statusCheckRollup`. Do not quote a check state you have not fetched this session.

## Facts you should hold without looking them up

- Direction rule: ins moved toward the journeys; where animals and plants differ, plants' shape was preferred. Every such call is a two-against-one call the team can reverse; the report lists them with the count.
- Rulings so far: stub sign-in convergence is not a stage until real authentication exists (direction recorded in s12 notes and the report). Lighthouse is in, built as s14, proven locally at 100/100/100 on six pages. Husky postinstall and the pinned-npm backport are undecided. cdp-app-config sets none of the stub-mode variables for ins.
- Caveats: the Welsh copy is machine-drafted and needs a translator before any real release. A Sonar-driven CI fix on animals and plants left ins two lines behind (`https://placeholder` and `TypeError` in the journeys; ins kept the older lines); it is the worked example of why the drift check is needed. The Lighthouse CI job fires only once `lighthouse.yml` is on main, because `workflow_run` reads the default branch, and needs GitHub Pages enabled from `gh-pages` on the ins repo. `sass` was pinned as a real devDependency because npm on Linux demanded it from the lockfile and macOS could not see that. SonarCloud runs on every PR and the local ladder cannot see it, which is why several stage commits have a `fix(alignment)` follow-up.
- Housekeeping: plants-frontend has a stash on main labelled "pre-alignment" holding Sam's obligation-graph script; it is his to pop.

## How to answer the kinds of questions you will get

- "Why did you do X?" — the stage's plan under `plans/`, decision table first; then the stage's `notes` in stages.json for what the implementor, judge or CI fixer added. Quote the decision, cite the file.
- "Does the code actually do X?" — read the clone. Cite `path:line`. If the report and the code disagree, the code wins and you say the report is stale.
- "What would it cost to reverse Y?" — find the stage commit in stages.json, run `git -C <clone> show --stat <sha>`, and describe the touched surface. Do not estimate time.
- "Is it green?" — fetch the PR checks now.
- "What is still open?" — the report's first section, cross-checked against `jq -r '.stages[] | select((.openQuestions|length)>0) | .id + ": " + (.openQuestions|join(" | "))' <stages.json>`.
- "Would this work for the plants frontend / the admin app / a new service?" — reason from the target tree in the stages.json header and the ins docs under `src/server/app/docs/` in the ins clone, and say what you are inferring rather than reading.
- Anything you cannot find — say "I don't know; let me check", then check. An honest gap beats a plausible answer.

Start by reading `report.md` in full, then `stages.json`'s header (`jq 'del(.stages)'`), then the open-questions list. Then tell Sam you are ready and what the current PR check states are.
