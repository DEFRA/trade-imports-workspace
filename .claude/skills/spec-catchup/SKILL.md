---
name: spec-catchup
description: 'Catch the Behaviour Spec (openspec/) up with what the code now does — the words are wrong or missing, so this skill writes spec.md and its coverage links, in the workspace repo. Produces a dated report at ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/report.md. Calls tim spec candidates itself to scope the work, judges only that scope, and never advances the baseline. Use when the user asks to catch the spec up or says it is behind (triggers: "catch the spec up", "the spec is behind", "is the behaviour spec stale", "what behaviour is not documented", "spec-catchup"). NOT for writing tests for scenarios that have none — that is the other direction and belongs to a different skill, which writes tests in a service repo. NOT for a single capability someone already knows is wrong — hand-edit openspec/specs/<path>/spec.md directly. NOT for validating the spec''s own conventions or the coverage binding — use tim spec lint for that (this skill calls it as its first, mechanical pass).'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write]
---

Reconciles what the Behaviour Spec (`openspec/`) claims against what the tests
and source actually do, for the capabilities that changed since the last
verify. Every command it needs already exists as `tim spec <cmd>` — this
skill is the one place that reads a candidate's changed test body, the
scenario it is linked to, and the commit behind it, and renders a judgement.
The only AI piece in this workflow; everything upstream of it
(`docs/reference/openspec.md` → "tim spec — validating and maintaining the
binding") is deterministic.

**Nothing here gates anything.** No CI workflow, no pre-push hook, no change
to the build loop. Run this by hand or on a schedule; every output is a
report a person reads.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~`
automatically. Skill-internal references stay relative (`references/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

Triggers: "catch the spec up", "the spec is behind", "is the behaviour spec
stale", "what behaviour is not documented", "spec-catchup" (check
`tim workspace status`'s staleness line first — if it says 0 changed files,
say so and stop; there is nothing to catch up).

**The direction matters.** This skill runs when *the code does something the
spec does not say* — the words are wrong or missing, and it writes `spec.md`
in the workspace repo. The opposite case — *the spec says something no test
proves* — needs a test written in a service repo, which is a different skill
entirely. Confusing the two writes the wrong artefact in the wrong repo.

NOT for a single capability someone already knows is wrong — hand-edit
`openspec/specs/<path>/spec.md` directly, the way `frontend-change` Step 5
does. NOT a validator — `tim spec lint` is; this skill calls it as Step 1.

## Subagents

None. No fan-out — a typical candidate set fits one context (around
150–250k tokens per run). The reader persona in `references/READER.md` is
followed inline by this same session, not spawned.

## Step 0: Refuse if it is not safe to run

Two checks, in order. Either one failing is a hard stop — print why and stop,
don't work around it:

1. **`openspec/` must be clean.**
   ```bash
   git -C ~/git/defra/trade-imports-workspace status --porcelain -- openspec/
   ```
   Non-empty output means a `frontend-change` or `journey-builder` write is
   sitting there uncommitted. This skill writes `coverage.json` too — running
   over a dirty tree risks clobbering someone else's in-progress write, or
   silently attributing this sweep's questions to changes it did not make.

2. **No `requirements-pipeline` build run is active.** Check for a
   `build/state.json` under any `~/git/defra/trade-imports-workspace/workareas/*/`
   whose most recent increment entry's phase is mid-flight (`implement`,
   `review`, or `land` — not `done` or `rolled_back`). A live run's own
   `openspec/` write follows the same uncommitted-then-committed path as
   check 1, but the race window between "increment done" and "commit landed"
   is real; if in doubt, ask the user whether a build is running rather than
   guessing from file timestamps.

If both are clean, proceed.

## Step 1: Scope the work — mechanical, no judgement

```bash
tim spec candidates --json
```

Call this yourself — never accept a pasted copy from the user; the whole
point is that the candidate set is always current. The result carries:

- `staleness` — the header for the report (same shape `tim workspace status`
  prints)
