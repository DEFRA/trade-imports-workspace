---
name: nightly-digest
description: 'The nightly digest job: read what needs a person across every repo in repos.json and DEFRA/trade-imports-workspace, and write it to workareas/nightly/<yyyy-mm-dd>/digest.md, then send one push notification. It lists open Dependabot and nightly pull requests, red main builds (a red tests-repo main right after a paired service merge is "rerun", not "broken"), the holds and cross-repo sets waiting, and npm drift from tim deps drift, and summarises what the other nightly jobs did overnight. It changes no repo, merges nothing and pushes nothing. Triggers: "[nightly:digest]", "run the nightly digest", "write the nightly digest". NOT for fixing or merging a pull request (that is the deps-fix job), NOT for registering the jobs (use nightly-start), and NOT for changing what a nightly job may do (edit .claude/rules/nightly.md).'
---

The digest is the one thing a person reads in the morning. It says what
needs them, what merged and what is waiting, with a link for each line.
This job reads and writes the digest only. It changes no repo, opens and
merges no pull request, and pushes nothing, so it is the job that proves
the session and its crons work before any job that merges is turned on.

It runs under [`.claude/rules/nightly.md`](../../rules/nightly.md), which
sets the digest's format and the push notification. It runs last each night
(see [`config/nightly-jobs.json`](../../../config/nightly-jobs.json)), after
the other jobs have appended their sections.

## Path conventions

Every path here is relative to the workspace root. Run Bash from there.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

The digest date is the date the run starts, in the local time zone: the
morning it is read. Below, `<date>` is that date as `yyyy-mm-dd`, and
`workareas/nightly/<date>/` is the night's folder. Write anything you need
to keep between steps there, never in a repo.

## When to use

| Trigger | What to do |
|---|---|
| A cron prompt starting `[nightly:digest]` | Steps 1 to 9, unattended. Ask nothing |
| "run the nightly digest" in an attended session | Steps 2 to 8. Skip the push notification in step 9 unless asked |

## Steps

### 1. Check the kill switch

```bash
tim nightly stopped --json
```

If `result.stopped` is true, write one line to the digest saying the
digest did not run and the reason from `result.reason`, then end the run.

### 2. List the repos to read

```bash
cat repos.json
```

Read every repo in its `repos` list, plus `trade-imports-workspace`. The
workspace is not in `repos.json`, but its own Dependabot opens pull requests
for tim and the GitHub Actions, so every read below includes it. Below,
`<repo>` is each of these in turn.

### 3. Open bot and nightly pull requests

For each repo, Dependabot's open pull requests:

```bash
gh pr list --repo DEFRA/<repo> --app dependabot --state open --json number,title,url,isDraft,updatedAt
```

And the nightly jobs' own, whose branches all start `chore/EUDPA-802-`:

```bash
gh pr list --repo DEFRA/<repo> --state open --search "head:chore/EUDPA-802" --json number,title,url,isDraft,updatedAt,author
```

Keep a nightly-branch pull request only when its author is the nightly
session's own GitHub user (`gh api user --jq .login`). One a person raised
on such a branch is theirs, not the jobs'.

For each pull request, read its checks:

```bash
gh pr checks <number> --repo DEFRA/<repo> --json name,bucket,link
```

`bucket` is `pass`, `fail`, `pending`, `skipping` or `cancel`.

Sort each one into the digest:

| What you see | Where it goes |
|---|---|
| A draft | "Needs you", with the one thing its description says a person must decide |
| Ready, every check green | "Waiting", as ready to merge for the deps-fix job, once that job is on |
| Ready, a check red or failing | "Needs you", naming the red check and its link |
| Ready, checks still running | "Waiting" |
| Open more than 7 days with no update | "Needs you", as stale |

### 4. Red `main` builds

For each repo from step 2:

```bash
gh run list --repo DEFRA/<repo> --branch main --limit 10 --json workflowName,conclusion,status,createdAt,updatedAt,url,event,headSha
```

Take the newest completed run of each workflow. A workflow whose newest
completed run concluded `failure`, `timed_out` or `startup_failure` is red.
A `cancelled` run alone is not: GitHub cancels a run when a newer one
supersedes it, so look at the next one back.

