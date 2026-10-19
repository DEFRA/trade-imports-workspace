# 2. Guard agent commands with the deny list and hooks, not the Bash sandbox

- Status: Accepted
- Date: 2026-06-10

## Context

Claude Code can run Bash commands inside an operating-system sandbox
(`sandbox.enabled: true`). It limits which folders a command may write to and
which hosts it may reach. It was trialled on this workspace's development loop:
Node, Maven, Docker and `gh` against the repos under `repos/`.

With the sandbox on:

- `npm ci` exits 0 with no output and never fills `node_modules`, even with
  `~/git/defra` and `~/.nvm` added to `sandbox.filesystem.allowWrite`.
  `npm --version` still works, so the failure is easy to miss.
- A command run with `npm --prefix <dir>` or `mvn -f <dir>/pom.xml` writes
  outside the current folder and fails with `EPERM`.
- Outbound HTTPS fails unless every host is allowed: `gh` reports
  `x509: OSStatus -26276`, and `npm ci`, `mvn`, `git fetch` and `docker pull`
  time out.
- `gh` and `docker` do not work in the sandbox at all and must be listed in
  `excludedCommands`.

Making the loop work meant excluding `gh`, `docker`, `make`, `npm` and `node`,
which is nearly the whole toolchain. The sandbox then protects nothing. Its one
benefit that worked without tuning was blocking reads of secret files.

## Decision

Do not enable the Bash sandbox for this workspace. Agent commands are guarded
by:

- the `permissions.deny` list in the committed `.claude/settings.json`
- `.claude/hooks/guard-bash.sh`, which checks every Bash command before it runs
- `.claude/hooks/guard-edits.sh`, which checks every Edit and Write
- the secret-scanning hooks in each Sonar-integrated repo

A rule an agent must not break goes into one of these, with a deny message that
names the allowed route.

## Consequences

- The development loop runs unchanged: `npm --prefix`, Maven, Docker and `gh`
  all work from the workspace root.
- Protection depends on the deny list and hooks being kept up to date. A new
  risky command needs a new hook check or deny entry, with a test.
- Reads of secret files are blocked by hooks rather than by the operating
  system, so a command the hooks do not recognise is not stopped.
- Do not try the sandbox again without a new reason, such as a sandbox release
  that supports `npm ci`, `gh` and `docker`. Test it on a clean build, test and
  E2E run first, separately from tuning its settings.

## Alternatives considered

- **The sandbox with a long allow list.** Rejected: `npm ci` still did nothing,
  and `gh` and `docker` still had to be excluded.
- **The sandbox for unattended runs only.** Not taken up: unattended build loops
  run the same toolchain, so they hit the same failures.
