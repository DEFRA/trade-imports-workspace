# Bash to tim: brief for the loop's agents

This brief is for every agent that `loop.js` starts. The backlog is
`backlog.json`, in this folder. The evidence behind each row is in
`findings.json`:

- `inventory['script-catalogue'].scripts` lists every script, with its
  callers, the tokens it reads and its dependencies.
- `folderPlans[]` holds the detailed plan for each folder.
- `blockers` lists the problems that stop several clones working at once.

Read your row in `backlog.json`, then the matching parts of
`findings.json`. Line numbers there date from 13 Nov 2026. Find each place
again by its content.

## The goal

Every Bash script in this workspace repo gets one of three outcomes:

- ported to `tim`
- replaced by a plain `gh` command
- deleted

That covers `scripts/`, `tools/` and `.claude/hooks/`. Once that is done,
the workspace no longer needs a fixed path, and several clones can work at
once.

JavaScript workflows stay JavaScript. Only their fixed-path lookups change.

## Rules that bite here

- **No E2E, local or CI, while the work is under way.** These changes are
  workspace tooling. E2E runs once in GitHub Actions, after the whole
  backlog has landed. A `stack-smoke` check means: start the stack with
  `tim docker dev`, wait until every service is healthy, then
  `tim docker down`. Run no tests against it. Only rows that list
  `stack-smoke` start the stack. Take the stack lease first, and give it
  back afterwards.
- **Users change nothing.** A port reads the same environment variables as
  the Bash it replaces (`JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL`,
  `CONFLUENCE_*`, `SONAR_TOKEN` and so on), with the same defaults. `gh`
  keeps its own sign-in.
- **Behaviour does not change unless the row says so.** That covers output,
  the files written and exit codes. Where the row's `risk` names a change
  on purpose, put it in the commit message.
- **Rule 8:** GitHub calls stay on `gh`. A script that only wraps `gh`
  becomes `gh` in the skill text. Do not wrap it in `tim`.
- **tim's own rails** are in `tim/CLAUDE.md`: library-first, behavioural
  tests, `--json` envelopes and nock at the network boundary. The house
  rules on comments and names are in `.claude/rules/code-quality.md`.
- **Rule 6:** a red test on the branch is yours to fix. "Pre-existing" is
  not a reason to leave it.
- **Permissions:** `bash x.sh`, `sh`, `zsh` and `node` are denied. Run a
  script by its path instead, for example
  `~/git/defra/trade-imports-workspace/tools/jira/ticket.sh EUDPA-1`.
  Run tim's tests with `npm --prefix <workspace>/tim test`. A vitest test
  may spawn Bash.
- **macOS:** `sed` has no `\b` and still exits 0. Check every bulk rename
  with `grep`, not with the exit code
  (`docs/best-practices/shell.md`).
- **Branches:** use the `branch` the loop gives you, in the workspace and in
  any service repo the row touches. Create the branch from that repo's
  `origin/main` if it does not exist, and switch in place. No worktrees.
- **Commits:** write one commit per row in each repo, as
  `chore(NO_JIRA): <row title>`. End each message with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## The checks a row lists

| Check | What proves it |
|---|---|
| `parity` | Before you change anything, run the Bash on real or fixture inputs. Capture its stdout, exit code and the files it writes as golden fixtures in the tim test. The ported command must reproduce them, with differences only where the row says so. For a delete, show that nothing calls the script, or that what replaces it gives the same result. |
| `no-callers` | `git grep` the script's name across the workspace (skills, rules, docs, settings, hooks, CI, tim, workflows) and across `repos/*`. The only hits allowed are history and changelogs. |
| `tim-unit` | `npm --prefix <workspace>/tim test` is green. |
| `tim-lint` | `npm --prefix <workspace>/tim run lint` and `run format:check` are both clean. |
| `repo-tests` | Each service repo the row touches passes its own `npm test` and lint, or `mvn verify` for a Java repo. |
| `stack-smoke` | See "No E2E" above. |

Also check, on every row: no new mention of
`~/git/defra/trade-imports-workspace` or `$HOME/git/defra` outside
history, and no new `.sh` file.

## Builder

Your job is to implement your one row. Do not push.

1. Record the `HEAD` SHA of every repo you will touch.
2. Capture the parity goldens.
3. Make the change. Update every caller the row lists, and any others you
   find.
4. Delete the Bash the row retires. Do not edit any `.claude/settings.json`
   allowlist: append the entries for deleted scripts to
   `settings-followups.md` in this folder, under the row's id.
5. Run every check the row lists, and fix anything that turns red.
6. Commit.

Return the starting SHAs, your commits, each check's result in one line,
and any deviation from the row.

If the row cannot be built (a person must decide something, a credential
is missing, or a dependency did not really land), leave the tree as you
found it. Return `blocked` with the reason in one plain sentence.

## Verifier

You did not build this row, and your job is to prove it wrong. Read the
diff from the starting SHAs to `HEAD` in every repo it touched. Re-run
every check yourself; do not trust the builder's report.

Then hunt for these problems:

- a caller still naming the old script
- a token read differently from the Bash
- an output or exit code that changed without the row saying so
- a golden test that would pass against a wrong implementation
- a new fixed path
- Bash that was added rather than removed

Pass the row only if you found nothing.

An allowlist entry in a `.claude/settings.json` that names a script this
row deletes is not a problem to block on. Agents cannot edit permission
config. Append the exact entries to `settings-followups.md` in this folder,
under the row's id, and Sam removes them. A hook command that still calls
a deleted script is a problem: it breaks the hook.

## Fixer

Take the verifier's problems, fix every one on the same commits (amend or
add a commit), and re-run the checks.

Return the same report as the builder.
