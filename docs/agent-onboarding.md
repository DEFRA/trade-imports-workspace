# Agent skills onboarding

Onboarding for the AI-assisted skills in this workspace. The skills live
under `.claude/skills/` at the workspace root; the shared shell tools
they call live at `tools/`; the format itself is documented in
[`agent-skills.md`](agent-skills.md).

## Getting Started

### Prerequisites

- `curl`, `jq`, `gh` (GitHub CLI)

Install any that aren't already on your `PATH`:

```bash
for cmd in curl jq gh; do command -v "$cmd" >/dev/null || brew install "$cmd"; done
```

### 1. Canonical clone location

Clone the workspace to `~/git/defra/trade-imports-workspace`:

```bash
git clone git@github.com:DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace
```

Every LLM-typed Bash command, every helper script, and the
`.claude/settings.json` allowlist patterns hardcode that path. There is no env
var to set and no symlink to maintain — the canonical path is the checkout, and
a checkout under any other name will not work.

`repos/` is gitignored, so a fresh clone starts empty. Populate it with
`make setup` (or `tim workspace setup`), which clones each repo named in
`repos.json`.

### 2. Get Your Credentials

#### Jira & Confluence (same credentials)

Both use Atlassian Cloud API tokens:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Give it a name (e.g., "Claude Code")
4. Copy the token

Add credentials to `~/.zshrc` or `~/.bashrc`:

```bash
# Atlassian credentials and config 
export JIRA_USER="your.email@equalexperts.com"
export JIRA_TOKEN="your-jira-api-token"
export JIRA_BASE_URL="https://your-org.atlassian.net"
export JIRA_PROJECT_KEY="YOUR-PROJECT"
```

`JIRA_BASE_URL` — your Atlassian instance root URL (used for both Jira and Confluence). No trailing slash.

`JIRA_PROJECT_KEY` — your Jira project key (e.g. `MYPROJ`). Used when creating tickets and subtasks.

#### GitHub

Authenticate via GitHub CLI:

```bash
gh auth login
```

### 3. Check Authentication

Run the auth script (from the workspace root) to verify all services
are configured:

```bash
./tools/auth.sh
```

This checks Jira, Confluence, and GitHub authentication.

### 4. SonarCloud (Claude Code integration)

Eight repos (`animals-frontend`, `animals-admin`, `animals-backend`, `dynamics-gateway`, `address-book`, `reference-data`, `ins-backend`, `ins-frontend`) have a SonarCloud Claude Code integration committed to `.claude/`. It provides secrets-scanning hooks, an MCP server for querying SonarCloud, and a pre-push quality gate. See the SonarCloud section of the workspace [`CLAUDE.md`](../CLAUDE.md).

#### Install the `sonar` CLI

```bash
curl -o- https://raw.githubusercontent.com/SonarSource/sonarqube-cli/refs/heads/master/user-scripts/install.sh | bash
```

Then restart your terminal (or `source ~/.zshrc`) so `sonar` is on your `PATH`.

#### Authenticate

```bash
sonar auth login
```

Sign in with your SonarCloud account when prompted. Authentication is stored in `~/.sonar/` — no env vars needed.

Once done, the hooks activate automatically when you open Claude Code in any of these repos.

#### SonarCloud MCP tools (per repo only)

Each repo's `.mcp.json` registers that repo's SonarCloud MCP server, and Claude Code loads it
only when a session runs **inside that repo**. The workspace root deliberately registers **no**
Sonar MCP servers.

It used to register all eight, but Claude Code starts every server in a project `.mcp.json`
at session start, and each one is an `mcp/sonarqube` docker container (roughly 400–800 MiB).
Every workspace-root session therefore held about 5–6 GiB of Docker memory, enough to starve
the testcontainers the Java integration suites start. Nothing automated needed them: the
pre-push quality gate (`tools/sonar/sonar-push-check.sh`) and the pending-check hooks under
`scripts/sonar/` call SonarCloud through the `sonar` CLI and the scanners, not through MCP.

To query SonarCloud from a workspace-root session, use the `sonar` CLI (for example
`sonar list issues --project DEFRA_<repo>`), or open a session inside the repo to get its
`mcp__sonar-*` tools.

#### Workspace-level hooks

The per-repo sonar integration also ships Claude Code hooks in each repo's
`.claude/`, but — like the MCP servers — they only load when Claude Code runs
**inside** that repo. Two are worth re-wiring at the workspace root. Add them to
`.claude/settings.json` (committed, so the whole team inherits them):

**1. Secrets scanning (works locally today).** Content-based detection that
complements the path-based `Read` deny rules. Merge these into `hooks`:

