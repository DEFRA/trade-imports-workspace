# Pull request descriptions

A pull request description tells a reviewer what the change is, why it is
needed and how it was checked. It describes this change, as it stands. It
is not a place for notes about other work.

## What a description holds

In this order:

1. **What.** What changed, in a few bullets. Name the files, commands or
   pages a reviewer should look at.
2. **Why.** The problem the change solves. Link the Jira ticket when there
   is one.
3. **Checks.** What you ran and what it showed: tests, lint, a probe that
   proved a new test fails without the change, a page you looked at.

## What it leaves out

- **Notes about other branches and pull requests.** That includes merge
  order, expected conflicts and "this needs X first". Tell whoever does the
  merge directly, or link the pull requests in the ticket. A description
  outlives the branches it mentions.
- **History.** How the problem was found, earlier attempts, a session
  timeline. Git and the ticket hold it.
- **Repeated diff.** A line-by-line walk through the code. The diff is
  right below.

Bad:

> ## Note
>
> `chore/EUDPA-298-no-ticket-priority` also edits `SKILL.md`. Whichever
> branch merges second will need to resolve a conflict there.

Good: no such section. The description says what this change does, why
and how it was checked.

## Writing it

Follow [`gds/writing.md`](gds/writing.md): plain English, active voice,
short sentences.
