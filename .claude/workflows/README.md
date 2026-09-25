# Workspace workflows

Deterministic multi-agent orchestration scripts. Point the `Workflow` tool at the file
by `scriptPath` with an `args` object — see the canary launches below. Launching by `name`
runs a stale snapshot rather than what is on disk.

**The increment build loop lives with the skill that drives it**, at
[`.claude/skills/requirements-pipeline/workflow/`](../skills/requirements-pipeline/workflow/README.md),
beside its Codex briefs and the backlog shape it reads.

## The args contract

Every workflow script — the shared ones under `.claude/workflows/*.js` and a skill's own
under `.claude/skills/<skill>/workflow/*.js` — accepts `args` as either an object or a
JSON string. It stops, naming any missing required key, and logs its resolved
configuration first — there are no fallback defaults. The three functions that do this —
`parseArgs`, `requireKeys`, `logResolvedConfig` — are pasted **byte-identical** into every
script between `// >>> args-contract` / `// <<< args-contract` markers.

`tim/src/backlog/workflow-contract.test.js` enforces the contract on every script in
both places:

- the args-contract block appears exactly once, byte-identical across scripts
- no `FALLBACK` constant
- no `??` default on the variable a script assigns from `parseArgs(...)`
- a run with a missing key throws before any agent runs

tim CI also runs whenever `.claude/workflows/**` or `.claude/skills/*/workflow/**`
changes, so a PR that reintroduces a
default or drifts the block never merges unguarded.

The call sequence is `parseArgs` → `requireKeys` → `logResolvedConfig`, before any other
`log()` and before the first `agent()`. A required key is missing when it is absent or
`undefined` — an explicit `null` counts as given, because some keys carry meaningful nulls.

A key a script does not use in some mode is still required in that mode, passed as `null`,
so the args always say plainly what governs the run. The increment build loop is the
example: under `lifecycle: 'branch'` it makes no Jira call and merges nothing, so
`jiraProject`, `epic`, `jiraInProgressStatus`, `jiraDoneStatus`, `jiraBoard`,
`requireApproval` and `approvalWaitMinutes` must each be passed as `null`. Leaving one out
still stops the run as a missing key, and giving one a value stops it too, naming the key.
`lifecycle` itself is required in every run: existing callers pass `'full'`.

## `args-canary.js`

A tracked, zero-agent workflow that proves the contract on *this* runtime, without
spending any agents. It takes required keys `list` and `n` and returns
`{ argsType: typeof args, resolved: config }` — so a live launch records exactly how this
runtime delivered `args`.

Launch by `scriptPath`, never `name`:

- **L1.** `Workflow({ scriptPath: ".claude/workflows/args-canary.js", args: { list: ["a"], n: 1 } })`
  Expected: returns `{ argsType: "object", resolved: { list: ["a"], n: 1 } }`; the first
  journal log is `args-canary: resolved configuration {"list":["a"],"n":1}`.
- **L2.** The same with `args: "{\"list\":[\"a\"],\"n\":1}"`.
  Expected: the same `resolved`. `argsType` is `"string"` or `"object"`, whichever this
  runtime delivers — record it with the Claude Code version.
- **L3.** The same with `args: { list: ["a"] }`.
  Expected: the run fails with `args-canary: args is missing required key n. Pass every
  one in args: this workflow has no defaults`, and 0 agents.
- **L4.** No args.
  Expected: the run fails naming `keys list, n`, and 0 agents.
