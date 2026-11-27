---
name: nightly-start
description: 'Start, or restart, the scheduled nightly maintenance jobs in an ordinary Claude Code session that the person opens at the workspace root over SSH and leaves open: check the session is ready (SONAR_TOKEN set, no ANTHROPIC_API_KEY, gh signed in, tim on PATH, the kill switch off, every checkout clean outside workareas/), fetch every repo, delete the nightly crons this session registered before, then register every job config/nightly-jobs.json turns on as a recurring session cron, report when each runs next and when they all expire, and offer to run one job now so the person can watch it work. Run it when the session starts and again every 7 days, because recurring crons expire after 7 days. Triggers: "/nightly-start", "start the nightly jobs", "restart the nightly jobs", "register the nightly crons". NOT for running a nightly job by hand (run that job''s own skill), NOT for changing what a job may do (edit .claude/rules/nightly.md), and NOT for adding a job or changing its schedule (edit config/nightly-jobs.json, then run this).'
---

The nightly jobs run in an ordinary interactive Claude Code session on an
always-on Mac. Connect to the Mac over SSH, open `claude` at the workspace
root, run `/nightly-start` and leave the session open. The jobs fire while
the session is idle, and you can watch each one work in that window.

`CronCreate` registers the jobs for this session only, and a recurring cron
expires after 7 days. This skill sets them up in one command, so the weekly
restart is one command too.

It registers what [`config/nightly-jobs.json`](../../../config/nightly-jobs.json)
turns on. What each job may do once it fires is in
[`.claude/rules/nightly.md`](../../rules/nightly.md).

## Path conventions

Every path here is relative to the workspace root. Run Bash from there.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

| Trigger | What to do |
|---|---|
| "/nightly-start", "start the nightly jobs" | Steps 1 to 6, in a session opened at the workspace root over SSH |
| "restart the nightly jobs", the 7-day expiry is near | Steps 1 to 6. Step 4 deletes the old crons first, so nothing runs twice |
| "stop the nightly jobs" | Not this skill. Create the stop file (see "Stopping the jobs") |

## Steps

Stop at the first step that fails. Report what failed and what the person
should do, and register nothing. A half-ready session must not run jobs
unattended.

### 1. Check the session

Run:

```bash
tim nightly check --fetch --json
```

If the shell cannot find `tim`, stop: tim is not on PATH. Tell the person to run
`npm --prefix tim link` from the workspace root and restart the
session.

`tim nightly check` fetches origin in the workspace and every cloned repo,
then checks:

| Check | Fails when |
|---|---|
| `sonar-token` | `SONAR_TOKEN` is not set, so the Sonar push gate would skip |
| `no-anthropic-api-key` | `ANTHROPIC_API_KEY` is set, so the session would bill the API |
| `stop-file` | `workareas/nightly/STOP` exists |
| `jobs-config` | `config/nightly-jobs.json` is missing or invalid |
| `clean-checkouts` | the workspace or a cloned repo has uncommitted changes. Changes under the workspace's `workareas/`, tracked or untracked, do not count |
| `fetch` | fetching origin failed in the workspace or a repo |

If `result.ready` is false, print each check whose `ok` is false, with its
`detail`, and stop. An environment variable is fixed in `~/.zshrc`, then a new
session. Do not clean a checkout for the person: the changes may be someone's
work.

### 2. Check GitHub sign-in

Run:

```bash
gh auth status
```

If it exits non-zero, stop and tell the person to run `gh auth login`. tim has
no GitHub commands (CLAUDE.md rule 8), so this check lives here.

### 3. Pick the jobs to register

From `result.jobs` in step 1, take every job whose `enabled` is true. If there
are none, say so, run step 4 to clear any old nightly crons, and stop: there is
nothing to register.

### 4. Delete the old nightly crons

Call `CronList`. For every cron whose prompt starts with `[nightly:`, call
`CronDelete` with its id. Leave every other cron alone: it is not this skill's.

### 5. Register the jobs

For each job from step 3, call `CronCreate` with:

- `cron`: the job's `cron`, exactly as written (local time)
- `prompt`: the job's `cronPrompt`, exactly as written. It starts with the
  `[nightly:<name>]` marker step 4 finds next time
- `recurring`: true

Do not change a job's minute. The registry already avoids minutes 0 and 30.

### 6. Report

Call `CronList` again and print a table with a row for each nightly cron:

| Job | Cron | Next run | Purpose |
|---|---|---|---|

Take "Next run" from `CronList`, not from the cron expression: the scheduler
can run a job a little late.

Then say:

- the crons expire 7 days from now, on the date (for example
  "21 November 2026"), so run `/nightly-start` again before then
- the jobs fire only while this session is idle, so leave it open with no
  prompt running, and keep the Mac awake. Each job works in this window, so
  you can watch it
- the digest for each morning will be at
  `workareas/nightly/<yyyy-mm-dd>/digest.md`

Then offer to run one job now, so the person can watch it work without
waiting for its cron. List the jobs from step 3 by name and ask which one to
run, or none. If they name one, call `CronCreate` with:

- `cron`: the next minute, in local time
- `prompt`: that job's `cronPrompt` from step 1, exactly as written, so it
  starts with `[nightly:<name>]` and runs under
  [`.claude/rules/nightly.md`](../../rules/nightly.md) as it would at night
- `recurring`: false

Tell the person it starts within a minute, once the session is idle.

## Stopping the jobs

Create the stop file. Every job checks it first and ends without doing
anything:

```bash
echo "Reason for stopping" > workareas/nightly/STOP
```

Delete the file to turn the jobs back on. To remove the crons as well, call
`CronList`, then `CronDelete` for each `[nightly:` cron.
