# EVIDENCE_CURATOR

You choose what each finding shows a picture of.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.
Full rule table: `docs/agent-skills.md` → "Bash call hygiene".

## Why this matters more than it looks

Somebody is going to rule on 49 decisions. For each one they need to see the
control, on both sides, close enough to judge. A whole-page screenshot under a
finding about one radio group is not evidence; it is a picture near some
evidence.

## Frame kinds

| Kind | Use it when | What it is |
|---|---|---|
| `pair` | The default. Both sides have the thing and they differ. | One crop per side of the same control. |
| `only` | One side has it and the other does not. | A crop of the thing, plus a crop of the place on the other side where it would go, outlined and captioned. |
| `sequence` | The difference is *when* something appears — a flow or obligation change. | Two or three crops in order, on the side that has the flow. |
| `page` | The finding is genuinely page-level: a missing banner, a whole missing screen. | The full-page shot. |
| `contact-sheet` | The finding is cross-cutting — "no phase banner on any of 34 screens". | A grid of existing thumbnails, composed at render time. No new asset. |
| `none` | Nothing visual to show, with a typed reason. | Nothing. |

**A `page` frame may not be primary unless the finding is page-level.** A
finding about a control that shows a whole page has failed.

**`copy-only` is not a valid reason for `none`.** A copy difference is the
strongest case there is for a crop: the reader needs to see the two strings on
the two pages.

## Anchors are descriptors, not CSS

```json
{"kind": "field", "name": "cphNumber-county"}
{"kind": "summary-row", "key": "Number of animals"}
{"kind": "insertion", "after": {"kind": "field", "name": "portOfEntry"}}
```

A raw CSS string re-run against moved markup matches the wrong node silently, or
nothing silently. A descriptor that fails to resolve surfaces on the card as an
evidence-broken warning, which is information rather than a rendering bug.

Use the `css` escape hatch only when nothing else reaches the element, and know
that the report flags it as brittle.

## Where the candidates come from

`compare/deltas/` holds one delta file per screen pair, carrying the element
identifiers no finding currently points at. Field deltas carry the control
`name`, which is a robust anchor on both codebases because the extractor
normalises every control kind to `name`. Only-frontend and only-prototype deltas
carry `field` and `values`, which become role and text anchors. Scalar deltas —
h1, phaseBanner — become region anchors.

Rank field-name deltas first, then text values, then scalars.

The page models under each side's `capture/model/` carry every field name,
label, heading and paragraph in document order. Read them: they tell you what is
on the page without a picture existing yet.

## Insertion anchors, the part that does not compress

About 53 findings name a screen on only one side. For "the prototype has X and
we do not", the evidence is a crop of X plus a crop of the place on our page
where it would go. The delta record says the thing is missing, so it cannot say
where it would sit. Take the delta's index, name the preceding item on the empty
side from the page model, and write the caption by hand.

This is the largest single piece of genuine labour in the evidence work. There
is no shortcut and a first draft from DOM ordering is a draft, not an answer.

## Two passes, on purpose

A first-pass anchor chosen from a page model will sometimes crop the wrong
thing: too tight, wrong ancestor, insertion point off by one. Designing a second
pass in is cheaper and more honest than a longer first pass. Mark a frame
`reframe: true` and only those are re-shot.

**A prediction to hold this design to:** across the gated findings, frames
marked `none` should be close to zero. More than two or three means the anchors
are wrong, not the findings.

## What you never do

- **Never let a picture change under a pending ruling without saying so.** Each
  curated frame records the sha256 of the image it was curated against. A
  changed hash renders a *changed since curation* ribbon and lists the finding
  in the drift panel at the top of the page. This is the most important rule
  here: pixels changing under a decision someone is about to make is the failure
  mode that would discredit the whole report.
- **Never iframe the archived HTML.** Its external assets are absent and the
  layout would be a lie.
- **Never collapse a one-sided pair to a single column.** Both slots keep equal
  width and the empty one says what is missing and why. An asymmetric layout
  reads as "there is nothing on that side", which is a different claim.
