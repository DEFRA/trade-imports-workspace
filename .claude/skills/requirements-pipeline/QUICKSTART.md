# Requirements pipeline: quick start

Turn requirements into built, reviewed increments in two steps:

1. **Distil.** Your sources become a backlog and a report.
2. **Build.** The backlog is built one increment at a time.

You talk to Claude Code in the workspace. The skill does the rest.

## Before your first run

- Clone the workspace to `~/git/defra/trade-imports-workspace`.
- Link tim: `npm --prefix ~/git/defra/trade-imports-workspace/tim link`.
- In Claude Code, run `/config` and raise **Dynamic workflow size**. One increment uses about 25 to 50 agents.
- To build with tickets and pull requests, set `JIRA_USER`, `JIRA_TOKEN` and `JIRA_BASE_URL`, and log in to `gh`.

## 1. Distil

Name the goal, your sources and which source wins when they disagree. **Always include the repos you will build in.** That way the backlog lists what needs to change, not what already exists.

> Distil requirements for high-risk plants origin and commodity. Goal: an importer gives where the goods come from and what they are. Sources: the plants frontend and backend repos, Confluence page 6518997274, and the CHED-PP trace set limited to the country-of-origin and commodity pages. Precedence: the repos' existing rulings, then the Confluence page, then the traces.

You get these files in `workareas/shared/<programme>/`:

- `report.md`. **Read this first.** It opens with the questions that need you. Each question comes with the default that will be built if nobody answers.
- `backlog.json`. The increments. Each one is a requirement covering every repo it needs, never a list of files to change.

To answer questions, re-distil:

> Re-distil hrp-origin-and-commodity. Q1: use the nine statutory categories. Q3: quantity is a number with a unit of kilograms or items.

## 2. Look before you build (optional)

> Dry-run the plan for inc-001 in shared/hrp-origin-and-commodity.

This writes `plans/inc-001.md`, showing how the increment would be built against the code as it is now. Nothing is changed.

## 3. Build

**On a scratch branch, with no tickets or pull requests:**

> Build inc-001 from shared/hrp-origin-and-commodity, lifecycle local, on branch spike/hrp-origin in every repo.

**For real: a ticket, a branch, a pull request per repo, CI and merge:**

> Build the next 3 increments from shared/hrp-origin-and-commodity, lifecycle full, epic EUDPA-12345, statuses "In Progress" and "Done".

Each increment is:

1. planned
2. implemented
3. reviewed by the workspace `review` and `code-style` skills
4. verified
5. fixed
6. tested, including an end-to-end test in the tests repo

To hand the build to Codex, add "with Codex" to the prompt. It works from the same backlog, with no edits.

## When it stops

At every stop, it prints a handover prompt. Paste it into a new session to carry on.

| It says | What to do |
|---|---|
| `awaiting-approval` | Nothing is wrong. Every PR is green and needs a reviewer other than you. Approve them all, then resume. |
| `changes-requested` | Answer the review, then resume. |
| `ci-red` or `main-red` | Look at the linked run. It never reverts on its own. |
| `no-buildable` | Everything is done, or waiting on a question. Check `report.md`. |

## Useful commands

```bash
tim backlog check shared/<programme>   # is the backlog in shape?
tim backlog next shared/<programme>    # what builds next?
```

For more detail, see `SKILL.md`, and in `references/`: `DISTIL.md`, `BUILD.md`, `SHAPE.md` and `backlog.schema.json`.
