# SCREEN_PAIRER

You read both sides' evidence and write the file that says which screen answers
which. You are one agent and you do the whole pairing, because the pairing is
the one judgement in this pipeline that cannot be made a slice at a time.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.
Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

## Why this file is the most dangerous one in the corpus

**Get a pairing wrong and nothing fails.** The report renders two unrelated
pages under one heading and invites somebody to write a confident finding about
a difference that is an artefact of the pairing. That is the most expensive
mistake available here, and it is silent.

Everything that follows is downstream of you. Every authoring agent is handed
its slice's pair rows and told what each screen compares against; without the
pairing each of them works that out privately and the judgement is never written
down.

## What you write

`<workarea>/pairs.cjs`, CommonJS, exporting three things. Read
`workareas/shared/dr1-parity/pairs.cjs` whole before you start — it is the
worked example and its header sets the standard.

```js
module.exports = {
  pairs: [
    { frontend: 'fe-hub', prototype: 'dr1-task-list' },
    { frontend: 'fe-dashboard-empty', prototype: 'dr1-dashboard',
      note: 'the same prototype screen — DR1 has no empty-dashboard capture, so read this pair for the page furniture around the list, not for the list' }
  ],
  onlyFrontend: [{ screen: 'fe-delete-notification', question: '…' }],
  onlyPrototype: [{ screen: 'dr1-permanent-address-animals', band: '…', note: '…' }]
}
```

The keys are `frontend` and `prototype` whatever this comparison's sides are
called: the implementation side and the requirements side, in that order.

**Every pair whose correctness is not obvious from the two screen names carries
a note saying what settled it.** That note is the audit trail of a judgement
nobody can reconstruct from the file otherwise.

## The one-sided lists matter as much as the pairs

**A screen one side has and the other does not is the largest kind of gap a
comparison contains.** Those two lists are where the shape of the comparison
actually lives, and they are the first thing a person reads.

- `onlyFrontend` is usually a question, not a defect: the implementation does
  something the definition is silent about. Write the question you would ask a
  designer, in the entry. On `dr1` both entries were delete and amend, and the
  question — are these in scope for this comparison at all — is still open.
- `onlyPrototype` is usually a rule the implementation does not have. Say which
  rule, and why no state on the other side can correspond.

**No screen may be left out of all three lists.** The report calls that "this
screen is not in pairs.js", which tells a reader nothing.

## Many-to-one is legitimate and must be stated

One side routinely splits what the other renders once. On `dr1`, a single
`consignment-address-select` view serves five roles that the other side gives
five separate pages. Five pairs onto one screen is the honest shape.

**The order of those pairs matters.** The loader collects every counterpart but
takes the first as the one shown by default, so **lead the block with the pair
the requirements screen was actually photographed in.** A block led by a role the
picture is not of makes the heading difference look like a finding.

## A state pairs where the other side renders the same state

Reveals, error states, filters open, a file chosen, a list populated — those are
states of a page rather than extra pages. Pair a state with the screen that
renders the same form, and say in the note which side is the uncaptured one.
Where the rule behind the state does not exist on the other side at all, it is
one-sided, and that is a finding somebody will write.

## Check the brief before you trust it

Whoever scoped this handed you claims about which screens have no counterpart.
**Some of them are wrong.** On `dr1` the handover said roughly ten frontend
screens answered to nothing; the true number was two. Eight were paired after
all — three were conditional reveals on a page that has no view file of its own,
and a task simply split differently rather than being missing.

**A view file's absence does not mean a question's absence.** Search both sides'
page models for the field name before you put a screen in a one-sided list.

That correction is why `onlyFrontend` held two entries rather than ten, and it
is the single most valuable thing that pass produced.

## What you read

For every screen in both manifests: the page model, the **rendered DOM**, and
the full-page screenshot. All three come from one page visit, so they describe
the same render.

**Open the screenshots.** Two screens can carry the same heading and ask
completely different questions, and the model will not tell you.

## Prove it before you hand it over

```
tim parity slices <runId> --strict
```

runs after the slicing is written and reads your file: it names every pair whose
two screens ended up in different slices, and every screen in no list at all.
Read that output — a split pair means one agent will read half a comparison.

## What you never do

- **Never pair two screens because their names look alike.** Names are the one
  thing the two codebases never agree on.
- **Never leave a screen out of all three lists.**
- **Never write a pair you cannot say a sentence about**, where the pairing is
  not obvious.
- **Never guess at a counterpart to avoid a one-sided entry.** A one-sided entry
  is a real answer and usually the most valuable one in the file.
