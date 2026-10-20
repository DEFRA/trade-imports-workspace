# Agent skills format note

This workspace uses the [agentskills.io](https://agentskills.io/specification)
standard for Claude Code skills. Each skill lives at the workspace root under
`.claude/skills/<name>/`, with a `SKILL.md` entry point and optional
`references/` and `assets/` subdirectories. Long-running fan-out workers
live as `references/<NAME>.md` prose inside the owning skill and are
spawned as `general-purpose` Task subagents.

This document is the canonical reference for the workspace-level conventions
that every `SKILL.md` cites. It exists once here so individual skills don't
duplicate the prose.

## Workspace root resolution

Skills must NOT assume the agent's current working directory. Claude Code
can invoke a skill from anywhere — workspace root, `docs/`, or wherever
the process happens to land. Sub-repos under `repos/<service>/` are
themselves git repositories, so `git rev-parse --show-toplevel` returns
the sub-repo root when called from inside one — silently breaking any
path that should be workspace-relative.

Two layers:

- **In LLM-typed commands** (SKILL.md, references/*.md, spawn prompts):
  use the literal home-relative path `~/git/defra/trade-imports-workspace/...`.
  Bash expands `~` to `$HOME` automatically. Contributors must clone
  to this canonical location for the LLM-typed allowlist to match.
- **Inside `tools/<domain>/<script>.sh`**: scripts hardcode the path
  literally as `$HOME/git/defra/trade-imports-workspace/...`. No env var.
  `$HOME` expands inside the shell at script-run time; it never reaches
  the permission system or an LLM.

The split exists because Claude Code's permission system flags
parameter expansion (`$VAR`) in LLM-typed Bash commands as "Contains
simple_expansion" — even when the variable is explicitly allowlisted
([GH#51001](https://github.com/anthropics/claude-code/issues/51001)).
Literal `~` paths in agent-typed commands don't trip the check, and
`$HOME` inside script bodies never crosses the boundary.

Earlier iterations used a walk-up helper that derived the root from
`${BASH_SOURCE[0]}` or `$PWD`. That had two failure modes: off-by-one
when scripts moved between directory depths, and false matches when a
parent of the workspace happened to contain a stray `.claude/` directory.

## Path conventions

Cross-workspace references in `SKILL.md` use absolute paths anchored on
`~/git/defra/trade-imports-workspace`:

```
Scripts:        ~/git/defra/trade-imports-workspace/tools/<domain>/<script>
Best-practices: ~/git/defra/trade-imports-workspace/docs/best-practices/<topic>/<file>
Workareas:      ~/git/defra/trade-imports-workspace/workareas/...
Other skills:   ~/git/defra/trade-imports-workspace/.claude/skills/<name>/...
```

Skill-internal references stay relative from `SKILL.md`:

```
references/<NAME>.md
assets/<NAME>.md
```

## Bash call hygiene (avoiding permission prompts)

**The core principle: one command per Bash call.** The allowlist
matches against the whole command string — anything that makes the
call a *compound* shape (a chain, a pipe, an embedded sub-command,
or a variable expansion) doesn't match the prefix rule even when
each piece would individually. Symptoms:

- `&&` / `;` / `|` — turns N commands into one string the matcher
  doesn't recognise. Run them as separate Bash calls instead.
- `cd <dir> && cmd ...` — special case of `&&`. Use `cmd -C <dir>` /
  full paths instead.
- `find ... -exec cmd {} \;` — `-exec` runs an arbitrary embedded
  command. Claude Code refuses to prefix-allowlist it. Run a plain
  `find ~/git/defra/trade-imports-workspace/... -name X`, then Read
  each result.
- `VAR=x cmd` — an environment-variable prefix does not match the
  allowlisted command, so `PORT=3100 npm run test:prototype` prompts.
  Use a named npm script that sets the variable, or leave the run to
  the parent session.
- `$VAR` in the command — Claude Code's "Contains simple_expansion"
  check ([GH#51001](https://github.com/anthropics/claude-code/issues/51001))
  trips before the allowlist matcher sees it. Use literal
  `~/git/defra/trade-imports-workspace/...` paths.
- `/Users/<you>/git/...` resolved-tilde form — the matcher compares
  literal strings, so `~/git/...` and `/Users/<you>/git/...` are
  *different* prefixes. Always type the `~/` form, never resolve it
  to your home path.
- Ad-hoc text utilities (`awk`, `sed`, `find`) on files outside the
  workspace — scoped to workspace paths in the allowlist; system
  paths still prompt.

**Read, search and find with the tools that never prompt:**

- File inspection → the Read tool (with `offset` + `limit`), not `awk`, `sed -n` or `cat`.
- Searching file contents → one unpiped Bash `grep -rn <pattern> ~/git/defra/trade-imports-workspace/<path>`.
- File location by name → one unpiped Bash `find ~/git/defra/trade-imports-workspace/<path> -name X`, not `find -exec` or `find ... | xargs`.
- Do not use the Grep or Glob tools in a spawned agent. They are not on the allowlist, and an agent left to choose reaches for them first. Bash `grep` and workspace-path `find` are allowlisted.
- JSON queries → `jq` against a workspace file, not `python3 -c "import json"`.
- Filtering script output → add a `--filter` / `--file` / `--repo` flag to the helper, not `| awk`. If the helper lacks the flag, propose extending it.

**Test runs: redirect to a file, then read the file.** Never pipe a test run
into `tail`, `head` or `grep`. The pipeline returns the trimmer's exit
code, so a red run reports exit 0. Playwright prints the `N failed`
header above the failure list, so a tail looks like a pass list.
`guard-bash.sh` denies a piped test run. Run once, read the file once,
and never re-run a suite to check part of its result.

| Bad | Good |
|---|---|
| `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test 2>&1 \| tail -40` | `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend test > ~/git/defra/trade-imports-workspace/workareas/<area>/unit.log 2>&1`, then Read the log |
| `mvn -f ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-backend/pom.xml verify \| grep ERROR` | the same `mvn -f ... verify > <workarea>/verify.log 2>&1`, then Read the log and `target/surefire-reports/` |

The same holds for any long output: `git commit -F msg > <workarea>/commit.log 2>&1`, then Read, not `git commit -F msg | tail`.

**Formatting and lint: the repo's named npm script only.** Fix formatting
with `npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run format`
(or the repo's `lint:fix`). Never call a binary under `node_modules/.bin/`
directly and never use `npx` for it. Prettier run by path from outside the
repo resolves its config differently: in the plants frontend it left two
JSON files 500 lines longer than `npm run format` did, its own `--check`
passed, and the pre-commit hook still failed `format:check`. A binary the
allowlist does not cover also leaves the agent waiting on a prompt; one sat
for six hours overnight in a build loop. If no script covers the job, stop
and report the command you need.

**Deleting a directory: `git rm -r -f -q <path>`.** Every recursive `rm`
form is denied. `git rm -r` is the sanctioned alternative because it is
tracked and reversible; `-f` is needed when the paths are staged. It only
works inside a git repo. For an untracked tree, stop and ask.

**A new executable script.** `chmod` is denied, the Write tool creates
files as mode 644, and `guard-bash.sh` refuses to run an executable that is
uncommitted or differs from HEAD. Set the bit through git, one command per
call, then commit before running it:

```
git -C ~/git/defra/trade-imports-workspace add tools/<dir>/<script>.sh
git -C ~/git/defra/trade-imports-workspace update-index --chmod=+x tools/<dir>/<script>.sh
git -C ~/git/defra/trade-imports-workspace checkout -- tools/<dir>/<script>.sh
```

The `checkout` copies the 755 mode from the index back onto disk. Check
the commit's `create mode` line says 100755; a later plain `git add` can
re-stage it as 644. Each change you want to try needs its own commit, so
commit small and fix forward. Never edit a script that running agents
call: the guard blocks every caller until the edit is committed.

**A denied command.** A deny rule or a hook denial is the user's decision,
not an obstacle. Never retry it in another form: a different path, a
wrapper script, another interpreter, an allowlisted script's arguments,
a copy moved under `tools/`. Say what was denied and why you wanted it,
then ask the user to run it (`! <command>`), change the allowlist, or pick
another approach. The same goes for a workaround the user has ruled out:
do not bring back a variant under a new label (spawning `claude -p` to get
round a harness rail is the same hack). The only retries that are fine are
the alternatives a denial names itself, such as `git -C <path> push` or
`git rm -r`.

**Permission prompts cannot be seen from inside a session.** A Bash result
looks the same whether it ran straight through or waited for the user to
approve it. Never write that a command "did not prompt". When it matters,
for example after changing a hook or before an unattended run, run the real
command and ask the user whether it prompted.

**Quick reference:**

| Anti-pattern | Use instead |
|---|---|
| `cd ~/git/.../foo && tools/x.sh` | `~/git/.../tools/x.sh` (no `cd`) |
| `tools/x.sh` (relative) | full `~/git/...` form |
| `tools/x.sh && tools/y.sh` | two separate Bash calls |
| `$TRADE_IMPORTS_WORKSPACE/tools/x.sh` | literal `~/git/...` form |
| `/Users/<you>/git/.../tools/x.sh` (resolved tilde) | literal `~/git/...` form |
| `cd <dir> && git ...` | `git -C <dir> ...` |
| `awk '...' file` (workspace inspection) | Read tool with offset+limit |
| `find <dir> -name X -exec cat {} \;` | `find ~/git/... -name X`, then Read |
| Grep or Glob tool in a spawned agent | one unpiped Bash `grep -rn` or `find` |
| `tools/x.sh \| awk` | helper `--filter` flag |
| `npm test \| tail` | `npm test > <workarea>/test.log 2>&1`, then Read |
| `repos/<repo>/node_modules/.bin/prettier --write <file>` | `npm --prefix ~/git/.../repos/<repo> run format` |
| `PORT=3100 npm run test:prototype` | a named npm script, or leave the run to the parent |
| `rm -rf <dir>` | `git rm -r -f -q <dir>` |
| `chmod +x tools/x.sh` | `git update-index --chmod=+x`, `git checkout --`, commit |
| `python3 -c "import json..."` | `jq` |

The skill prose models this in every example — follow the model.

Worker personas are addressed by an absolute `references/<NAME>.md` path
inside the spawn prompt — see "Worker references" below.

## Skill folder shape

```yaml
---
name: skill-name          # 1-64 chars [a-z0-9-]; MUST match the folder name
description: ...          # 1-1024 chars; WHAT + WHEN + trigger keywords
---
```

- `SKILL.md` body should stay under 500 lines / ~5000 tokens.
- `references/<NAME>.md` — additional docs loaded on demand.
- `assets/<NAME>.md` — templates, schemas, static resources.
- Skills do NOT carry private `scripts/` folders in this workspace: shared
  shell scripts live at `~/git/defra/trade-imports-workspace/tools/`.

Spawn idiom inside `SKILL.md`:

- For a reference loaded by the parent session: `Follow references/<NAME>.md`.
- For a worker spawned as a Task subagent: see "Worker references" below.

## Worker references

Long-running fan-out workers (per-file reviewers, per-package planners,
per-version planners, per-item fixers) live as `references/<NAME>.md`
prose inside the owning skill. They are spawned via the Task tool with
`subagent_type: general-purpose` and a prompt that begins:

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/<owner>/references/<NAME>.md.

<per-spawn context: file/path/commit/output-path>
```

Rationale:
- The agentskills.io specification defines `references/` for "additional
  documentation that agents can read when needed" and is silent on
  subagents — this is the spec-blessed home for worker prose.
- `general-purpose` carries `Tools: *` (Write, Edit, Bash, WebFetch all
  available) and is not subject to the no-write guardrail injected into
  custom-named restricted subagents — workers can therefore reliably
  write the per-file artifacts that downstream `tools/` scripts consume.
- The path is absolute so the spawned subagent doesn't need to inherit
  the parent's working directory.

## Spawning agents

These rules apply to every spawn: a skill's worker, a Workflow script's
`agent()` call, a Codex brief, an ad-hoc Agent call. Auto memory does not
reach spawned agents, so anything an agent must obey goes in its prompt or
in a file the prompt tells it to read.

**GUARD RAILS block first.** Every spawn prompt opens with a block the agent
reads before its task. An agent that prompts in an unattended run halts the
whole run until someone looks. The block says:

1. One command per Bash call. No `&&`, `;` or `|`, no `cd`, no
   `VAR=x` prefix. Each compound command stops the run behind a prompt.
2. Bash paths start `~/git/defra/trade-imports-workspace/`, never `/Users/`.
3. No Grep or Glob tools: Bash `grep -rn` and `find`. Read files with the
   Read tool; no `awk`, `sed` or `cat` to read or reshape text.
4. Redirect every test or long run to a file and read the file. Never pipe it.
5. Format and lint only through the repo's named npm script. No
   `node_modules/.bin/` binaries, no `npx`.
6. No `node`, `python`, `curl`, `wget`, `chmod` or recursive `rm`: they are
   denied. A denial means stop and report, never retry in another form.
7. The verification ceiling: what the agent may run itself, and what it
   leaves to the parent. Build-loop workers edit files and run at most the
   one verify script; the parent runs E2E and anything needing an
   environment prefix.

If a running agent starts prompting, send it a rail reminder with
SendMessage straight away rather than waiting or respawning.

**Code-writing prompts read the house rules.** Every prompt for an agent
that writes or reviews code, tests or templates tells it to read
`~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` in
full before it starts. `.claude/rules/` files load only when an agent
reads a matching path, and Codex loads none of them, so the prompt names
the file.

How `.claude/rules/` loads, so a prompt can make up for it:

- A rule loads when the agent **reads** a file that matches a glob in its
  `paths:` list. Writing a file does not load it. Before creating the
  first file of a kind (a `.java` class, a `.njk` template, a spec), read a
  sibling of that kind.
- Subagents and Workflow agents get rules the same way. Codex gets none:
  give it the resolved paths of the rule files and the guides they point
  to.
- A language rule file is a list of pointers. The guides it names are not
  loaded with it, so tell the agent to read them. The house rules are the
  exception: `code-quality.md` holds them inline.
- Several rule files can match one file (a `.spec.ts` matches `node.md`,
  `playwright.md` and `code-quality.md`). They add up; they do not compete.

**Two path constants in a Workflow script.** An absolute path anywhere in a
prompt leaks into the agent's Bash calls, even when the prompt also says
"use `~/`". Read and Write need the absolute form; Bash needs the tilde
form. Define both, keep the absolute one out of every Bash example, and
say which is which early in the guard rails:

```js
const WORKAREA_FOR_FILE_TOOLS = '/Users/<you>/git/defra/trade-imports-workspace/workareas/<area>'
const WORKAREA_FOR_BASH = '~/git/defra/trade-imports-workspace/workareas/<area>'
```

**Set `model` on every spawn.** A spawn without one inherits the
session's model.

| Model | For |
|---|---|
| `haiku` | Running a command and reporting the result; listing call sites; pulling counts out of a report; checking a PR's merge state |
| `sonnet` | Writing code from an agreed plan; moving a batch of specs to an existing idiom; reading traces to name the stalled step |
| `opus` | Planning, judging and reviewing; designing a mechanism with no precedent; diagnosing a failure the evidence does not explain; settling conflicting findings |

In a Workflow, check the model each stage resolves to before launch.
Never pass an empty `models` object.

**Mechanical steps belong in tim.** Fetching, branch cuts, baselines,
test ladders, secrets scans, manifests and state commits become tested
`tim` commands. Fold each run of mechanical steps into one tim command,
issued by a Haiku agent whose prompt is "run this": run in order, stop at
the first non-zero exit, report exit codes and paths. Never fold
mechanical steps into a judgement agent to save a spawn; judgement agents
read the recorded results.

**The parent orchestrates.** In a loop or a multi-step job the parent
claims, briefs, verifies, commits or rolls back, and records. It does not
implement, however small the edit, and that includes operational jobs
such as generating a baseline. When an agent fails, check its state
cheaply, reset, and spawn a new one with a note on what went wrong. Never
pull work inline to avoid permission prompts: fix the guard rails instead.

**Check an agent's failure claim in your own shell.** When an agent says a
failure is environmental, pre-existing or unrelated, run the same command
in the parent and compare the error. If it does not reproduce, the claim is
wrong: spawn the fix again with the real error. If it does reproduce, the
failure is still yours to fix (`CLAUDE.md` rule 6).

**Checkouts move under you.** Other sessions pull and switch branches in
`repos/` at any time. Record `git rev-parse HEAD` before a read-heavy step
and again before writing code that depends on it; if it moved, read again
(`git reflog` shows what happened). Before following a handover's tooling
steps, check the branch the team last ran that tooling on:
`git log origin/main..origin/<live branch> -- <tooling paths>`. If it carries
later commits, follow the handover's intent with the newer tooling.

## Cross-host discovery

- **Skills** — `.claude/skills/` works for both Claude Code (native) and
  Cursor (per <https://cursor.com/docs/context/skills>).
- **Worker fan-out** — Claude Code spawns `general-purpose` Task
  subagents in parallel. Cursor has no parallel subagent primitive; it
  will execute the worker prose serially in the active session, which
  is acceptable (just slower).
- **Subdirectory launches** — Claude Code's `.claude/skills/` does NOT walk
  up parent directories (#26489). The workspace ships `docs/.claude → ../.claude`
  so a session launched from `docs/` still discovers the skills.
- **Sub-repos** — `repos/<service>/` are nested git repos; Claude Code
  sandboxes them off the parent workspace's `.claude/` (#31905). Do NOT
  symlink into them. Working inside a sub-repo means no workspace skills.

## Runtime workareas

`~/git/defra/trade-imports-workspace/workareas/` is runtime cache and is gitignored. Skills
populate it (reviews, code-style reviews, ticket plans, upgrades) as they
run; nothing under `workareas/` is part of the checked-in audit trail.
