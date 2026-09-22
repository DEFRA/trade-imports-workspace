# Gap 4: what the Workflow runtime actually offers (args, child workflows, isolation, agentType)

Read-only analysis, 2026-09-18. Sources: the built-in `workflow-authoring` reference (loaded this session),
`.claude/workflows/increment-build-loop.js`, `frontend-alignment.js` on `feat/NO_JIRA-frontend-alignment`,
`build-orchestrator/SKILL.md`, the auto-memory files, git history, and the session transcripts under
`~/.claude/projects/-Users-samfarrington-git-defra-trade-imports-{workspace,animals}/` (every `Workflow` tool_use
since 2026-07-01, extracted with jq).

## TL;DR: correction to the synthesis

**§7.1.3 is wrong as stated.** "`args` do not arrive reliably. `FALLBACK` in a gitignored run copy is the real
switch" (`00-synthesis.md:468`, echoed at `h-rails-and-lessons.md:29-33,166`) is folklore. The transcripts show
three separate things:

1. **The one reproduced failure was the stringified-args pitfall, and the script's gate turned it into a silent
   default.** On 2026-08-10 (Claude Code 2.1.224) the orchestrator passed
   `args: "{\"workarea\": \"frontend-snagging-eudpa315\", ... \"increments\": [\"snag-003\", \"snag-001\"]}"`, a
   JSON-encoded string. The loop's gate `typeof args === 'object' && args && args.increments ? args : FALLBACK`
   (`increment-build-loop.js:111`) fell through to `FALLBACK`. The run built `snag-002` (confirmed in
   `wf_06901df8-2bc/agent-ac6d306959b6cc5d2.jsonl`), and the baseline guard refused it. The session's own words
   (df27813e, 10:04Z): "`args` didn't plumb through — it fell back to the `FALLBACK` const". The CHED-D canary on
   2026-07-18 hit the same failure, and was correctly diagnosed at the time: "the Workflow tool delivered `args`
   as a **JSON string** … so `typeof args === 'object'` was false" (memory `project_chedd_trace_requirements.md:12`).
   The fix was to tolerate a string (commit `c904fa46`, `trace-to-requirements.workflow.js`,
   `doa-and-legacy-enrich.workflow.js`). That fix never reached the build loop.
2. **Args arrive fine on later runtimes.** Two scripts that read `args.X` directly, with no FALLBACK and no string
   tolerance, ran correctly:
   - `workareas/shared/dr1c-parity/author-workflow.js:16` `const SLICES = args.slices`, run `wf_8cc13780-b1b`
     on 2026-08-20 (v2.1.235). About 23 agents ran, and each prompt carried its slice
     (`YOUR SLICE: "service-wide"`).
   - `plants-spec-judges-panel` (`const DOCKETS = args.dockets`, `:11`), run `wf_ddfaa2ee-29f` on 2026-09-06
     (v2.1.261). It ran 33 agents with docket ids such as `D1-territory-and-timing` in their prompts. v2.1.261 is
     the same runtime version as every EUDPA-409 build-loop run.

   In the transcript JSON, all three calls record `args` as a string (`jq '.input.args|type'` gives `"string"`
   for every args-bearing Workflow call since July). So how the transcript records args tells you nothing. What
   differs is the runtime: 2.1.224 handed the script a string, while 2.1.235 and later handed it an object.
3. **The claim that args "never reach" the script comes from the 08-01 comment, not from a test.** The comment
   "`args` plumbing is unreliable in this runtime, so FALLBACK is the real switch" was written in the file's very
   first commit (`6da2fb7e`, 2026-08-01). No reproduction is attached to it. It was then copied into README.md:19,
   FA:27-28, `build-orchestrator/SKILL.md:163`, memory `reference_workflow_name_uses_stale_snapshot.md:24`
   ("because `args` never reaches them"), and on into analyses H and 00. Every EUDPA-409 run (b8e0ec5a, 35d792ab,
   91560410, 3efebdf1, 05870e5a: about 45 invocations) passed args that agreed with the patched run copy. Those
   runs cannot show whether args arrived, because both sources held the same values.

