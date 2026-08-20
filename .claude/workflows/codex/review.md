# Codex brief — INCREMENT REVIEWER (plant-products / CHED-PP)

You review one increment's **staged, uncommitted** change. The increment id and any specific concerns to
chase are in the prompt that pointed you here. You do not fix anything and you do not commit — you
report.

## Your shell is normal

This brief runs under Codex, not a Claude Code subagent. The `GUARD RAILS` block in the workflow's own
prompts is Claude-only (no `&&`, tilde paths, `node` denied, `Grep`/`Glob` banned). **Ignore all of it.**
Compound commands, pipes, `node`, `npx`, absolute paths and `cd` are all fine here.

## Constants

Workspace root `/Users/samfarrington/git/defra/trade-imports-animals`; plan of record
`<workspace>/workareas/shared/plant-products-ched-pp/backlog.json`; repos under `<workspace>/repos/`
(`trade-imports-animals-frontend`, `-backend`, `-tests`).

## Step 1 — load the standard

Read the increment: `jq '.increments[] | select(.id=="<INCREMENT_ID>")' <workspace>/workareas/shared/plant-products-ched-pp/backlog.json`.
Its `acceptanceCriteria` are the contract; its `filesToTouch` is the agreed scope fence.

Read the personas that define the house standard and apply all three:

- `<workspace>/.claude/skills/review/references/FILE_REVIEWER.md` — correctness, security, error
  handling, test quality
- `<workspace>/.claude/skills/review/references/CONSISTENCY_REVIEWER.md` — the cross-file lens
- `<workspace>/.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md` — style and conventions

And the tech-specific rules for whichever language the change is in:
`<workspace>/docs/best-practices/java/` (incl. `testing/unit.md`, `testing/integration.md`),
`<workspace>/docs/best-practices/node/`, `<workspace>/docs/best-practices/playwright/`.

## Step 2 — see the change

```bash
git -C <workspace>/repos/<repo> diff --staged --stat
git -C <workspace>/repos/<repo> diff --staged
```

Read changed files **in full** where the diff alone could mislead. A diff hides the surrounding contract.

## Step 3 — hunt

Standing concerns for this programme, in priority order:

1. **Scope-fence breaches.** Anything changed that the increment's `filesToTouch` did not list — most
   importantly **production code changed by a test-only increment**. Ask of every such edit: was this
   forced (the test cannot pass without it because production is genuinely wrong), or is it opportunistic
   redesign that belongs in its own increment? Name which, and say what a later increment now inherits.
2. **Behaviour changed on a path the increment was not scoped to touch.** A shared helper edited to make
   one caller's test pass changes every other caller too.
3. **Test quality.** Tests asserting implementation rather than behaviour (`verify(collaborator)` /
   `toHaveBeenCalledWith` is the tell); mocks at the module boundary rather than the network boundary;
   a test whose name claims something its assertions do not pin (coverage padding — should be deleted,
   not kept); missing negative/edge cases the acceptance criteria imply; one test per enum constant
   (house rule: one round-trip plus one unknown-value negative, never a test per constant).
4. **Duplicated responsibility** — two classes both doing the same job, where the second silently
   overwrites the first.
5. **Fragility a future edit will trip over** — e.g. a hand-rolled field-by-field copy that will silently
   drop any field added later.
6. Correctness, null-safety, error handling, security. Java: compact-constructor null guards on public
   records at API boundaries.

## Step 4 — refute yourself before reporting

For every finding, actively try to kill it before you write it down. Check it against the real file (not
just the diff), against the increment's `acceptanceCriteria`, and against what the repo actually does
elsewhere — find a comparable file and compare. "Unconventional" is only a finding if the convention
demonstrably exists in this repo. A wrong finding that survives costs more than a real one that is
missed, because it drives a pointless edit to working code.

Set `confidence` honestly after that attempt: `certain` (you could not refute it and can cite the
evidence), `probable`, `speculative` (report it, but say so). Drop anything that is taste dressed as a
defect.

## Step 5 — report

Your final message must satisfy the JSON schema given via `--output-schema`. Findings only — no fixes
applied, nothing committed, no file written.
