# Settings proposals (for Sam to apply by hand)

Agents may not edit `.claude/settings*.json` or `.claude/hooks/**` anywhere in
this workspace. This file is where those proposals go instead, one section per
proposal, each with the exact text or JSON to apply. Sam applies whichever of
these he agrees with; nothing here has been applied.

This replaces an earlier two-lens draft of this file. It also drops two ideas
that no longer hold: `tim handoff raise` and the `--yes` flag (the confirmed
`tim` write surface is `tim jira create|attach|link|epics`, dry run by
default, a real write needs `--confirm <planId>` — see `plan.md` D5 and
`assess-tim-and-tools.md` "Design"), and the prototype's own
`scripts/designer/hooks/settings-proposal.json` (an idea for applying hooks to
the *prototype's* `.claude/settings.json`, moot once that file is proposed for
deletion — see (f) below).

Current workspace `.claude/settings.json` line numbers below are as read on
2026-09-28 at workspace HEAD `27ec04a2`
(`feat/NO_JIRA-designer-prototyping`).

## (a) Ask rules for outward-facing Jira and push commands

The workspace allowlist runs these with no prompt today:

- `Bash(~/git/defra/trade-imports-workspace/tools/**)` (lines 63-64), which
  covers every script in `tools/jira/`, including `create-ticket.sh`,
  `attach-file.sh`, `link-tickets.sh` and `transition-ticket.sh`
- `Bash(tim:*)` (line 88), which will cover `tim jira create|attach|link`
  once W1 lands
- `Bash(git -C ~/git/defra/trade-imports-workspace/*:*)` (line 83), which
  covers `git -C <any repo> push`

Once designers (and every other agent) work from the workspace root, a
session can raise a real Jira ticket or push a real repo with no prompt at
all. Plants-frontend has no sonar pre-push hook either, so a push there has no
other gate.

Proposed `permissions.ask` block (a new key; today's settings.json has only
`deny` and `allow`):

```json
"ask": [
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/create-ticket.sh*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/attach-file.sh*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/link-tickets.sh*)",
  "Bash(~/git/defra/trade-imports-workspace/tools/jira/transition-ticket.sh*)",
  "Bash(tim jira * --confirm*)",
  "Bash(git -C * push*)"
]
```

Notes on the pattern:

- `Bash(tim jira * --confirm*)` matches `tim jira create/attach/link ...
  --confirm <planId>` however the flags are ordered, but **not**
  `tim jira create ... --dry-run`, `tim jira epics` or `tim jira ticket`/
  `comments` (all read-only or side-effect-free). The dry run is the safe,
  no-prompt path; only the write that actually names a `planId` asks. This is
  tighter than an earlier draft's `Bash(tim jira create:*)` shape, which would
  have asked on the dry run too.
- `Bash(git -C * push*)` is deliberately not scoped to the workspace path,
  because the point is every repo under `repos/`, not just this one.

