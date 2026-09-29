# Extract: a Confluence page

A `confluence` source is a page the main session fetched at intake, with
`tim confluence page <id> --json > <workarea>/sources/<page-id>.json`. The `locator` is that file. Read
[`extract.md`](extract.md) first: its rules all hold here.

Never fetch the page again yourself, and never use a Confluence tool. The file is the source, so the verifier reads
the same words you do.

## Reading the file

The file is tim's JSON envelope. The page is under `result`: `result.title`, `result.version` and `result.body`,
which is the page's storage-format HTML.

1. `jq -r '.result.title, .result.version' <file>` for the title and version.
2. `jq -r '.result.body' <file> > <your working file>`, where your prompt names a working folder you may write to,
   then Read that file in pages with `offset` and `limit`.
3. A long body is worth splitting on its headings first: `grep -n '<h[1-4]' <your working file>` gives you the
   section map for `structure`.

## Characterise the page

Write into `structure`: the title and version, the sections in order, every table with its columns, and any
annex, status macro or decision log. Say which sections the `scope` covers.

A table is where a Confluence page keeps most of its detail. Record one claim per row that states a fact, and
say in `ref` which table and row, such as `§4.7 Response times, row "Backend APIs"`.

## What a claim says

- A figure, such as a volume, rate or limit, is quoted with its unit exactly as the page writes it.
- A value the page leaves as TBC, blank or "to be agreed" is a `gap` claim naming what is missing.
- A decision's status matters. A page marked Proposed, Draft or Superseded says so in `structure`, and each claim
  that rests on an unapproved decision says so in `note`.
- An open question the page itself lists is a `gap` claim, quoting the question.
