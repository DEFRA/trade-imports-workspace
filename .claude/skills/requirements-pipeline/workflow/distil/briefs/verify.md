# Verify: one range of one source's claims

You did not write the extract you are checking, and that is the point. Your job is to try to **refute** every claim
in your range against the source itself, and to add what the extract missed in the part of the source your range
covers. Your prompt names the source, the extract, the range of claim ids and the part file you write.

The shape of your part file is defined, field by field, in
`.claude/skills/requirements-pipeline/references/verify.schema.json`. Read it before you write.

## Read the source the extractor read

Read the source's entry in `sources.json`, then the source itself, the same way its kind's extract brief says:
[`extract-repo.md`](extract-repo.md), [`extract-confluence.md`](extract-confluence.md),
[`extract-web.md`](extract-web.md), [`extract-document.md`](extract-document.md),
[`extract-trace.md`](extract-trace.md), [`extract-ruling.md`](extract-ruling.md) or
[`extract-image.md`](extract-image.md). Read the extract's `structure` too: it says how the extractor saw the
source.

The source was extracted in parts, and the extract's claims run in part order. Where your prompt names the parts
your range came from, read their entries in the partition for what each read and had to cover, then read that slice
of the source **in full** yourself. You check every claim against it, and you look for what the extract missed there:
a page, field, option, hint, error, rule or branch in the slice that no claim records.

Your range is small so that you can re-check every claim properly. Read only the claims in your range, with the `jq`
command your prompt gives. Another agent checks the rest.

## A verdict on every claim in your range

For each claim, one verdict: `{ "id", "holds", "reason" }`.

- **Default to refuted.** A claim holds only when its `quote` is in the source at its `ref` (or near it) and the
  `statement` follows from the quote without overreaching.
- A `gap` claim holds when you looked where it says and the source is indeed silent there.
- An `inferred` claim holds when the inference is sound and the statement says why.
- `reason` says what you found: where the quote is, or what the statement claims that the quote does not say.
- A claim that is right but has the wrong `kind` or a loose `ref` still holds. Say so in `reason`.
- Every claim in your range gets exactly one verdict. No verdict for a claim outside your range.

## What the extract missed

Add each claim the source makes, in the part your range covers, that no claim in the extract records. Each is in
the extract's claim shape (`id`, `statement`, `kind`, `ref`, `quote`, `confidence`, optional `note`).

- Its id is the id of the nearest claim **in your range** plus `-m1`, `-m2` and so on, such as `conf-005-m1`. Never
  use a claim outside your range as the base: another verifier owns those ids.
- Check the whole extract with `jq` before you add one, so you never add a claim another range already has.
- Only an extract with no claims at all leaves you no base for an id. Then `missed` is `[]`, and your answer says
  what the extract should have held.
- `[]` when the extract missed nothing.

## Finishing

1. Write your part file with the Write tool, at the absolute path your prompt gives: `source`, then `verdicts`,
   then `missed`. Leave out `extractHash`: the merge records it.
2. Check it in Bash, with the tilde form of the path your prompt gives: `jq '.verdicts | length' <part file>` equals
   the number of claims in your range.
3. Answer with the structured output your prompt asks for.

Never merge parts and never write the source's full verify file. The workflow merges every part once all of them
are written.
