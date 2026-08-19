# What a DR1 finding is, and the file that carries one

One finding, one file, under `findings/`. A deterministic tool assembles them
into `backlog.json`; nothing writes that file by hand.

This exists so twelve agents working on twelve slices produce one backlog rather
than twelve dialects of one.

## The rule above all the others

**You are comparing functionality, not code.** DR1 is the signed-off definition
of this service. Where the frontend differs from DR1 the frontend is wrong,
unless the finding itself is mistaken.

A finding says:

> DR1 asks the user to choose a document type; the frontend infers it from the
> filename.

A finding never says:

> `routes.js:9014` differs from `controller.js:130`.

If a finding's substance is a code difference, it is not a finding. Drop it.

Code references are supporting context, and they are not symmetrical.
Frontend-side references earn their place: they tell whoever does the work where
it lands. Prototype-side references are mostly noise. On the previous run 416 of
819 citations pointed into throwaway prototype code and consumed most of the
citation effort. Cite the prototype once, to show where the requirement is
stated. Do not cite it eight times.

## Findings are born as work

There is no ruling to wait for. The design is settled. A finding is accepted
work the moment it is written and verified.

The only thing that can block a finding is doubt about whether the finding is
**correct** — never doubt about whether the change is **wanted**.

## The file

`workareas/shared/dr1-parity/findings/<slice>--<slug>.json`

```json
{
  "slice": "documents",
  "title": "One sentence. What a user can see or do differently. No file paths.",
  "domain": "documents",
  "type": "add-field",
  "band": "frontend-work",
  "confidence": "high",
  "screens": ["fe-documents-empty", "dr1-upload-documents"],
  "controls": ["accompanyingDocumentType"],
  "finding": {
    "frontend": "What the frontend does today, as a user meets it.",
    "prototype": "What DR1 asks for, as a user meets it.",
    "difference": "What has to change, and what it depends on.",
    "falsifiedBy": "The single observation that would prove this finding wrong."
  },
  "evidence": {
    "frontend": "src/server/app/.../template.njk:31-58",
    "prototype": "app/views/upload-documents.html:116-129"
  },
  "relatedTo": [
    { "id": "documents--file-size-limit", "relation": "travels-with", "why": "…" }
  ],
  "carriedFrom": "inc-013"
}
```

### Field by field

**`slice`** — the slice you were given. One word, kebab-case.

**`title`** — one sentence, and it must survive being read on its own in a list
of ninety. Name both sides in it where you can: "DR1 asks X; the frontend does
Y." No file paths, no line numbers, no code identifiers unless the identifier is
the user-facing string itself.

**`domain`** — the part of the service: `dashboard`, `hub`, `origin`,
`commodities`, `identification`, `addresses`, `contact`, `transport`,
`documents`, `review`, `service-wide`.

**`type`** — what shape of work it is, from this list only:
`add-page`, `add-section`, `add-collection`, `add-field`, `obligation-change`,
`flow-change`, `copy-change`.

**`band`** — one of exactly three:

| band | what it means |
|---|---|
| `frontend-work` | The fix is in the frontend and nothing blocks it. Most findings. |
| `needs-backend` | An API, contract or persistence change has to land first. |
| `disputed` | The finding's own correctness is in doubt, or DR1 contradicts itself here. |

`disputed` is not "we might not want this". Desirability is settled. Use it only
when you cannot establish that the finding is true, and say in `difference`
exactly what would settle it.

**`confidence`** — `high`, `medium` or `low`. `high` means you read both sides'
evidence and the claim is observable in the pictures or the rendered HTML.
`medium` means you read source but could not observe the outcome. `low` should be
rare; prefer `disputed` with a stated question.

**`screens`** — the corpus screen ids the finding attaches to, frontend side
first. Only ids that exist in the manifests. A finding with no screen is a
finding nobody can look at.

