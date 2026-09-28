# Workflows

A workflow is a script that runs several agents, one step after another, for
one big job. It is an accelerator, never a dependency: every workflow's
reference also lists the same steps to run by hand.

| Workflow              | Started by                                   | What it does                                                                                                          |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `wording-sweep.js`    | `references/change-the-words.md`              | Changes words across many pages of one release, English and Welsh together                                              |
| `port-kit-page.js`    | `references/port-a-kit-page.md`               | Re-creates one old Prototype Kit page in a release and grades how closely it matches                                    |
| `prepare-handoff.js`  | `references/build-it-for-real.md`             | Builds the hand-off's change into the real `trade-imports-plants-frontend` on its own branch (C1), or writes a DISTIL request for a bigger change (C2) |
| `design-session.js`   | `SKILL.md` rule 6 / `references/ROUTING.md`    | Works through a list of requests in one release: split, build, check, park, one gallery, one commit each                |

## Launching a workflow

Always launch by `scriptPath`, never by name. A named launch can run an older
copy of the script.

```
Workflow({
  scriptPath: '.claude/skills/prototype/workflow/design-session.js',
  args: {
    set: 'plants-working',
    requests: [
      "Change the hint on origin to 'The country the plants were grown in'",
      'Add a draft example stopped at commodities'
    ]
  }
})
```

Pass `args` as a real object, not as a string of JSON. A string still works
(the script parses it), but an object is clearer.

Every command a workflow's agent prompt runs is written in the tilde
`--prefix`/`-C` form, because these scripts run from a session opened at the
workspace root, never inside the prototype's own checkout: a bare `npm run`
or a bare `git` command there would act on the **workspace** repository, not
the prototype (or, for `prepare-handoff.js`, not
`trade-imports-plants-frontend`). Every agent prompt also carries a GUARD
RAILS block saying so, and naming the one-command-per-call and
never-push rules for that script.

## The args contract

Every workflow here, and every one under `.claude/workflows/` in the
workspace, opens the same way, so they fail the same way:

1. `export const meta = { ... }` as a plain literal: name, description,
   when to use it and its phases.
2. A `MODELS` constant (see below).
3. The args-contract block, between `// >>> args-contract` and
   `// <<< args-contract`. It is the same text, byte for byte, in every
   script:
   - `parseArgs` accepts an object, or a string of JSON.
   - `requireKeys` stops the script when any key in `REQUIRED_KEYS` is
     missing. There are no defaults: pass every key.
   - `logResolvedConfig` logs exactly what the script will use.
4. Checks on the values (for example, refusing `high-risk-plants`), still
   before any agent runs.

`tim/src/backlog/workflow-contract.test.js` keeps this true across every
workflow script in the workspace, this skill's `workflow/` included: it
fails if any script's block differs from the others, or if a missing key
reaches an agent. To change the block, change it in every script at once
(here and under `.claude/workflows/`).
`tim/src/skill-workflows/prototype/*.test.js` adds this skill's own tests on
top: the routing and prompt content of each script, and a prompt-hygiene rule
that keeps every command in this skill's own tilde-prefixed form (see
"Launching a workflow" above) and every editor mentioned to the one this
skill assumes.

The Workflow tool runs each script as the body of an async function, so a
top-level `return` is allowed and hands back the script's result.
`wording-sweep.js` and `prepare-handoff.js` end with `return { ... }` (and
stop early with `return stopped(...)`); keep those returns, because their
callers read the structured result. `design-session.js` and
`port-kit-page.js` end with `await main()` and report through `log()` lines
by choice, not because a `return` would break anything.

ESLint's module parser rejects a top-level `return`, so the workspace's
`eslint.config.js` leaves `.claude/skills/*/workflow/*.js` out of ESLint (the
same treatment `.claude/workflows/*.js` gets). The `*.test.js` files in
`tim/src/skill-workflows/prototype/` are linted as ordinary `tim` source, and
they run each script through an `AsyncFunction`, which is how the Workflow
tool runs it.

## Choosing models

Each script names its models once, at the top:

```
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }
```

- `runner` runs one command and reports what it printed. A small, fast,
  cheap model is enough, so it is `haiku`.
- `builder` edits files by following a reference. `sonnet` follows the
  recipes well.
- `judge` reads, plans, routes and grades. Use the strongest model your
  account can run. It is `opus` so the scripts do not depend on access to a
  newer tier.

Change a name here to point every step of that kind at another model. Use a
model name the Workflow tool accepts; `null` means the session's own model.

## Hosts without the Workflow tool

Each reference that starts a workflow also describes the same steps run one
after another. `design-session` is simple to follow by hand — see
`references/ROUTING.md`, "Workflows", and the step-by-step fallback in each
reference's own file.
