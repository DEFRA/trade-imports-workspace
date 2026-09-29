# Extract: the rules for every source

You extract **one** source into **one** file. Your prompt names the source, the file, the claim id prefix and the
commands. This file holds the rules every kind of source shares. The brief for your source's kind, named in your
prompt, adds how to read that kind.

The file's shape is defined, field by field, in
`.claude/skills/requirements-pipeline/references/extract.schema.json`. Read it before you write.

## Characterise first, extract second

Before you record a single claim, work out what the source is and how it is laid out: its sections, tables,
annexes, pages, folders or journey steps. Write that into `structure`. Reading as you go and guessing the shape from
the parts you happen to hit is how an extract gains invented requirements. `structure` also tells the reconciler
how much of the source your extract covers, so say what the source's `scope` let you leave out.

Read the source's entry in `sources.json` first: its `scope` narrows what you read, and its `role` says what the
source is authoritative for. Distil the scoped slice well rather than the whole source thinly.

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

- Use the prefix your prompt gives, then a three-digit number: `<prefix>-001`, `<prefix>-002` and on.
- Ids are unique across the whole workarea, because requirements cite claims by id alone. The prefix exists for
  that.
- Never end an id with `-m` and a number. That suffix is kept for claims a verifier finds missing.
- If your prompt says an extract already exists for this source, keep its prefix and keep the id of any claim
  that still says the same thing. A requirement may already cite it.

## Record, do not reconcile

Record what this source says. Do not compare it with other sources, do not settle a disagreement and do not
resolve an ambiguity. An ambiguity is a claim of its own, or a `note`. The verify and reconcile steps do the rest.

## Never copy a secret

Write `[REDACTED]` in place of anything that looks like a password, token, key or connection string. Never copy
one into a claim, a quote or a note.

## Finishing

1. Write the whole file with the Write tool, at the absolute path your prompt gives. Keep `claims` last.
2. Run the stamp command your prompt gives. It records the source's scope hash in your file, so a later launch
   knows the extract matches the source as `sources.json` describes it. Never compute or type the hash yourself.
3. Run the check command your prompt gives. It exits 1 and names every problem when the file is out of shape. Fix
   each one with Edit or a fresh Write, stamp again if you rewrote the file, and check again until it passes.
4. Answer with the structured output your prompt asks for: how many claims, a line on the structure you found,
   and every decision you made along the way.
