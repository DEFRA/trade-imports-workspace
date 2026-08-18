# Idea: give the 49 gated decisions visual evidence

Raised by Sam 2026-08-17, before the decision walk started. Not built. Read
this alongside `HANDOVER.md` and `DECISIONS.md` (both on
`feat/EUDPA-328-dr21-parity`).

## The problem

Each decision gated on `sam` in `workareas/journey-builder/EUDPA-328/backlog.json`
carries a written description plus `file:line` evidence on both sides. Sam's
words: *"Descriptions are lovely, but it is difficult."* Ruling on a visual
delta from prose and line numbers alone means reconstructing the page in your
head, one decision at a time, 49 times.

## What to build

Where a decision is visual in nature, attach captured evidence to it —
screenshots of both sides, a Playwright trace, a short video, whatever
communicates the difference fastest — so the ruling can be made by looking.

Constraints and permissions:

- **The tests and harness are not sacred.** Reuse existing traces and specs
  where they already cover the screen. Where they don't, write **new
  illustrative tests whose only job is to generate the evidence** — explicitly
  sanctioned, up to one per decision if that is what it takes.
- **Don't design around what exists today.** If the right answer is a new
  capture harness, build it.
- **The backlog JSON stays the deliverable.** Evidence artefacts hang off the
  backlog entries; any gallery or side-by-side review page is a *generated
  view* of that JSON, never a hand-written document.
- Not every decision is visual. Triage first — copy/label changes and
  structural obligations may be better served by the existing evidence than by
  a screenshot.

## Trap to avoid when capturing

`trace snapshot --eval --filename` writes JSON-encoded output. Decode it before
jsdom sees it, or every class selector silently returns empty while the page
model still looks healthy. This one nearly poisoned the original backlog.

Compare `taskItems` / `summaryRows` / `allFields` — the prototype's spine
screens are bespoke `app-*` markup, not govuk-frontend components, so
`taskLists` / `summaryLists` are empty on that side.