**`controls`** — the control the finding is about. This drives the element crop,
so a whole-page shot does not stand in for a finding about one field. **Name it.
Never leave the tool to infer it from your prose.** Empty array only when the
finding is genuinely about the whole page — and `tim parity anchors` prints every
increment that named nothing, so an empty array is a stated choice rather than an
omission nobody sees.

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
"Further investigation" is not a falsifier.

**`evidence`** — one path per side, the primary one. `frontend` is repo-relative
from `repos/trade-imports-animals-frontend/`. `prototype` is repo-relative from
the prototype checkout, and for DR1 it is a **root** view — `app/views/x.html`,
never `app/views/design-release-2.1/x.html`.

**`carriedFrom`** — the `inc-NNN` id in the previous DR2.1 run this finding
derives from, or omit. Check `carryover.json` before writing anything: carrying a
finding over is cheaper than re-deriving it, and striking one is cheaper still.

## How to write a citation so it resolves

A citation is a path followed by a line or a line range, written inline in the
prose: `src/server/app/shared/layout.njk:41-53`. A deterministic extractor finds
those tokens and turns each into a permalink and a code snippet at the pinned
commit. You do not write markers; the tool writes them.

**Always write the full repo-relative path.** On the previous run 391 of 516
in-prose references were bare basenames — `copy.en.js:6` — and the extractor
refuses to guess which of the twenty-one files called `copy.en.js` you meant. It
queues those for a human instead, with the reason printed. A queued citation is
a person's evening; a full path costs you nothing.

- Frontend: `src/server/app/…` — repo-relative, from the frontend checkout root.
- Prototype: `app/views/…` or `app/routes.js:NNNN` — repo-relative, from the
  prototype checkout root, and for DR1 always a **root** view.

A bare `:NN` continuation resolves against the file named earlier in the same
sentence. That works, but only within a sentence, so do not start a new sentence
with one.

## What is not a finding

- A difference between DR1 and DR2.1. Only the frontend is on trial.
- Anything about germinal products, templates, amend, copy-as-new or delete.
  None of them exists in DR1. If the frontend has one of them, that is an
  `onlyFrontend` observation, not a defect — say so once, in the slice covering
  those screens, and move on.
- A styling difference the Prototype Kit causes and the real service cannot:
  the prototype runs the kit's own layout. Compare what is asked for, not the
  chrome around it.
- The arrival date's exact value. It has a moving valid window derived from
  `new Date()`, so its pixels change day to day. Compare the field, never the
  date in it.

## Splitting and merging

One finding, one change a person could make. If your sentence contains "and
also", you have two findings.

The exception is a finding whose whole point is that a page is missing or a whole
block of content is absent. Do not shard those into one finding per field — that
produces forty findings nobody can schedule. One `add-page` finding, with the
missing content enumerated inside `finding.prototype`.

## Verification

A different agent verifies than wrote, and the question it answers is **"is this
finding correct"**, never "do we want it". A verifier that cannot falsify a
finding leaves it alone.

A verifier that finds an error adds `finding.correction` — what was claimed, what
is actually true, and how it was checked. Where the claim is simply wrong, fix
the slot **and** record the correction: the record of what was claimed is worth
more than a clean-looking file. Where the claim stands but is overstated,
understated or mis-cited, leave the slot and say so in the correction. Where the
finding does not survive at all, set `"band": "disputed"` and say in
`difference` what would settle it.

## Two rules about the file itself

**Verify before the first ingest.** `tim parity ingest` composes `detail` from the
four prose slots the first time it sees a finding, and `detail` is frozen from
that moment — it is the only oracle proving a later language pass lost nothing. A
re-ingest that would change an existing `detail` refuses and names the increment.
So the four slots must be right before the first ingest; afterwards they move only
through `tim parity set-slot`, and `correction` is the slot that stays open.

**Do not rename a finding file.** The increment id is bound to the file name. A
rename reads as "old finding struck, new finding added", the id changes, and any
ruling or citation attached to the old id is orphaned.