```json
"PreToolUse": [
  { "matcher": "Read", "hooks": [
    { "type": "command", "command": "if command -v sonar >/dev/null 2>&1; then sonar hook claude-pre-tool-use; fi", "timeout": 60 }
  ] }
],
"UserPromptSubmit": [
  { "matcher": "*", "hooks": [
    { "type": "command", "command": "if command -v sonar >/dev/null 2>&1; then sonar hook claude-prompt-submit; fi", "timeout": 60 }
  ] }
]
```

**2. PR findings after a push.** This org has **Agentic Analysis disabled**, so
`sonar analyze` produces no code findings locally — issues only appear after the
"Check Pull Request" GitHub Action runs the server-side scan (~3 min post-push).
Two cooperating hooks bridge that gap without any long-lived process (an earlier
async-`git push` hook that polled for CI was abandoned — Claude Code reaps async
hooks when the session goes idle, so the multi-minute wait never completed):

- `scripts/sonar/sonar-record-push.sh` — on `git push`, records a pending check
  (`{project, sha}`) for each sonar repo at its pushed HEAD, then exits instantly.
- `scripts/sonar/sonar-check-pending.sh` — on `UserPromptSubmit` and `SessionStart`,
  does one fast, non-blocking query per pending commit: if SonarCloud has analyzed
  it, inject any new BLOCKER/CRITICAL via `additionalContext` (each commit surfaced
  once); if clean, clear it; if not analyzed yet, leave it (dropped after 45 min).

So findings appear the **next time you interact** after CI's scan lands — Claude
Code can't reliably wake a truly idle session minutes later, so this is the
robust shape. Add to `hooks`:

```json
"PostToolUse": [
  { "matcher": "Bash", "hooks": [
    { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-record-push.sh\"", "if": "Bash(git push*)", "timeout": 10 }
  ] }
],
"UserPromptSubmit": [
  { "matcher": "*", "hooks": [
    { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-check-pending.sh\" UserPromptSubmit", "timeout": 15 }
  ] }
],
"SessionStart": [
  { "hooks": [
    { "type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/scripts/sonar/sonar-check-pending.sh\" SessionStart", "timeout": 15 }
  ] }
]
```

(The `UserPromptSubmit` array also carries the secrets hook from step 1 — merge,
don't replace.) There is deliberately **no** local end-of-turn `sonar analyze`
hook (as the repos ship): with Agentic Analysis off it would always 403.

### 5. Keep git fetches light (gh-pages exclusion)

The product repos' `gh-pages` branches hold published artifacts and are
enormous (17 GB object graph on the frontend vs 7 MB for main), and the
workspace repo's own `gh-pages` is ~1 GiB. Any clone still on the
default `+refs/heads/*` fetch refspec drags them in on a bare
`git fetch` / `git pull`.

Pin your workspace clone once:

```bash
bash tools/git/light-remote.sh --exclude-gh-pages ~/git/defra/trade-imports-workspace
git -C ~/git/defra/trade-imports-workspace gc --prune=now   # reclaims ~1 GiB if gh-pages was ever fetched
```

Per-ticket review clones under `workareas/` are pinned automatically by
`tools/review/prepare-review.sh` (and self-healed on refresh by
`tools/review/refresh/pull-repos.sh`).

The dev repos under `repos/` are handled for you: `make setup` /
`tim workspace setup` clone with the exclusion in place
(`--single-branch`, pin the refspec, then a widening fetch), and
`make update` / `tim workspace update` heal any clone still on the
default refspec exactly once — pin, refetch, then `git gc --prune=now`
to reclaim the gh-pages packs already on disk. Expect that first update
to take a few minutes per large clone; every later run skips the heal.
Local branches, stashes and uncommitted files are untouched. The
tooling also copes with `gh-pages` being absent on the remote (the
truncate job deletes and re-creates it).

### 6. Tune the tests to this machine (once)

How hard the test gate and the build loop drive the machine (how many browser
workers each FIT and E2E suite runs) depends on the machine. Too many and the
laptop swaps, the terminal freezes and tests time out; too few and every gate
is slow. Measure this machine once, after `tim` is linked and the repos are
cloned, with the workspace stack free and nothing else heavy running:

```bash
tim build tune
```

It starts the workspace stack, times every FIT and E2E suite at 2, 3 and 4
workers, picks each suite's count, saves them to `config/machine.json` (which
git ignores) and takes the stack down again. It takes about an hour. Keep the
machine awake and the lid open while it runs. Run it again after you change
Docker Desktop's CPUs or memory, or move to another machine. See
[`machine-tuning.md`](../.claude/skills/requirements-pipeline/references/machine-tuning.md)
for how the counts are chosen.

### 7. The guard rails you will meet

