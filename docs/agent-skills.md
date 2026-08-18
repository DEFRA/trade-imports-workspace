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
  command. Claude Code refuses to prefix-allowlist it. Use Glob +
  Read for "find then read" workflows.
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

**Don't reach for Bash combos when an LLM-native tool does the job:**

- File inspection → Read (with `offset` + `limit`), not `awk`, `sed -n`, `grep -n`.
- File location by name → Glob, not `find -exec` or `find ... | xargs`.
- JSON queries → `jq` against a workspace file, not `python3 -c "import json"`.
- Filtering script output → add a `--filter` / `--file` / `--repo` flag to the helper, not `| awk`. If the helper lacks the flag, propose extending it.

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
| `find <dir> -name X -exec cat {} \;` | Glob + Read |
| `tools/x.sh \| awk` | helper `--filter` flag |
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
