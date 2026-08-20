# What a {{CORPUS_TITLE}} finding is, and the file that carries one

One finding, one file, under `findings/`. A deterministic tool assembles them
into `backlog.json`; nothing writes that file by hand.

This is **`{{CORPUS}}`'s** contract. Every comparison writes its own, in its own
workarea, because the band table, the domain list, the evidence path roots and
the exclusions below are all properties of this comparison.

**Six sections below are marked PER-CORPUS and are wrong until somebody edits
them.** They were seeded from a template and describe no comparison in
particular. Read `workareas/shared/dr1-parity/FINDING-CONTRACT.md` as the worked
example — it is a real one, filled in — then write these six for this
comparison and delete every marker:

1. The band table
2. The domain list
3. The two evidence path roots
4. The requirements side's view-path rule
5. What is not a finding
6. The volatile values this comparison must never compare

This exists so that ten agents working on ten slices produce one backlog rather
than ten dialects of one. **It has to be finished before the first agent
starts.**

## The rule above all the others

**You are comparing functionality, not code.** {{REQUIREMENTS_LABEL}} is the
definition of this service. Where {{IMPLEMENTATION_LABEL}} differs from it,
{{IMPLEMENTATION_LABEL}} is wrong, unless the finding itself is mistaken.

A finding says:

> {{REQUIREMENTS_LABEL}} asks the user to choose a document type;
> {{IMPLEMENTATION_LABEL}} infers it from the filename.

A finding never says:

> `routes.js:9014` differs from `controller.js:130`.

If a finding's substance is a code difference, it is not a finding. Drop it.

Code references are supporting context, and they are not symmetrical.
Implementation-side references earn their place: they tell whoever does the work
where it lands. Requirements-side references are mostly noise. On one previous
run 416 of 819 citations pointed into throwaway prototype code and consumed most
of the citation effort. Cite the requirements side once, to show where the
requirement is stated. Do not cite it eight times.

## {{DISPOSITION_HEADING}}

{{DISPOSITION_BODY}}

## The file

`{{WORKAREA}}/findings/<slice>--<slug>.json`

```json
{
  "slice": "{{EXAMPLE_SLICE}}",
  "title": "One sentence. What a user can see or do differently. No file paths.",
  "domain": "{{EXAMPLE_SLICE}}",
  "type": "add-field",
  "band": "{{FIRST_BAND}}",
  "confidence": "high",
  "screens": ["{{IMPLEMENTATION_PREFIX}}example", "{{REQUIREMENTS_PREFIX}}example"],
  "controls": ["accompanyingDocumentType"],
  "finding": {
    "frontend": "What {{IMPLEMENTATION_LABEL}} does today, as a user meets it.",
    "prototype": "What {{REQUIREMENTS_LABEL}} asks for, as a user meets it.",
    "difference": "What has to change, and what it depends on.",
    "falsifiedBy": "The single observation that would prove this finding wrong.",
    "verification": "Written by the verifier, not the author. See Verification below."
  },
  "evidence": {
    "frontend": "{{IMPLEMENTATION_EVIDENCE_ROOT}}/.../template.njk:31-58",
    "prototype": "{{REQUIREMENTS_EVIDENCE_ROOT}}/.../page.html:116-129"
  },
  "relatedTo": [
    { "id": "{{EXAMPLE_SLICE}}--other-finding", "relation": "travels-with", "why": "…" }
  ],
  "carriedFrom": "inc-013"
}
```

The two prose slots are called `frontend` and `prototype` whatever this
comparison's sides are named. They are the implementation side and the
requirements side in that order.

### Field by field

**`slice`** — the slice you were given. One word, kebab-case.

**`title`** — one sentence, and it must survive being read on its own in a list
of ninety. Name both sides in it where you can. No file paths, no line numbers,
no code identifiers unless the identifier is the user-facing string itself.

<!-- PER-CORPUS 2 of 6: the domain list. Replace with the parts of THIS service.
     One word each, kebab-case. They are how the report groups findings, so a
     list that does not match the service produces a report nobody can scan. -->
**`domain`** — the part of the service, from this list only:
`TODO`, `TODO`, `TODO`, `service-wide`.

**`type`** — what shape of work it is, from this list only:
`add-page`, `add-section`, `add-collection`, `add-field`, `obligation-change`,
`flow-change`, `copy-change`.

<!-- PER-CORPUS 1 of 6: the band table. These ids come from this corpus's
     bands[] in tools/parity/corpora.json and the two must agree exactly — a
     finding whose band matches no declared band renders under "Not in a band".
     Rewrite the "what it means" column for this comparison. -->
**`band`** — one of exactly these:

{{BAND_TABLE}}

**`confidence`** — `high`, `medium` or `low`. `high` means you read both sides'
evidence and the claim is observable in the pictures or the rendered HTML.
`medium` means you read source but could not observe the outcome. `low` should
be rare; prefer a disputed band with a stated question.

**`screens`** — the corpus screen ids the finding attaches to, implementation
side first. Only ids that exist in the manifests. A finding with no screen is a
finding nobody can look at.

**`controls`** — the control the finding is about. This drives the element crop,
so a whole-page shot does not stand in for a finding about one field. **Name it.
Never leave the tool to infer it from your prose.** Empty array only when the
finding is genuinely about the whole page — and `tim parity anchors` prints
every increment that named nothing, so an empty array is a stated choice rather
than an omission nobody sees.

Write each entry one of three ways:

- `"reasonForImport"` — a bare string with no whitespace is read as a field's
  `name` attribute.
- `"Save and continue"` — a bare string containing whitespace is read as a
  visible label.