**Build-loop caveat.** `requirements-pipeline`'s BUILD phase (`lifecycle:
'full'`) raises its own tickets per row and pushes/merges on green, unattended
— see the "Unattended merge on green (plants loop only)" memory. A global
`ask` rule at the shared workspace `.claude/settings.json` level would stall
every one of those runs on a prompt nobody is there to answer, which is the
"Never end a turn idle in a loop" failure mode. Before applying (a), decide
one of:

1. Scope these `ask` rules to a **personal** `.claude/settings.local.json`
   each designer adds for themself (uncommitted, per the pattern in (c)),
   leaving the shared, committed `.claude/settings.json` as it is today. The
   build loop, which runs from the shared settings, is unaffected.
2. Keep them in the shared `settings.json`, and give the build loop's own
   invocation a pre-approved mode that bypasses `ask` (the harness's
   equivalent of `--dangerously-skip-permissions`, scoped to that launch
   only) — consistent with "Make the call, flag it after": the loop is
   already trusted to push and merge unattended, so a prompt would not add
   real safety there, only friction.

Option 1 is the safer default: it protects an interactive designer session
without touching the loop's own path at all. This assessment's own view is
1, but the choice is Sam's.

## (b) A workspace `PreToolUse(Edit|Write)` hook for the prototype's guard-edit

Today the guard that stops an agent editing a real-service file on a
`design/*` branch is `scripts/designer/hooks/guard-edit.js`, but nothing in
the workspace's own `.claude/settings.json` calls it — it only runs once the
prototype's *own* `.claude/settings.json` wires it in as a `PreToolUse` hook,
and that file's hooks never fire from the workspace root (see (f); the same
reasoning as `scripts/sonar/sonar-push-gate.sh` lines 5-24). So a designer
working from `~/git/defra/trade-imports-workspace` has no automatic edit
guard at all today.

Proposed addition to the workspace `.claude/settings.json`'s existing
`hooks.PreToolUse` entry for `Edit|Write|MultiEdit|NotebookEdit` (today lines
120-129), adding a second hook alongside the existing `guard-edits.sh` one
rather than replacing it:

```json
{
  "matcher": "Edit|Write|MultiEdit|NotebookEdit",
  "hooks": [
    {
      "type": "command",
      "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-edits.sh\"",
      "timeout": 10
    },
    {
      "type": "command",
      "command": "npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:guard-edit",
      "timeout": 10
    }
  ]
}
```

This depends on two things this file does not own, so it is a proposal, not a
finished wiring:

1. **A `designer:guard-edit` npm script**, owned by P2
   (`scripts/designer/hooks/**`), that does not exist in `package.json` yet.
   It must read the same `PreToolUse` JSON on stdin that `guard-edit.js`
   already parses, and it must fail open (exit 0, no output) the moment the
   edited `file_path` is **not** under
   `repos/trade-imports-plants-prototype/` — a workspace-root session edits
   far more than prototype files, and this hook must never opine on any of
   them. Only once the path is under the prototype does it hand off to
   `guard-edit.js`'s `decide()`, with `root` set to that checkout and `cwd`
   resolved the same way.
2. **Guard-edit's branch check fixed to "not `design/*`"** (plan.md D7). Read
   today, `decide()` allows every branch through `isOpenBranch(branch)`
   (`scripts/designer/hooks/guard-edit.js:68-70`), but that function checks
   against `OPEN_BRANCH_PREFIXES`, which is referenced but never defined
   anywhere in the file — a real bug, not something this proposal invents.
   D7's fix (owned by P4, not this file) replaces it with the inverse test:
   allow on every branch except one starting `design/`. This hook proposal
   only makes sense once that fix has landed; wiring it in first would mean
   every `Edit`/`Write` under the prototype silently no-ops the guard (fail
   open on the exception the undefined name throws).

Until both land, this section is the intended shape, not something to apply
today.

## (c) Sonar MCP servers: a personal file, not a shared settings change

`enabledMcpjsonServers` (today lines 93-102) starts eight `sonar-*` MCP
servers. On a designer's laptop, with no `SONAR_TOKEN` and no Docker running,
every one of them reports "failed to connect" at the start of every session.
None of the eight covers `trade-imports-plants-prototype` or
`trade-imports-plants-frontend` anyway (the sonar-integrated repos are
listed in the workspace `CLAUDE.md`'s SonarCloud section, and plants is not
among them), so there is nothing for a designer session to use them for.

This is not a shared-settings change, because other people at the workspace
root do use these servers. Proposal: each designer adds their own,
uncommitted `.claude/settings.local.json` (Claude Code merges it over the
shared `settings.json` and it is already gitignored, so no `overrides.json`
entry is needed):

```json
{
  "disabledMcpjsonServers": [
    "sonar-address-book",
    "sonar-admin",
    "sonar-backend",
    "sonar-frontend",
    "sonar-gateway",
    "sonar-ins-backend",
    "sonar-ins-frontend",
    "sonar-reference-data"
  ]
}
```

Designer-facing agents should also just ignore the "failed to connect"
notice when it appears (for a designer who has not added this file yet) and
never raise it with the designer — it is inert noise for this work, not a
fault to report.

## (d) `guard-bash`'s `npm --prefix ci` denial is now moot for designers

`.claude/hooks/guard-bash.sh` (today lines 167-170) denies any
`npm --prefix …trade-imports-workspace… {install|ci|add|update|...}`:

```bash
# npm --prefix over the workspace symlink — can corrupt the lockfile.
if printf '%s' "$CMD" | grep -Eq 'npm[[:space:]].*--prefix[[:space:]]+[^[:space:]]*trade-imports-workspace[^[:space:]]*[[:space:]]+(install|i|ci|add|update|dedupe|prune|uninstall)([[:space:]]|$)'; then
  deny "npm --prefix across the workspace symlink can corrupt the lockfile. Canonicalize first (cd <path> && pwd -P) and run npm install on the real path."
fi
```

The reason it gives no longer applies: the workspace `CLAUDE.md` rule 1 says
"No env var to set, and no symlink to maintain: the canonical path is the
checkout." There is no symlink left to corrupt a lockfile through. As written
the rule denies *every* `npm --prefix …trade-imports-workspace…/repos/…
{install|ci}` regardless of whether the path is actually a symlink, which is
now the ordinary, correct way for a designer's agent to install the
prototype's dependencies (`AGENTS.md` rule 7: `npx --yes npm@11.6.2 ci`, or
the equivalent `npm --prefix … ci` form).

This file does not need `guard-bash.sh` changed to get designer install
working — `tim workspace install --repo trade-imports-plants-prototype`
(W2) runs the pinned npm's `ci` in the checkout directly, without going
through this Bash rule at all, and `Bash(tim:*)` is already allowed. So (d) is
optional, not blocking.

If Sam wants the underlying rule narrowed anyway (so it stops being a
standing false-positive for anyone who does type the `npm --prefix` form by
hand), the minimal fix is to only deny when the path after `--prefix` really
is a symlink — i.e. its `realpath` differs from the literal argument — which
is the one case the rule was written for:

```bash
# npm --prefix through a symlinked path — can corrupt the lockfile. Only
# denied when the path actually IS a symlink (realpath differs from what was
# typed); the canonical, non-symlinked checkout is not denied.
PREFIX_ARG=$(printf '%s' "$CMD" | grep -Eo -- '--prefix[[:space:]]+[^[:space:]]+' | awk '{print $2}')
if [ -n "$PREFIX_ARG" ] && printf '%s' "$CMD" | grep -Eq 'npm[[:space:]].*--prefix[[:space:]]+[^[:space:]]+[[:space:]]+(install|i|ci|add|update|dedupe|prune|uninstall)([[:space:]]|$)'; then
  PREFIX_REAL=$(realpath "$PREFIX_ARG" 2>/dev/null)
  if [ -n "$PREFIX_REAL" ] && [ "$PREFIX_REAL" != "$PREFIX_ARG" ]; then
    deny "npm --prefix through a symlink ($PREFIX_ARG -> $PREFIX_REAL) can corrupt the lockfile. Canonicalize first (cd <path> && pwd -P) and run npm install on the real path."
  fi
fi
```

## (e) `sonar-push-gate.sh` should read `-C <repo>` off the command, not only trust the shell's cwd

`scripts/sonar/sonar-push-gate.sh` reads the hook JSON's `.cwd` (the real
shell working directory for the Bash call) to decide which repo a `git push`
is running in, then `cd`s there before dispatching to
`tools/sonar/sonar-push-check.sh`. That is correct for `cd repos/<name> &&
git push`, but the house form this workspace asks every agent to use instead
is `git -C ~/git/defra/trade-imports-workspace/repos/<name> push` — no `cd`
at all (`CLAUDE.md` rule "No compound Bash commands" and the bash-hygiene
memory). Run that way, the shell's cwd stays the workspace root throughout,
so the gate checks the **workspace** repo's own `sonar-project.properties`
(which does not exist, so it silently exits 0) instead of the repo actually
being pushed. A real quality-gate failure in, say, `trade-imports-address-book`
pushed with `git -C … push` from the root would never run the local check at
all.

Proposed change: parse a `-C <path>` argument out of the command itself and
prefer it over `.cwd` when present, since `-C` is git's own "run as if
started in `<path>`" flag and takes precedence over the shell's actual cwd.

```bash
INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)

[[ "$COMMAND" == *"git push"* ]] || exit 0

# `git -C <path> ... push` names its own working directory, which wins over
# the shell's actual cwd — that is what -C means to git itself. Take the LAST
# -C on the line, matching git's own "later -C wins" precedence.
DASH_C_PATH=$(printf '%s' "$COMMAND" | grep -Eo -- '-C[[:space:]]+[^[:space:]]+' | tail -1 | awk '{print $2}')
if [ -n "$DASH_C_PATH" ]; then
  CWD="$DASH_C_PATH"
fi

[ -n "$CWD" ] && [ -d "$CWD" ] || exit 0
```

(The rest of the script, from `CHECK_SCRIPT=...` onward, is unchanged.) This
also needs `~`-expansion if `-C` is given as `~/git/defra/...`, since that
expansion normally happens in the shell before the command runs, not inside
this hook's own string handling — `eval echo "$DASH_C_PATH"` or a literal
`~/` prefix check would do it.

## (f) Delete the prototype's own inert `.claude/settings.json`

Read today, `repos/trade-imports-plants-prototype/.claude/settings.json`
wires three hooks — `.claude/hooks/sonar-secrets/build-scripts/{pretool,prompt}-secrets.sh`
and `.claude/sonar-analyze.sh` — none of which exist in the repo (`overrides.json`'s
own `deleted` list already names `.claude/hooks/sonar-secrets/**` and
`.claude/sonar-analyze.sh`). The prototype's `CLAUDE.md` even has a section
explaining that the resulting "missing hook script" message is expected and
harmless. Worse, this file is a dead end regardless of the sonar dangling
reference: Claude Code only reads hook config from the single project root a
session was launched against, so once a designer opens Claude Code at the
workspace root (this whole change's premise), this file **never runs at
all** — `scripts/sonar/sonar-push-gate.sh`'s own header comment explains the
same mechanism for why the *workspace's* hook has to exist at the workspace
level rather than relying on each repo's own settings.

Proposed edit to the prototype's `overrides.json` (an `overrides.json` edit,
not a settings edit, so it is not covered by the "agents may not edit
settings" rule — though it is still outside this file's own owned paths, so
it is a proposal for whoever picks up P1, not applied here):

```json
"deleted": [
  ".claude/settings.json",
  ".claude/hooks/sonar-secrets/**",
  ".claude/sonar-analyze.sh",
  ...
]
```

Once `.claude/settings.json` is in `deleted`, the weekly sync removes it (it
is currently untracked in `ours`, so nothing else needs to change there), and
the prototype's `CLAUDE.md` "A missing hook script" section should be dropped
in the same change, since there is no longer a settings file to produce that
message. Both edits belong to P1 (`CLAUDE.md`, `overrides.json` are P1-owned
paths per `plan.md` section 3).

The workspace root's own hooks already run the equivalent sonar secrets
checks (`.claude/settings.json` `PreToolUse(Read)` and `UserPromptSubmit`
entries, lines 130-139 and 154-170) for anyone reading or prompting about
prototype files from the root, so nothing is lost by deleting the prototype's
copy.