The workspace's `.claude/settings.json` carries a deny list and two
`PreToolUse` hooks. Every session and every agent you spawn gets them.

- `.claude/hooks/guard-bash.sh` denies, with a reason that names the
  right command: a literal `/Users/<you>/` path (type `~/`), `&&`
  chains, raw `npx playwright test`, a `cd` before `git push`, a test
  run piped into `tail`, `head` or `grep`, `chmod`, an uncommitted
  executable, `git commit --no-verify`, and `--amend` on a pushed
  commit. Follow the reason; the agent can retry with the named form.
- `.claude/hooks/guard-edits.sh` stops agents editing
  `.claude/settings*.json` and `.claude/hooks/`. Change those files
  yourself, in a reviewed commit.
- The deny list blocks `node`, `python`, `curl`, `wget`, `chmod`,
  recursive `rm` and global installs. Run node through an npm script,
  delete trees with `git rm -r -f -q`, and set the execute bit as in
  [`agent-skills.md`](agent-skills.md) → "Bash call hygiene".

Why `guard-bash.sh` checks what it does:

- `chmod` and uncommitted executables are denied because a denied
  `node` script was once re-run by copying it into an allowlisted path
  and making it executable. Committing first makes that step visible.
  The checks also look inside `$( … )` and backticks, which the deny
  list does not see.
- Secret paths are denied for readers such as `jq`, `grep` and `awk`,
  which the `Read()` deny does not cover at the Bash layer.
- A `cd` before `git push` in one command makes the Sonar pre-push gate
  check the directory the session was in before the `cd`, so it can
  skip the check or block the push over another repo's failure.
- Only an unquoted `&&` is denied, so `awk 'NR>=10 && NR<=20'` still
  runs. `;` and `|` are left alone because loops and ordinary pipes need
  them; the one pipe denied is a test run into a trimmer.
- The redirects (`~/` paths, `&&`, `npx playwright test`, piped test
  runs) deny rather than ask, because an unattended agent cannot answer
  a prompt but can retry with the form the reason names.

An agent must never work round a denial in another form. When one stops
it, it should tell you what it wanted; you decide whether to run the
command yourself with `! <command>`, change the allowlist, or choose
another way.

Agents cannot see permission prompts. If you are prompted while an agent
runs, its prompt is missing a guard rail: see
[`agent-skills.md`](agent-skills.md) → "Spawning agents".

## Designers

Designers working on the high-risk plants prototype
(`trade-imports-plants-prototype`) onboard the same way as everyone else in
this workspace — there is no separate, prototype-only setup:

1. **Clone the workspace to the canonical path** (step 1 above) — same
   command, same path. The prototype does not stand alone with its own
   copy of the workspace tooling; it is cloned under `repos/` like every
   other repo (`make setup` / `tim workspace setup`).
2. **Set `JIRA_USER`, `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_PROJECT_KEY` and
   authenticate `gh`**, exactly as in step 2 and step 3 above. A hand-off
   raises a real Jira story from the prototype, so the same credentials
   apply.
3. **Run `tim prototype setup`** (after
   `npm --prefix ~/git/defra/trade-imports-workspace/tim link` if `tim` is
   not already on your `PATH`). It writes a short note into a gitignored
   `CLAUDE.local.md` at the workspace root ("You are working with a
   designer…", so every request routes through the `prototype` skill
   without you ever having to name it), adds the prototype's fetch-only
   `upstream` remote (`trade-imports-plants-frontend`, push disabled),
   installs the prototype's dependencies with its pinned npm version, and
   reports Jira/GitHub readiness. It never touches Jira and never pushes.
   Re-run it with `--remove` to take the note back out.
4. **Open Claude Code at the workspace root**
   (`~/git/defra/trade-imports-workspace`), not inside
   `repos/trade-imports-plants-prototype`. The agent layer for a designer's
   requests — the `prototype` skill — only loads from the workspace root;
   see the routing row in the workspace [`CLAUDE.md`](../CLAUDE.md) and
   [`docs/repos/trade-imports-plants-prototype.md`](repos/trade-imports-plants-prototype.md).
5. **Optional:** add a personal `.claude/settings.local.json` at the
   workspace root disabling the `sonar-*` MCP servers
   (`"disabledMcpjsonServers": ["sonar-frontend", "sonar-admin", "sonar-backend", "sonar-gateway", "sonar-address-book", "sonar-reference-data", "sonar-ins-backend", "sonar-ins-frontend"]`)
   — a designer working only in the prototype never needs them, and the
   file is gitignored so it stays personal.

Once set up, say what you want in your own words — a demo, a wording
change, a new design release, "hand this to the real team" — from a Claude
Code session at the workspace root. You never need to name a skill, a
reference or a file.


