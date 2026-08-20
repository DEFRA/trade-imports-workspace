# What a DR1B finding is, and the file that carries one

One finding, one file, under `findings/`. A deterministic tool assembles them
into `backlog.json`; nothing writes that file by hand.

This is **`dr1b`'s** contract. It governs an independent second reading of the
same comparison `dr1` already made, over byte-identical evidence.

## The firewall, and it matters more than anything else here

**Do not read `workareas/shared/dr1-parity/` or
`workareas/journey-builder/EUDPA-328-DR1/`. Not the backlog, not the findings,
not the handover, not the pairing, not the report.**

This run exists to be compared against that one. Its whole value is that it was
produced without seeing it. An agent that reads the previous answers writes the
previous answers, the comparison then measures nothing, and there is no way to
tell that from the outside afterwards.

There is **no carryover** on this run. That is deliberate and it is the opposite
of the usual instruction: carrying a finding over is normally cheaper than
re-deriving it, and here re-deriving it is the entire job.

If you find yourself about to open a path containing `dr1-parity` or
`EUDPA-328-DR1`, stop. The one exception is
`workareas/shared/dr1-parity/enumerate.cjs`, which lists which screens each
application has and contains no findings.

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
it lands. Prototype-side references are mostly noise. Cite the prototype once,
to show where the requirement is stated. Do not cite it eight times.

## Findings are born as work

There is no ruling to wait for. The design is settled. A finding is accepted
work the moment it is written and verified.

The only thing that can block a finding is doubt about whether the finding is
**correct** — never doubt about whether the change is **wanted**.

## The file

`workareas/shared/dr1b-parity/findings/<slice>--<slug>.json`

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
    "falsifiedBy": "The single observation that would prove this finding wrong.",
    "verification": "Written by the verifier, never the author. See Verification."
  },
  "evidence": {
    "frontend": "src/server/app/.../template.njk:31-58",
    "prototype": "app/views/upload-documents.html:116-129"
  },
  "relatedTo": [
    { "id": "documents--file-size-limit", "relation": "travels-with", "why": "…" }
  ]
}
```

There is no `carriedFrom` on this run. See the firewall.

### Field by field

**`slice`** — the slice you were given. One word, kebab-case.

**`title`** — one sentence, and it must survive being read on its own in a list
of ninety. Name both sides in it where you can: "DR1 asks X; the frontend does
Y." No file paths, no line numbers, no code identifiers unless the identifier is
the user-facing string itself.

**`domain`** — the part of the service: `dashboard`, `hub`, `origin`,
`commodities`, `identification`, `addresses`, `contact`, `transport`,
`documents`, `review`, `service-wide`.

**`type`** — from this list only: `add-page`, `add-section`, `add-collection`,
`add-field`, `obligation-change`, `flow-change`, `copy-change`.

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
`medium` means you read source but could not observe the outcome. `low` should
be rare; prefer `disputed` with a stated question.

**`screens`** — the corpus screen ids the finding attaches to, frontend first.
Only ids that exist in the manifests. A finding with no screen is a finding
nobody can look at.

**`controls`** — the control the finding is about. This drives the element crop,
so a whole-page shot does not stand in for a finding about one field. **Name it.
Never leave the tool to infer it from your prose.** Empty array only when the
finding is genuinely about the whole page.

- `"reasonForImport"` — a bare string with no whitespace is a field `name`.
- `"Save and continue"` — a bare string with whitespace is a visible label.
- `{ "kind": "field", "name": "q" }` / `{ "kind": "label", "text": "Search" }`
  — say which where either reading is plausible.

Two things that will never crop: a whole page title used as a label, and a word
that only appears as a field's `name` when you meant the button.

**`finding.frontend` / `finding.prototype`** — what each side does, as a user
meets it. Present tense. Cite with a bare `path:line` token where it helps.

**`finding.difference`** — the work. What has to change, in what order, what it
depends on. Whoever picks the ticket up reads this first.

**`finding.falsifiedBy`** — the single observation that would prove the finding
wrong. One thing a person could go and look at. "Finding a document-type select
rendered from a shared partial" is good. "Further investigation" is not.

**`finding.verification`** — written by the verifier, never the author.
**A finding without one cannot be ingested.** See Verification.

**`evidence`** — one path per side, the primary one. `frontend` is repo-relative
from `repos/trade-imports-animals-frontend/`. `prototype` is repo-relative from
the prototype checkout, and for DR1 it is a **root** view — `app/views/x.html`,
never `app/views/design-release-2.1/x.html`.

## How to write a citation so it resolves

A path followed by a line or a range, inline in the prose:
`src/server/app/shared/layout.njk:41-53`. A deterministic extractor turns those
into permalinks and code snippets. You do not write markers; the tool does.

**Always write the full repo-relative path.** A bare basename is refused, not
guessed — twenty-one files in this corpus share the name `copy.en.js` — and it
is queued for a human instead. A queued citation is a person's evening.

- Frontend: `src/server/app/…`
- Prototype: `app/views/…` or `app/routes.js:NNNN`, always a **root** view.

A bare `:NN` continuation resolves against the file named earlier **in the same
sentence**. Never open a sentence with one.

## What is not a finding

- A difference between DR1 and DR2.1. Only the frontend is on trial.
- Anything about germinal products, templates, amend, copy-as-new or delete.
  None of them exists in DR1. If the frontend has one, that is an `onlyFrontend`
  observation, not a defect — say so once, in the slice covering those screens.
- A styling difference the Prototype Kit causes and the real service cannot: the
  prototype runs the kit's own layout. Compare what is asked for, not the chrome
  around it.
- **The arrival date's exact value.** It has a moving valid window derived from
  `new Date()`, so its pixels change day to day. Compare the field, never the
  date in it.
- **The generated notification reference.** Minted per run and printed in the
  Draft tag on nearly every frontend journey page. It is masked in the captured
  DOM; do not write a finding about the mask.

## Splitting and merging

One finding, one change a person could make. If your sentence contains "and
also", you have two findings.

The exception is a finding whose whole point is that a page or a whole block of
content is absent. Do not shard that into one finding per field — it produces
forty findings nobody can schedule. One `add-page` finding, with the missing
content enumerated inside `finding.prototype`.

## Verification

A different agent verifies than wrote, and its question is **"is this finding
correct"**, never "do we want it".

**Every finding gets a `finding.verification` line, including the ones that
survive untouched.** One line: what the verifier opened, what it ran, then
`CORRECT` or the rubric points that failed with the evidence quoted. A
correction leaves a trace when it fires and the non-firing case leaves none, so
without this line nothing distinguishes a verifier that found nothing from one
that looked at nothing. `tim parity ingest` refuses a finding that has none.

A verifier that finds an error adds `finding.correction` — what was claimed,
what is true, how it was checked. Where the claim is simply wrong, fix the slot
**and** record the correction. Where the claim stands but is overstated,
understated or mis-cited, leave the slot and say so. Where the finding does not
survive at all, band it `disputed` and say what would settle it.

## Two rules about the file itself

**Verify before the first ingest.** `tim parity ingest` composes `detail` from
the four prose slots the first time it sees a finding and freezes it from that
moment — it is the only oracle proving a later language pass lost nothing.
Afterwards the slots move only through `tim parity set-slot`.

**Do not rename a finding file.** The increment id is bound to the file name. A
rename reads as "old finding struck, new finding added" and orphans every ruling
and citation attached to the old id.