**Corrected constraint (proposed wording for §7.1.3):** "`args` arrives. On the current runtime it arrives as an
object. It has arrived as a JSON string before (2.1.224 and earlier), so the script must accept both. What went
wrong was the silent `FALLBACK` default, not the plumbing. The implementor workflow takes its config from `args`
alone. It JSON-parses a string, **throws** when a required key is missing, and logs the resolved config as its
first act. There is no FALLBACK default, no run copy, and no patching." This needs one zero-agent canary on the
current runtime before it is written into the skill (§5).

## 1. Defects this causes today

### 1.1 The gate converts a delivery quirk into a silent wrong build
- `increment-build-loop.js:111` `const CFG = typeof args === 'object' && args && args.increments ? args : FALLBACK`.
- `frontend-alignment.js:59` `const CFG = typeof args === 'object' && args && args.workarea ? args : FALLBACK`.
- The loop's `FALLBACK` on main still names `workarea: 'shared/plant-products-ched-pp'` and `increments: ['pp-053']`
  (`:90-110`). A string, a typo in a key name, or a missing `increments` all build that stale increment, and
  nothing warns. The two scripts gate on different sentinel keys (`increments` against `workarea`), which H §3
  also noted.
- The trace-requirements scripts were hardened on 2026-07-18 with a string tolerance (`JSON.parse` when
  `typeof args === 'string'`). The build loop, written two weeks later, copied the older gate and blamed the
  runtime instead.

### 1.2 The run copy is the source of drift, not a cure for it
- `build-orchestrator/SKILL.md:160-220` has the orchestrator copy the tracked loop to
  `workareas/<wa>/build-loop.run.js` (gitignored, `.gitignore:97`), Edit a 20-line FALLBACK, launch the copy,
  and pass the same args "as belt and braces".
