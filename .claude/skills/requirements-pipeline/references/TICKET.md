# TICKET mode

One ready Jira ticket in, a backlog, its branch opened in every repo, the change built by the loop, and green pull
requests out. The main session runs this file from entry to the merge. Every command is relative to the workspace
root.

Ticket mode is a phase of the requirements pipeline. It is the deliberate exception to DISTIL's full extract (see
[What ticket mode gives up](#what-ticket-mode-gives-up-against-distil)). It is for one ticket that the refinement
check calls READY. Anything bigger [escalates](#4-escalation).

| Who | Does what |
|---|---|
| The main session | Fetches the ticket, runs the intake, takes the questions to the user, opens the branch, pushes it, raises the draft pull requests, launches the build, ends the run, comments on the ticket |
| The intake workflow | Reads the ticket and the code, writes the intake record and a combined backlog, tries to refute it |
| The build loop | Builds each row onto the branch under the branch lifecycle, commits, pushes and waits for CI |
| The user | Answers the questions that hold the launch, and gives the go to merge |

This file says how a request reaches ticket mode: "build EUDPA-X", "implement EUDPA-X", "backlog EUDPA-X",
"get EUDPA-X into a backlog" and "build EUDPA-X on a branch". Planning a ticket, following a plan and implementing
by hand belong to the `ticket` skill.

Ticket mode never rewrites a person's ticket. It posts one comment, edits that comment on a rerun, and moves the
status. The `ticket` skill's rule that writing needs the user's go does not reach this mode: the comment and the
status move are part of the run, as the `theme-ticket` skill's rules say.

## 1. Entry

Fetch the ticket into a workarea and name it as the one source:

```bash
tim backlog from-ticket EUDPA-123 --json
```

The result names the workarea (`shared/eudpa-123-<slug>`), the branch (`<type>/EUDPA-123-<slug>`) and any blockers it
saw. Exit 1 means the workarea already has a built row, or more than one workarea holds the ticket: pass
`--workarea`. A blocker is reported to the user before anything else.

## 2. Intake

Launch the intake workflow by `scriptPath`, never by `name`:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/ticket-intake.js", args })
```

`args` is the four keys in [`../workflow/README.md`](../workflow/README.md#ticket-intakejs): `workspace`, `workarea`,
`tim` and `models`. It returns the readiness verdict, the ids of the rows to build, the questions, any escalation and
the paths of `investigation.md`, `intake.json` and `backlog.json`. A `stopped` result names the reason: fix what it
names and launch again. A rerun keeps every row id.

## 3. Questions

Take every question to the user in one batch, in plain words, each with its default. Say which hold the launch and
why. A question that does not hold it takes its default and is listed at the end of the run.

An answer is a ruling. Write it to `workareas/<workarea>/sources/ruling-sam-<date>.md`, add it to `sources.json` as a
`ruling:` source ranked first in `precedence`, and launch the intake again. Rerun until no question holds the launch.

## 4. Escalation

Ticket mode stops, and hands the ticket on, when the result names an escalation:

- the readiness verdict is SPIKE REQUIRED
- the intake holds more than 3 questions
- more than 4 rows are still to build
- a second requirement source is needed

Say which signal fired, then either stop and use the `ticket-refiner` skill, or run DISTIL on the same workarea. For
DISTIL, `sources.json` is already written: run `tim distil reset <workarea> --stage reconcile --json`, then launch
`workflow/distil.js` as [`DISTIL.md`](DISTIL.md) says. Escalate only before the first row lands. After that, the rows
that landed are built and the rest is a new ticket.

## 5. Before the launch

Check the ticket has not changed in Jira since the workarea was written:

```bash
tim backlog from-ticket EUDPA-123 --check --json
```

A changed ticket reruns the intake (step 2). Then check the backlog is in shape:

```bash
tim backlog check <workarea> --json
```

## 6. Branch and pull requests

Open the envelope's branch in every repo the backlog builds, and in the workspace:

```bash
tim build branch <workarea> --open --json
```

Each repo ends on the branch with one empty opening commit where it had no commits of its own, and the result says
whether origin has the branch yet. The command never pushes and never calls GitHub. A repo with uncommitted work is
refused before any repo changes, naming it. The workspace's own uncommitted files travel with it.

For each repo the result says needs a push, push with the fully qualified refspec. The pre-push gate runs. Never use
`-u` or `--force`:

```bash
git -C <repo path> push origin refs/heads/<branch>:refs/heads/<branch>
```

`<repo path>` is the repo's `path` in the backlog's `repos` map, and the workspace's is `.`.

For each repo with no open pull request, raise a draft one. The GitHub slug is the repo's `github` in the backlog's
`repos` map, and the workspace's is `DEFRA/trade-imports-workspace`:

```bash
gh pr create --draft --repo <github> --base main --head <branch> --title "<KEY> <ticket title>" --body-file <file>
```

The draft body says what the ticket is for, links the sibling pull requests, and says the build loop fills in the rest.
Then confirm there is exactly one open pull request in each repo:

```bash
gh pr list --repo <github> --head <branch> --state open
```

## 7. The ticket at the start

Run the `theme-ticket` skill's START step with the ticket key as the theme. It moves the ticket to In Dev. The loop
also assigns the ticket to you and moves it onto the board when it starts.

## 8. Launch

Launch the build loop as [`BUILD.md`](BUILD.md#2-launch-it) says, with these values:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args })
```

| Arg | Value |
|---|---|
| `lifecycle` | `'branch'` |
| `branch` | The backlog envelope's `branch` |
| `scope` | The ticket key, so `derive` finds the row commits on an unthemed backlog |
| `workarea` | The ticket's workarea |
| `repos` | The envelope's `repos`, copied in full |
| `stopAfter` | `'all'` |
| Every Jira key, `requireApproval`, `approvalWaitMinutes` | `null` |

BUILD.md's [branch lifecycle](BUILD.md#branch-lifecycle) says what the loop does and never does. It never creates,
edits, un-drafts or merges a pull request.

## 9. The workspace after the drain

When the loop drains, the workspace pull request holds only the opening commit. The land stage commits `openspec/`
and never pushes the workspace, and anything else a row wrote there is in the result's `leftUncommitted`.

Commit each path `leftUncommitted` lists, by explicit path. Never use `add -A`, `commit -a` or a commit without a
pathspec:

```bash
git -C . add -- <paths>
git -C . commit -m "<message>" -- <paths>
```

Then push the workspace branch with the fully qualified refspec. The pre-push gate runs:

```bash
git -C . push origin refs/heads/<branch>:refs/heads/<branch>
```

The ticket's comment in step 10 links to spec files, so they must be on GitHub first.

## 10. The end

1. **Descriptions.** Write each pull request's description as
   [`docs/best-practices/pull-requests.md`](../../../../docs/best-practices/pull-requests.md) says: what, why and
   checks.

   ```bash
   gh pr edit <number> --repo <github> --body-file <file>
   ```

2. **Out of draft.** Take each pull request out of draft. If the signed-off check made them drafts, leave them as drafts,
   report the hold and stop.

   ```bash
   gh pr ready <number> --repo <github>
   ```

3. **The ticket's comment.** Run the `theme-ticket` skill's ticket path: derive with `--theme <KEY>`, then the comment
   step. This runs only after step 9's push.

   ```bash
   tim theme-ticket derive --workarea <workarea> --theme <KEY> --out workareas/<workarea>/tickets/derived.json
   tim theme-ticket comment --workarea <workarea> --derived workareas/<workarea>/tickets/derived.json
   tim theme-ticket comment --workarea <workarea> --derived workareas/<workarea>/tickets/derived.json --confirm
   ```

   The first `comment` is a dry run. The second posts one what-shipped comment, listing the shipped scenarios by
   domain. The description and summary stay as a person wrote them.

4. **Checks.** Watch each pull request's checks as a background task, never by polling:

   ```bash
   gh pr checks <number> --repo <github> --watch
   ```

5. **Stop for the go.** When every check is green, post the pull request links and the evidence, and stop. Workspace
   rule 3 holds: ticket mode never merges a pull request itself.

## 11. On the go

Merge in order: a service before the frontend that calls it, the tests repo after the services it exercises, the
workspace last. Delete each branch only after its merge.

```bash
gh pr merge <number> --repo <github> --squash
```

## 12. The ticket after the merge

Re-derive from `main`, so the comment's links point at `main`, then run the comment step again. It edits the same
comment. Then move the ticket on:

```bash
tim theme-ticket derive --workarea <workarea> --theme <KEY> --branch main --commits-from <branch> --out workareas/<workarea>/tickets/derived.json
tim theme-ticket comment --workarea <workarea> --derived workareas/<workarea>/tickets/derived.json --confirm
tim jira transition <KEY> "Deskcheck"
```

## What ticket mode gives up against DISTIL

| DISTIL does | Ticket mode does instead |
|---|---|
| Characterises each source and extracts it part by part, claim by claim | One reader reads the ticket in full and the code it touches |
| One verifier per extract checks every claim | One different agent tries to refute every row, split and statement |
| Reconciles claims across sources, with precedence | The ticket is the only requirement source, with the user's rulings above it |
| Challenges every question on its own | One refuting agent challenges every question |
| Drafts rows per area and combines them, with a report | One row is the default, and every further row says in its notes why it cannot join another |

This is enough for one ready ticket. It is why a second requirement source, a spike or a larger ticket escalates
(step 4).
