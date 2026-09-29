# Extract: a ruling

A `ruling` source is a decision from the owner of the work, written up by the main session as a file under
`<workarea>/sources/`, usually named `ruling-<who>-<date>.md`. The `locator` is that file. Read
[`extract.md`](extract.md) first: its rules all hold here.

A ruling is short and is usually ranked first in `precedence`, so it settles conflicts. Every word counts.

## Reading it

The file quotes the ruling verbatim, then lists the claims the main session read from it, numbered. Each names the
report question and conflict it answers, or says it is new (the layout is in `references/DISTIL.md`, section 6). The
verbatim quote is the source. The listed claims are the main session's reading: check each against the quote, and
record it only where the quote supports it.

## What a claim says

- One claim per decision the ruling makes. `quote` is the ruling's own words.
- A listed claim the quote says in so many words is `verbatim`. One the quote only implies is `inferred`, and the
  statement says what in the quote implies it.
- Where the ruling answers a question from an earlier report, say which question and conflict in `note`, such as
  `answers question 3 of the report of 29 September 2026 (c-004)`.
- Where the ruling clearly leaves something open that it touches, record a `gap` claim with an empty quote,
  naming what it leaves open.
- `ref` is the file and the line or list item, such as `ruling-sam-2026-09-29.md claim 2`.