- This causes the drift defect in synthesis §6.4 (`00-synthesis.md:442`, "Run-copy drift as a resume source …
  EUDPA-409 copy lacks five fixes"). The per-programme FALLBACK then spills into prose, in
  `EUDPA-409/PROGRAMME-NOTES.md:117-123` ("Both go into every run copy's FALLBACK … Write
  `requireApproval: false` into every run copy's FALLBACK"). The 13-field handover prompt exists to rebuild that
  FALLBACK in a fresh session.
- The "verify the executed snapshot" rail (`h-rails-and-lessons.md:32-33`) is needed only because config lives
  in script text. When config comes from args, the thing to verify is the resolved config, and the script can
  `log()` it itself.

### 1.3 The stale-snapshot incident would have been harmless with args-driven config
Memory `reference_workflow_name_uses_stale_snapshot.md` (2026-08-11): launching by `name` ran a session-start
snapshot whose FALLBACK said `['snag-003','snag-001']` while the source said `['snag-004']`, which cost 57 agents
and about 4.7M tokens. Launch-by-`scriptPath` stays a hard rule, because code can still be stale. But config
passed as args is not part of the snapshot, so the stale-snapshot failure would have been limited to stale code.
It would not have built the wrong increment.

### 1.4 FA avoided the run copy by committing config
FA never passed args (every FA invocation in 26dbae30 and dd7aadd6 has `args: null`). Its FALLBACK was edited
in the tracked file and committed: `3074d776` added `checkouts: 'clones'` and `workspacePr`, and `fa9b220c`
flipped it to `'root'` and added `localE2E: true` (`git log -L46,57`). That works for a single-programme script.
It cannot work for a shared implementor, because every programme would commit over every other programme's
config.

## 2. `workflow({scriptPath}, args)`: a composition primitive nobody has used

The reference documents that `workflow(nameOrRef, args?)` runs another workflow inline and returns its return
value. It also documents the following:
- The child shares the parent's concurrency cap, agent counter, abort signal and token budget. Its agents show
  under a `▸ name` group.
- `args` becomes the child's `args` global. That makes the child a parameterised function with a real object
  argument, not a text-patched copy.
- **Nesting is one level only.** `workflow()` inside a child throws.
- It throws on an unknown name, an unreadable scriptPath or a child syntax error, and the throw can be caught.

No workflow in the workspace calls it (`grep -rn "await workflow("` over `.claude/workflows`, the FA branch
script and the workareas finds nothing).

### 2.1 Q19 (cadence): a concrete hybrid
Today there are two camps:
- **build-orchestrator:** the main session derives the next increment, patches a run copy, and launches one
  Workflow per increment. It gets a landed-check between increments and a per-increment executor switch.
- **FA:** one invocation drains the backlog with `while (!halted)` (FA:512). A baseline agent re-reads the
  backlog each round (FA:520-560), so stages appended mid-run are picked up.

The runtime supports a third shape:

```js
// implementor-drain.js: one Workflow invocation from the main session
const CFG = parseArgs(args)                     // object or JSON string; throw on a missing workarea
while (true) {
  const next = await agent(derivePrompt(CFG), { schema: NEXT })            // allowlisted derive over backlog.json
  if (!next || next.id === 'NONE') break
  const r = await workflow({ scriptPath: '.claude/workflows/build-increment.js' },
                           { ...CFG, increment: next.id, executor: next.executor ?? CFG.executor })
  const landed = await agent(landedCheckPrompt(CFG, next.id), { schema: LANDED })   // the orchestrator's step 3
  if (!landed?.done) break                     // stop at the first red, as both camps do today
  if (CFG.count && ++built >= CFG.count) break
}
```

What this gives:
- The drain loop and re-derive from FA, and the per-item landed check and per-item executor switch from
  build-orchestrator. None of it needs a run copy, and the main session no longer has to relaunch between
  increments.
- `build-increment.js` is **read from its scriptPath when `workflow()` is called**. It must be, because the call
  can throw "unreadable scriptPath" or "child syntax error". A fix committed to the per-item child between
  increments should therefore take effect on the next item without relaunching the parent. **This is inferred,
  not documented.** The reference does not say whether the file is cached per run. Test it with the canary in
  §5.
- The main-session implementor skill stays thin. It resolves args from the backlog header, launches one
  Workflow, reads the journal, and prints a handover. The handover is now "relaunch with these args and
  `resumeFromRunId`", not a 13-field FALLBACK reconstruction.

Costs and unknowns:
- **Budget and agent cap are shared.** The 1000-agent lifetime cap is shared across parent and children. At
  22-46 agents per increment (`00-synthesis.md:470`), about 20 increments fit comfortably, and a very long
  drain needs a `count` knob. The Dynamic workflow size setting (§7.1.5) still applies.
- **Resume across children is undocumented.** Resume replays "the longest unchanged prefix of agent() calls".
  Whether a child's agents are part of that prefix, and so cached, is not stated. If they are, a
  resumed drain replays earlier increments at no cost and then runs live from the first changed call. If they
  are not, the idempotent `resumeAt` derivation the loop already has (`increment-build-loop.js:938-946`, from
  persisted `ticket`/`branch`/`commit`/`prs`) is what saves you. The design should rely on state-driven
  resumability in either case, which both workflows already have.
- **The one-level nesting limit uses up the only nesting slot.** If `build-increment.js` is a child, it cannot
  itself call a shared-library child (§3). Anything shared must be loaded by the parent and passed down in args.
- **Changes in the main session between items are gone.** A human cannot rule between increments inside one
  invocation. Gates must halt the drain (return and stop), which is what the loop already does for `gate`.
  Where Sam wants a between-item human checkpoint, cadence stays one-per-invocation. In the proposed design
  that is the same child script launched directly as a top-level Workflow, with the same args shape. So cadence
  becomes a flag, not a second code path (this answers H Q2 "cadence as programme data").

### 2.2 Q40 (shared rails): what the runtime does and does not offer
- **Imports.** The reference says scripts are plain JavaScript with "No filesystem or Node.js API access". It
  documents no module import. `h-rails-and-lessons.md:578` ("if the Workflow runtime supports imports") should
  be closed as **not supported, do not design on it**. The only documented composition is `workflow()`.
- **A shared stage library as a child workflow.** A child can return any value, so
  `const LIB = await workflow({scriptPath: '.claude/workflows/lib/rails.js'})` could return
  `{ GUARDRAILS, PUSH_RULE, COMMIT_TRAILER, PATH_RULE, schemas }` with no `agent()` calls. The parent then passes
  the strings into build children via args. Two caveats. First, this uses the one nesting level, so only a parent
  can load it. Second, whether a child with no `agent()` calls and only a `return` is accepted is plausible but
  untested; it goes in the canary. Stage *functions* cannot be shared this way, only data. A child can also
  be a whole stage (a "review-and-judge" child taking `{diff, focusFiles}`), which is a real way to share the
  review/verify/judge block between the distiller and the implementor. Again it is one level deep, so it cannot
  also be the per-increment child.
- **Rails that need no script plumbing at all.**
  - The reference says "Subagents get the same CLAUDE.md files injected at start that you did … don't tell them
    to re-read those or paste their rules into the prompt". So rails put in workspace `CLAUDE.md` or a
    `.claude/rules/*.md` with a `paths:` glob reach every Claude workflow agent without a GUARD RAILS block.
    Today both scripts paste an 18-line block into every prompt (`FA:102-117`), and the loop has its own copy.
  - `opts.agentType` resolves a custom subagent type "from the same registry as the Agent tool" and composes
    with `schema`. A `.claude/agents/<name>.md` (the directory does not exist yet: `ls .claude` shows hooks,
    rules, skills, workflows, worktrees) could hold the per-role rails as a system prompt, for example
    `increment-implementor`, `finding-refuter` or `state-writer`, versioned once and shared by both workflows.
    **Caveat:** Codex-executor stages run through a Claude shell agent that calls `codex exec`. Codex sees
    neither CLAUDE.md nor agent definitions, which is why `codex/*.md` briefs carry their own "ignore the Claude
    GUARD RAILS" preamble. So Codex rails stay in `codex/*.md` whichever route is chosen.
  - Recommendation: put the Claude rails in `CLAUDE.md`/`.claude/rules` (already injected), put role personas in
    `.claude/agents/*` used via `agentType`, and use a `lib` child only for machine data (schemas, the status
    vocabulary) the parent needs in code. That removes most of the "embed one copy" problem instead of solving
    it with a loader.

## 3. `opts.isolation: 'worktree'` and parallel implementors

- The reference says it "runs the agent in a fresh git worktree — EXPENSIVE … use ONLY when agents mutate files
  in parallel". The worktree is auto-removed if it is unchanged.
- **It does not isolate the code these workflows change.** The worktree is of the workspace repo. `repos/` is
  gitignored (`.gitignore:65 /repos/`), and every product repo is a separate git checkout under it. A workspace
  worktree has no `repos/`, so an implementor there either finds nothing or reaches back through the tilde path
  to the shared checkouts, which defeats the isolation. This is inferred from the gitignore plus the documented
  semantics, not from a test. A worktree left behind at `.claude/worktrees/review-post-own-prs` shows the
  mechanism has been used here for workspace-only work.
- It also collides with two standing rails. Memory `feedback_worktree_when_sharing_branch.md` says "Use
  branches, never worktrees — worktrees detach from the stack bind-mount", and the E2E and local-E2E rungs need
  the `tim docker dev` stack bind-mounted on `repos/<repo>`.
- **Conclusion for parallel implementors:** `isolation: 'worktree'` is fit only for agents that mutate the
  *workspace* repo in parallel, such as parallel distiller writers producing per-slice requirement files. It is
  not fit for product-code implementors. Parallel builds of independent increments would need per-increment
  product clones, which FA's `checkouts: 'clones'` mode (`FA:31-34`, `workareas/clones/`) already prototypes.
  Serial remains the default for the implementor.

## 4. Keep, drop, change

| Item | Verdict |
|---|---|
| Launch by `scriptPath`, never `name` | **Keep.** Code staleness is real and independent of args |
| `FALLBACK` const as the config source | **Drop.** Replace it with args-only config, parse a string, throw on missing keys, `log()` the resolved config |
| Gitignored run copy plus Edit-patching (`build-orchestrator/SKILL.md:160-220`, `.gitignore:97`) | **Drop.** It is the source of the §6.4 drift |
| "Verify the executed snapshot" by grepping the persisted copy | **Replace** with checking the script's first `log()` line, or a required `resolvedConfig` field in the return value |
| 13-field handover prompt that rebuilds FALLBACK | **Shrink** to: backlog path, the `args` object verbatim, and the run id for `resumeFromRunId` |
| Programme config in the backlog header (FA style, synthesis item 21 at `:406`) | **Keep and strengthen.** args then carries only the workarea and run knobs (`count`, `executor` override, `cadence`) |
| Resume = same scriptPath + same args + `resumeFromRunId` | **Keep.** Args changes alter prompts and so bust the cache from the first differing agent. Args are now a first-class resume input, so print them verbatim in the handover |
| String-tolerant args parse (`c904fa46`) | **Keep as the house idiom**, plus a throw where it currently defaults (that commit still falls back to `'ched-pp'`) |
| One-per-invocation (build-orchestrator) against drain (FA) | **Merge**: a drain parent plus a per-item child via `workflow()`, and the same child launchable top-level for supervised cadence |
| Shared rails via imports | **Close as unsupported.** Use CLAUDE.md/rules plus `.claude/agents` + `agentType` for Claude, and `codex/*.md` for Codex |
| `isolation: 'worktree'` for implementors | **Not applicable** to product repos (gitignored `repos/`, stack bind-mount rail) |

## 5. The canary that should back this before the skill is written

One zero-agent Workflow, launched from the main session on the current runtime. It costs no tokens:

```js
export const meta = { name: 'args-canary', description: 'Prove args delivery and child workflow semantics' }
const child = await workflow({ scriptPath: '<abs>/.claude/workflows/lib/echo.js' }, { a: [1, 2], b: 'x' })
return { argsType: typeof args, isArray: Array.isArray(args?.list), args, child }
// echo.js: export const meta = {name:'echo', description:'echo'}; return { childArgsType: typeof args, args }
```

Launch it three ways:
1. `args: {list: ["a"], n: 1}` as a real JSON object.
2. `args: "{\"list\":[\"a\"]}"` as a string.
3. No args.

Record the results in `docs/` (or memory) against the Claude Code version. That settles four things:
- (a) Whether object args arrive as objects. Expected yes.
- (b) Whether strings are still passed through as strings. The reference says they are ("a stringified list
  reaches the script as one string"), yet v2.1.235 and later behaved as if they were parsed. The canary decides.
- (c) Whether a zero-agent child returning data is allowed, which is the `lib` route in §2.2.
- (d) By editing echo.js between two `workflow()` calls in a loop-shaped variant: whether the child is re-read
  on each call, which is the hot-fix property in §2.1.

Resume behaviour across children, the last unknown, needs a one-agent child and a deliberate kill.

## 6. Evidence index

- Gate lines: `increment-build-loop.js:26-27,111`; `frontend-alignment.js:27-28,59` (FA branch).
- Origin of the claim: `git log -S "args\` plumbing is unreliable"`, first commit `6da2fb7e` (2026-08-01),
  README.md:19.
- Diagnosis and fix of the string pitfall: memory `project_chedd_trace_requirements.md:12`; commit `c904fa46`.
- Reproduced failure: session `df27813e` (animals project dir), tool_use `toolu_01TpD2VUXfKASXX5aPN6MqvQ`,
  run `wf_06901df8-2bc` built `snag-002` while args said `snag-003, snag-001`. Version 2.1.224.
- Successful args delivery: `wf_8cc13780-b1b` (session a4d1b1a1, v2.1.235, `author-workflow.js:16`);
  `wf_ddfaa2ee-29f` (session f3d26aa4, v2.1.261, `plants-spec-judges-panel-wf_ddfaa2ee-29f.js:11-12`).
- Run-copy mechanics: `build-orchestrator/SKILL.md:160-220`; `.gitignore:97`; `EUDPA-409/PROGRAMME-NOTES.md:117-123`.
- FA config-by-commit: `3074d776`, `fa9b220c`; FA launches with `args: null` (sessions 26dbae30, dd7aadd6).
- Worktree collision: `.gitignore:65`; memory `feedback_worktree_when_sharing_branch.md`.
