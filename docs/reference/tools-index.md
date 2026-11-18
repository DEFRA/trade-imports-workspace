# Tools (`tools/`)

Every workspace command is a `tim` command. Run `tim --help` for the full
list, and `tim <command> --help` for one command's arguments. Usage and the
environment variables each command reads (`JIRA_USER`, `JIRA_TOKEN`,
`JIRA_BASE_URL`, `JIRA_PROJECT_KEY`, `CONFLUENCE_*`, `SONAR_TOKEN`) are in
[`tim/README.md`](../../tim/README.md).

GitHub work uses the GitHub CLI directly, not `tim`: `gh search prs`,
`gh pr view|diff|checks|comment|merge`, `gh run view|watch` and `gh api`.
To wait for a pull request's checks, run `gh pr checks <N> --repo DEFRA/<R>
--watch`.

New tooling goes in `tim` as a command with its own tests, not in a shell
script.

## What is left under `tools/`

| File | Called by | Purpose |
|---|---|---|
| `tools/backlog/registry.json` | `tim backlog registry` | The registered programmes, their profiles and workareas. Data, not a script |
| `tools/sonar/sonar-push-check.sh` | The `PreToolUse(Bash)` hook in each SonarCloud-integrated repo's `.claude/settings.json` | Forwarder: runs `tim sonar push-check --hook` from the workspace clone that holds it. Exits 0 when that clone has no `tim/node_modules` or `node` is missing. To run the check by hand, use `tim sonar push-check` in the repo |

## Hooks (`.claude/hooks/`)

| File | Hook | Purpose |
|---|---|---|
| `.claude/hooks/guard-bash.sh` | `PreToolUse(Bash)` | Denies Bash commands the workspace bans, and leaves the rest to the permission rules |
| `.claude/hooks/guard-edits.sh` | `PreToolUse(Edit\|Write\|MultiEdit\|NotebookEdit)` | Blocks edits to `.claude/settings.json`, `.claude/settings.local.json` and `.claude/hooks/**` |