- `{ "kind": "field", "name": "q" }` or `{ "kind": "label", "text": "Search" }`
  — say which when a one-word label or an odd name would be read the wrong way.

**`finding.frontend` / `finding.prototype`** — what each side does, described as
a user meets it. Present tense. Cite with a bare `path:line` token where it
helps; the citation extractor turns those into permalinks.

**`finding.difference`** — the work. What has to change, in what order, and what
it depends on. This is the section whoever picks the ticket up reads first.

**`finding.falsifiedBy`** — the single observation that would prove the finding
wrong. Not a hedge, not a list of caveats: one thing a person could go and look
at. "Finding a document-type select rendered from a shared partial" is good.
"Further investigation" is not.

**`finding.verification`** — written by the verifier, never by the author. See
Verification below. **A finding without one cannot be ingested.**

<!-- PER-CORPUS 3 of 6: the evidence path roots. One path per side, and each
     must be repo-relative from that side's checkout root, or the citation
     extractor cannot resolve it. -->
**`evidence`** — one path per side, the primary one.
`frontend` is repo-relative from `{{IMPLEMENTATION_CHECKOUT}}`.
`prototype` is repo-relative from `{{REQUIREMENTS_CHECKOUT}}`.

<!-- PER-CORPUS 4 of 6: the requirements side's view-path rule. A prototype
     serving several releases resolves the same view name differently per
     release, and a finding citing the wrong release's copy of a view is a
     finding about the wrong document. Say which path is right here, or delete
     this block if this requirements side has only one set of views. -->
> **TODO — the requirements side's view-path rule.** For example, on `dr1`:
> "always a **root** view — `app/views/x.html`, never
> `app/views/design-release-2.1/x.html`."

**`carriedFrom`** — the `inc-NNN` id in the previous run this finding derives
from, or omit. Check `carryover.json` before writing anything: carrying a
finding over is cheaper than re-deriving it, and striking one is cheaper still.

## How to write a citation so it resolves

A citation is a path followed by a line or a line range, written inline in the
prose: `{{IMPLEMENTATION_EVIDENCE_ROOT}}/shared/layout.njk:41-53`. A
deterministic extractor finds those tokens and turns each into a permalink and a
code snippet at the pinned commit. You do not write markers; the tool writes
them.

**Always write the full repo-relative path.** On one previous run 391 of 516
in-prose references were bare basenames — `copy.en.js:6` — and the extractor
refuses to guess which of the twenty-one files called `copy.en.js` you meant. It
queues those for a human instead, with the reason printed. A queued citation is
a person's evening; a full path costs you nothing.

A bare `:NN` continuation resolves against the file named earlier in the same
sentence. That works, but only within a sentence, so do not start a new sentence
with one.

<!-- PER-CORPUS 5 of 6: what is not a finding. This is the section that saves
     the most agent time, and it can only be written by somebody who has looked
     at both sides. Every entry should name a whole class of difference that is
     real and not worth raising, and say why. -->
## What is not a finding

- A difference between {{REQUIREMENTS_LABEL}} and any other release. Only
  {{IMPLEMENTATION_LABEL}} is on trial.
- A styling difference the requirements side's own harness causes and the real
  service cannot. Compare what is asked for, not the chrome around it.
- **TODO — the features the requirements side does not have at all.** Where the
  implementation has one of them, that is a one-sided observation, not a defect.
  Say so once, in the slice covering those screens, and move on.
- **TODO — anything else this comparison has already ruled out of scope.**

<!-- PER-CORPUS 6 of 6: the volatile values. Anything whose pixels or text
     change between two captures of an unchanged page. Compare the field, never
     the value in it. On dr1 this was an arrival date whose valid window is
     derived from new Date(). -->
- **TODO — the volatile values.** For example: a date whose valid window moves
  daily, a generated reference minted per run, a relative timestamp.

## Splitting and merging

One finding, one change a person could make. If your sentence contains "and
also", you have two findings.

The exception is a finding whose whole point is that a page is missing or a
whole block of content is absent. Do not shard those into one finding per field
— that produces forty findings nobody can schedule. One `add-page` finding, with
the missing content enumerated inside `finding.prototype`.

## Verification

A different agent verifies than wrote, and the question it answers is **"is this
finding correct"**, never "do we want it". A verifier that cannot falsify a
finding leaves it alone.

**Every finding gets a `finding.verification` line, including the ones that
survive untouched.** One line saying what the verifier opened and what it ran.
This matters more than it looks: a correction leaves a trace when it fires and
the non-firing case leaves none, so without this line nothing distinguishes a
verifier that found nothing from a verifier that looked at nothing. `tim parity
ingest` refuses a finding that has no such line.

A verifier that finds an error adds `finding.correction` — what was claimed,
what is actually true, and how it was checked. Where the claim is simply wrong,
fix the slot **and** record the correction: the record of what was claimed is
worth more than a clean-looking file. Where the claim stands but is overstated,
understated or mis-cited, leave the slot and say so in the correction. Where the
finding does not survive at all, band it as disputed and say in `difference`
exactly what would settle it.

## Two rules about the file itself

**Verify before the first ingest.** `tim parity ingest` composes `detail` from
the four prose slots the first time it sees a finding, and `detail` is frozen
from that moment — it is the only oracle proving a later language pass lost
nothing. A re-ingest that would change an existing `detail` refuses and names
the increment. So the four slots must be right before the first ingest;
afterwards they move only through `tim parity set-slot`, and `correction` is the
slot that stays open.

**Do not rename a finding file.** The increment id is bound to the file name. A
rename reads as "old finding struck, new finding added", the id changes, and any
ruling or citation attached to the old id is orphaned.
