# Codex brief — INCREMENT REVIEWER

You review one increment's **staged, uncommitted** change. The increment id and any specific concerns to
chase are in the prompt that pointed you here. You do not fix anything and you do not commit — you
report.

## Your shell is normal

This brief runs under Codex, not a Claude Code subagent. The `GUARD RAILS` block in the workflow's own
prompts is Claude-only (no `&&`, tilde paths, `node` denied, `Grep`/`Glob` banned). **Ignore all of it.**
Compound commands, pipes, `node`, `npx`, absolute paths and `cd` are all fine here.

## Constants

Every `<placeholder>` here — `<workspace>`, `<workarea>`, `<backlog>`, `<skills>`, `<INCREMENT_ID>`,
`<branch>`, `<baseBranch>`, `<frontendRepo>`, `<backendRepo>`, `<testsRepo>` — is bound to a real value
in the prompt that pointed you here. Use those bindings; never guess one. `<repo>` below means whichever
of the three repo paths the increment's `repo` field names.

Workspace root `<workspace>`; plan of record `<backlog>`. The three repos are `<frontendRepo>`,
`<backendRepo>` and `<testsRepo>` — bound per run, and different between programmes. Never substitute
a repo name you remember from another run.

## Step 1 — load the standard

Read the increment: `jq '.increments[] | select(.id=="<INCREMENT_ID>")' <backlog>`.
Where it has `acceptanceCriteria` those are the contract, and where it has `filesToTouch` that is the
agreed scope fence. **A thin increment carries neither, and that is normal** — backlogs differ, and the
implementor is expected to derive the solution from the repo's own recipes and conventions. Then the
contract is what the increment's descriptors (`type`, `title`, `detail`, `section`, `page`, `slug`,
`obligations`) plus the governing recipe together require. Judge the change against that. Never raise a
finding whose substance is that the increment was underspecified.

Read the personas that define the house standard and apply all three:

- `<skills>/review/references/FILE_REVIEWER.md` — correctness, security, error handling, test quality
- `<skills>/review/references/CONSISTENCY_REVIEWER.md` — the cross-file lens
- `<skills>/code-style/references/STYLE_FILE_REVIEWER.md` — style and conventions

**Then look at the change (Step 2) before you load any tech-specific rules**, and load only the ones the
change actually needs:

- Java in the diff → `<workspace>/docs/best-practices/java/` (incl. `testing/unit.md`,
  `testing/integration.md`)
- Node or Nunjucks in the diff → `<workspace>/docs/best-practices/node/`
- Playwright specs in the diff → `<workspace>/docs/best-practices/playwright/`

A language absent from the diff needs none of its rules. **Read each file at most once.** These documents
run to thousands of lines between them; re-reading one you have already read is how a review runs out of
room before it reports, and a review that never reports is worse than a thin one. If you find yourself
about to re-open a document, write the finding instead. Budget your reading for the diff, which is the
only thing here nobody else has looked at.

## Step 1b — the programme's own concerns

The prompt that pointed you here may name traps specific to this programme, and the increment's `recipe`
field may cite a plan that names more. Read them and hunt for them alongside the standing list below.

## Step 2 — see the change

Review **the increment's whole change**, which is everything the branch has added on top of the base —
not just what happens to be sitting in the index right now:

```bash
git -C <repo> diff <baseBranch>...HEAD --stat
git -C <repo> diff <baseBranch>...HEAD
git -C <repo> diff --staged --stat
git -C <repo> diff --staged
```

Both halves matter, and either can be empty. On an ordinary run the work is staged and uncommitted, so
the first pair is empty and the second holds everything. On a **resumed** increment an earlier attempt
may already have committed its work to the branch as a `wip(...)` commit, so the first pair holds it and
the second is empty or holds only the newest edits. **An empty index is not an empty change** — if
`git diff --staged` returns nothing, that is never on its own grounds to report a clean review. Where the
two overlap you will see a file twice; review it once, in its final state.

Read changed files **in full** where the diff alone could mislead. A diff hides the surrounding contract.

## Step 3 — hunt

Standing concerns, in priority order:

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

**Always report, even if you did not finish.** Reporting is not the last thing you do if there is room
left — it is the thing you must not run out of room for. If you are running low, stop reading, stop
hunting, and emit what you have, saying in the summary which files or concerns you did not reach. A
partial review that reports is useful; a thorough one that never emits a final message is worth nothing
and halts the whole increment, because a stage that produces no result can never be read as approval.
