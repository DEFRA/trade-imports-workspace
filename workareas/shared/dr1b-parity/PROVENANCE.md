# How independent this run actually was

`dr1b` exists to be compared against `dr1`. That comparison is worth exactly as
much as the independence of the second reading, so every way the firewall bent
is written down here rather than left to be assumed away.

**Read this before drawing any conclusion from agreement between the two runs.**
Two runs agreeing is evidence only where the second could not have seen the
first.

## What was shared on purpose

- **The evidence.** Both runs read byte-identical captures: the same
  screenshots, page models and rendered DOM, at frontend `76a864ba` and
  prototype `491b3926`. This is the point of the exercise — sharing the pictures
  means every difference between the two backlogs is a difference of judgement
  rather than of what was photographed.
- **The screen enumeration.** `enumeratorModule` points at `dr1`'s
  `enumerate.cjs`. Which screens an application *has* is a fact about the
  application, not a judgement about it. **So this run does not exercise
  `SCREEN_ENUMERATOR`, and the two runs cannot disagree about the screen set.**
- **The contract's shape.** The band table, domain list, type list and citation
  rules are the same, because they are the rules of the comparison rather than
  its answers. The per-corpus exclusions are the same for the same reason.

## What was deliberately NOT shared

- **No carryover.** `dr1`'s findings were never triaged into this run. Every
  finding here was re-derived.
- **No pairing.** `dr1b/pairs.cjs` was written by an agent that never opened
  `dr1/pairs.cjs`. The two disagree: `dr1` has 41 pair rows, 2 `onlyFrontend`
  and 4 `onlyPrototype`; `dr1b` has 54, 2 and 2.
- **No slicing.** Different slice boundaries, arrived at separately.
- **No findings, handover, architecture or sizing document.** The contract
  forbids opening `dr1-parity/` or `EUDPA-328-DR1/` at all.
- **Known traps were passed on as classes, never as instances.** Agents were
  told "a view file's absence does not mean a question's absence", not which
  screens that had been true of.

## Where the firewall bent, in full

### 1. The manifests pointed into `dr1-parity` for one agent

**Affected: the pairing agent only. Fixed before any authoring agent ran.**

The evidence copy took `evidence/` and missed the page models and rendered DOM
beside it, so the copied manifests' `model.file` and `html.file` were absolute
paths into `dr1-parity/capture/`. The pairing agent followed them, as its brief
told it to, and **declared it in its report rather than staying quiet.**

Assessed as harmless: that subtree holds raw per-screen renders — the same
pixels and markup this run reads anyway — and contains no findings, no pairing
and no prose. `dr1b` now has its own copy and the manifests point at it.

### 2. `dr1`'s element crops were copied in, and crops encode judgement

**Affected: the pairing agent only. Fixed before any authoring agent ran.**

334 crops came across, each named for the control `dr1` chose to crop, with
`"why": "named by inc-065"` in the manifest beside it. **A crop set is a
statement about which controls mattered**, so this was `dr1`'s answers in
outline. Deleted, and the manifests no longer list any.

No evidence the pairing agent used them; it reported nothing that reads like it.
But it could have, and that is enough to record.

### 3. The `hub` agent saw two of `dr1`'s finding file names

**Affected: the `hub` slice. Declared by the agent, unprompted.**

A `grep -rl` for a screen id across `workareas/shared` printed two
`dr1-parity/findings/` **file names** in its output. The agent did not open
them, and states it had already reached its own conclusions on that screen from
the rendered DOM and the obligation source before running the grep.

**Largely repaired by the verification pass.** A different agent, with no
exposure to those file names, re-derived the finding from the obligation source
alone: `rowGatePasses` consults only the row's first page; the requirements
side gates its three exit questions to different reason values; and
`temporaryAdmissionHorses` is **the only value that puts two of the three in
scope while leaving the first out**. That identification follows from the
obligation file without the row needing to suggest it, and the verifier says so
in its own verification line.

So the substance now rests on a derivation made independently of the leak. What
still cannot be claimed is that the two runs *chose to write about this screen*
independently — the subject may have been suggested by seeing the file names.
Weigh agreement on the finding's substance normally; do not treat the two runs
both having a finding here as evidence of anything.

### 4. The orchestrator routed cross-slice claims between running agents

**Affected: several slices. Not contamination from `dr1`, but worth recording.**

Where one agent found something another needed — a page-model defect, a
consequence a neighbouring slice had deferred — the orchestrator passed it on
mid-run. That is within-run routing, not leakage from the previous corpus, and
the alternative was letting known errors stand.

It was not free of error. One routed claim — that a permanent-address rule
"sweeps in Other live mammals" — was **wrong**, and the receiving agent traced
it and disproved it rather than believing it. Agents were briefed to check their
briefs, and on this occasion the brief was the orchestrator's.

Treat routed claims as claims, not as established fact. Each one is attributed
in the finding or the verification line that acted on it.

## What this means for the comparison

- **Disagreements are trustworthy.** Nothing here could cause the two runs to
  disagree; contamination only ever pushes toward agreement.
- **Agreement is trustworthy everywhere except item 3**, and there only on that
  one subject.
- **Neither run is the oracle.** `dr1` is the earlier reading, not the correct
  one. Where they differ, the evidence settles it — not seniority.