- `workPackets` — one per capability with a changed linked file, largest
  first, each flagged `coverageUpdatedSinceBaseline` (someone already
  touched this capability's `coverage.json` since the baseline — read it
  anyway, but weight your prior towards "probably fine" rather than "assume
  broken")
- `unresolvedLinks` — from `tim spec lint`; a link that does not resolve at
  all. These are not drift, they are already-broken bindings — judge and fix
  them the same way as any other STALE LINK finding, don't skip them because
  lint already found them mechanically
- `knownGaps` — from `tim spec gaps`; scenarios already recorded `none` or
  `partial`. Context only — **do not re-report these as findings.** A gap
  is not drift; it is a hole nobody has claimed is filled
- `commitLog` — per repo, for triage: which commits are behind each change

Every work packet in `workPackets`, plus every entry in `unresolvedLinks`, is
in scope. `knownGaps` is read-only context.

## Step 2: The declarative pre-pass — no AI, for three capabilities only

`journey-flow`, `journey-section-captions` and `page-titles` (each service:
`live-animals/journey-flow`, `plants/journey-flow`, etc.) have a mechanical
answer instead of a judged one, because the app's own source is the ground
truth for both claims:

- **Section membership and order** — the target's `flow.js` (path from
  `tools/journey-builder/targets.json`, or the shape
  `tim/src/capture/inventory.js`'s `readInventory` already reads:
  `sections: [{id, pages: [{id, slug}]}]`) exports the exact order,
  `{section, id, slug, order}` per page. Read the file directly (it is plain
  JS, not something you need `tim` to parse); diff its section names and
  order against what `journey-flow`'s `spec.md` states.
- **Page titles** — each page's `copy.<locale>.js` exports a top-level
  `title` key. That is the page's title. **Not** `legend` — a question's
  visually-hidden legend and the page's H1 are frequently different text,
  and `page-titles`' whole job is the H1. Read `copy.en.js` (or whichever
  locale the spec cites) directly and compare its `title` string against
  what `page-titles`' `spec.md` states for that page.

Where these disagree, that is a mechanical **SPEC WRONG** finding — no
judgement sentence needed beyond citing the source line and the spec line,
though still write one (rule 5 below applies to every finding, mechanical or
not).

If these three capabilities are not in this run's `workPackets`, skip this
step.

## Step 3: Judge every other candidate

Follow [`references/READER.md`](references/READER.md) for the full rubric.
Summary of the two rules that matter most:

- **`coverage.json` may be written; `spec.md` may only be proposed.**
  Coverage is a checkable factual claim about what a test asserts — fixing a
  stale link is restoring a fact. `spec.md` states intended behaviour; an AI
  editing it turns a drift finding into a silently-changed requirement,
  which is `openspec/config.yaml`'s drift-by-assertion — it validates green
  and is worse than the omission it replaced. So a `spec.md` change is
  always a **proposed diff in the report**, never an edit to the file.
- **Every finding carries an explicit one-sentence judgement.** Not "this
  looks stale" — state which of the two readings it is: *"the behaviour is
  unchanged and only the test moved"* or *"the behaviour changed"*. A
  missing sentence is a halt on that finding: leave it unresolved in the
  report rather than guessing, and say so.

## Step 4: Apply STALE LINK fixes

For every finding judged STALE LINK, edit the `coverage.json` row directly
(repoint `file`/`test`, or demote `coverage` to `"none"` with a `notes`
explaining why, per the same convention `frontend-change`'s Step 5.3 uses).
**Leave the edit uncommitted** — name every file you touched in the
completion output, the same contract `frontend-change` uses, so the person
running this reviews and commits it themselves.

Do not touch `spec.md` for any verdict. SPEC WRONG and SPEC GAP findings are
diffs in the report only.

## Step 5: Write the report

```
~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/report.md
```

`<date>` is today's date, `YYYY-MM-DD`. Shape:

```markdown
# Spec sweep — <date>

Baseline: verified <verifiedAt> (<verifiedBy>). <N> linked files / <M> links
across <K> capabilities in scope this run.

## STALE LINK (<count>) — coverage.json fixed, uncommitted

### <capability> — <SCN-ID>
<one-sentence judgement>
Fixed: <what changed in coverage.json>

## SPEC WRONG (<count>) — proposed, not applied

### <capability> — <REQ-ID or SCN-ID>
<one-sentence judgement>
```diff
<the proposed spec.md diff>
```

## SPEC GAP (<count>) — proposed, not applied

### <capability> — <what the gap is>
<one-sentence judgement>
Proposed addition: <the new requirement/scenario, in the spec's own voice>

## NO ACTION (<count>)

- <capability> / <SCN-ID> — <one-line justification: copy, layout or refactor>
<!-- group every NO ACTION in this one bucket, one line each -->

## Unresolved

<!-- only if any finding's judgement sentence could not be written honestly -->
- <capability> / <SCN-ID> — could not judge because <why>

## Next

Baseline unmoved. If you accept this report:
tim spec baseline --advance
```

## Completion output

```
Spec sweep complete for <date>.

<N> findings: <a> STALE LINK (fixed, uncommitted) · <b> SPEC WRONG (proposed)
· <c> SPEC GAP (proposed) · <d> NO ACTION

Report: ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/report.md

Baseline not advanced. Run `tim spec baseline --advance` yourself once you've
reviewed the report and committed the coverage.json fixes.
```
