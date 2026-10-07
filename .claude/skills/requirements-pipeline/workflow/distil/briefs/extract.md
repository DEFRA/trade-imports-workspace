# Extract: the rules for every source

You extract **one part** of **one** source into **one** part file. A characterise agent has already cut the source
into parts, each small enough for one agent to read in full. Another agent extracts each other part beside you, and
`tim distil merge-extract` joins every part into the source's one extract. Your prompt names the source, your part,
the file, the claim ids and the commands. This file holds the rules every kind of source shares. The brief for your
source's kind, named in your prompt, adds how to read that kind.

The file's shape is defined, field by field, in
`.claude/skills/requirements-pipeline/references/extract.schema.json`. Read it before you write. A part file has no
`scopeHash`: the merge stamps the extract.

## Your part, and nothing but your part

Read your part's entry in the partition with the `jq` command your prompt gives:

- `scope` is your slice: where it starts and stops. Anything outside it is another part's.
- `read` is everything you read **in full**: every file, folder, page, section or trace it names. Never sample, skim
  or stop at the first few. Read a long file in pages with `offset` and `limit` until you reach its end.
- `covers` is what you must claim, named or counted. It is a floor, not a ceiling: claim everything else your slice
  shows too.

Read the source's entry in `sources.json` as well: its `role` says what the source is authoritative for.

## Exhaustive within the part

Your part is small so that you can claim **all** of it. Every page, heading, field, label, option, hint, error
message, rule, condition, branch, route, link, state, test and integration your slice shows gets a claim. **A page or
field you saw in your slice and did not claim is a defect**: the reconciler can only build what an extract records.
Where `covers` names a count (14 traces, 6 views), your claims account for every one of them.

Before you finish, walk `read` and `covers` once more against your claims, item by item. Anything you cannot find a
claim for, claim now, or record as a `gap` if the slice is silent on it.

## Characterise your part first

Before your first claim, write `structure`: what your part read, how it is laid out, and what it covered. It goes
into the merged extract's structure under your part's title, so the reconciler sees what each part covered. Reading
as you go and guessing the shape from the bits you happen to hit is how an extract gains invented requirements.

## One claim per observable fact

- A claim is something a user, an operator or another system can observe. Never a file, class or function as the
  fact itself. (A repo's claims may still cite a file and line as provenance in `ref`.)
- `statement` is the fact in plain English. One fact. Split "and" into two claims.
- `kind` is one of `data`, `behaviour`, `rule`, `copy`, `integration`, `constraint`, `non-functional`. **`gap` is
  never a kind.** It is a confidence.
- `ref` is where in the source, precise enough for someone else to find it: a section and heading, a table row, a
  page file and key, or a file and line.
- `quote` is the source's own words, verbatim. Do not tidy them. Only a `gap` may leave `quote` empty.
- `confidence`:
  - `verbatim`: the source says it.
  - `inferred`: you read it between the lines. The statement says why it follows.
  - `gap`: the source should say something here and does not. Write the gap down: silence is not evidence of
    absence, and the reconciler can only weigh what you record.
- `note` is optional: anything the verifier or reconciler should know about this claim.

## Claim ids

- New claims use your part's prefix, from your prompt, then a three-digit number: `<prefix>-001`, `<prefix>-002` and
  on. Your prefix is yours alone, so no other part's ids can clash with yours.
- Ids are unique across the whole workarea, because requirements cite claims by id alone.
- Never end an id with `-m` and a number. That suffix is kept for claims a verifier finds missing.
- If your part has `keeps`, those are claim ids from the source's earlier extract that sit in your slice. Read them
  in the earlier extract. Keep each id whose claim still says the same thing: a requirement may already cite it.
  Give a claim that now says something different a new id under your prefix. No other id is yours to use.

## Record, do not reconcile

Record what this source says. Do not compare it with other sources, do not settle a disagreement and do not
resolve an ambiguity. An ambiguity is a claim of its own, or a `note`. The verify and reconcile steps do the rest.

## Never copy a secret

Write `[REDACTED]` in place of anything that looks like a password, token, key or connection string. Never copy
one into a claim, a quote or a note.

## Finishing

1. Write your whole part file with the Write tool, at the absolute path your prompt gives. Keep `claims` last.
2. Run the check command your prompt gives. It checks your part file against the schema and your prefix, and exits 1
   naming every problem. Fix each one with Edit or a fresh Write, and check again until it passes.
3. Never merge the parts, stamp the extract or write the source's extract file. The workflow merges every part once
   all of them are written.
4. Answer with the structured output your prompt asks for: your part, how many claims and how many of them are gaps,
   a line on what your part read and covered, and every decision you made along the way.