Label each red workflow before you list it. A red `E2E Tests` run on
`trade-imports-ins-tests` `main` is "rerun", not "broken", when it follows a
paired merge:

1. List the tests-repo pull requests that merged in the 2 hours before the
   red run started:

   ```bash
   gh pr list --repo DEFRA/trade-imports-ins-tests --state merged --search "merged:>=<run start less 2 hours>" --json number,headRefName,mergedAt,url
   ```

2. For each one, find a service pull request on the same branch name that
   merged too. Cross-repo branches share one name (CLAUDE.md rule 2):

   ```bash
   gh search prs --owner DEFRA --head <headRefName> --merged --json repository,number,url,closedAt
   ```

   Keep only the results whose repository is in step 2's list.

3. For each service it finds, read the service's `Publish` run for that
   merge:

   ```bash
   gh run list --repo DEFRA/<service> --branch main --workflow Publish --limit 5 --json conclusion,createdAt,updatedAt,url
   ```

4. If the service's `Publish` run finished after the red E2E run started,
   the E2E run pulled the old `:latest` image. Label it "rerun", with the
   two pull requests' links, and say to rerun it with
   `gh run rerun <run id> --repo DEFRA/trade-imports-ins-tests`. Do not rerun
   it yourself: this job changes nothing.

Every other red workflow is "broken". List each in "Needs you", with the
run's link and the first failing job's name. Read the failing job's name
from:

```bash
gh run view <run id> --repo DEFRA/<repo> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .name'
```

A "rerun" goes in "Waiting", not "Needs you": the next paired merge or a
rerun clears it.

### 5. Holds and cross-repo sets waiting

```bash
tim deps holds --json
```

List each hold in "Waiting": the package, the versions held, the repos and
what it clashes with.

### 6. npm drift

```bash
tim deps drift --json
```

It reads each repo's `package.json` at `origin/main` and asks npm which
packages have a newer release. It changes nothing.

- `result.setsBehind`: list each cross-repo set in "Waiting", with the repos
  behind and the version each would move to. A set member a hold covers is
  waiting on the hold, not on readiness: say so.
- `result.repos`: add a short "Drift" section with one line per repo: its
  `counts` of major, minor and patch moves. Name the majors. A repo with
  `read: false` gets a line saying it had nothing to read.
- npm refuses a release under 7 days old in every repo, and Dependabot waits
  the same, so a move proposed here is not yet late. A major that has no
  Dependabot pull request open after 14 days goes in "Needs you".

### 7. What the other jobs did

Read the night's digest if it exists:

```bash
cat workareas/nightly/<date>/digest.md
```

Each other job appended a section headed with its name (`## deps-fix` and
so on). Take every pull request those sections say merged into "Merged",
and every draft, stop or ticket into "Needs you". A job that wrote no
section did not run: say so in one line, unless `config/nightly-jobs.json`
has it turned off.

### 8. Write the digest

Write `workareas/nightly/<date>/digest.md` in the format
[`.claude/rules/nightly.md`](../../rules/nightly.md) gives: the heading
with the date written out, then "Needs you", "Merged" and "Waiting", then
"Drift", then every job's own section as it stands. Keep the other jobs'
sections word for word below yours. Create the folder if it does not exist.

Each line names the repo, the pull request or run number, what it is, and
its link. "Needs you" lines end with the one thing a person must decide.
A night with nothing to report still gets a digest that says so under each
heading.

### 9. Send the push notification

Send one push notification with the `PushNotification` tool. One line,
under 200 characters, leading with what needs a person, for example:

```text
Nightly: 2 need you (ins-tests main broken, govuk-frontend 6.6.0 draft), 1 rerun, 0 merged. workareas/nightly/2026-11-26/digest.md
```

No other job sends one.

## What this job never does

Everything `.claude/rules/nightly.md` bans, and also, because this job only
reads:

- switch a branch, commit, push, open, update, comment on or merge a pull
  request
- rerun or cancel a workflow run
- write anywhere but `workareas/nightly/<date>/`
