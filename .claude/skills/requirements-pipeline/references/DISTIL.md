# DISTIL phase

The first phase of the `requirements-pipeline` skill. Sources in, one `backlog.json` out. Every row is a
**requirement** (what, why, acceptance), never a recipe, and a **full-stack slice**, never one layer of one. The
fields are defined in `~/git/defra/trade-imports-workspace/.claude/skills/requirements-pipeline/references/backlog.schema.json`,
and the judgement rules a schema cannot check in `SHAPE.md` beside it: read both before you start. The BUILD phase ([`BUILD.md`](BUILD.md)) builds what this phase writes.

This phase joins pieces that already exist. It does not replace them:

| Step | The existing piece it uses |
|---|---|
| Extract a trace set | `workareas/trace-requirements/<set>/`: the trace-to-requirements workflow's verified per-page specs (`pages/*.json`), `journey-spec.json` and `conflicts.json`. Where a set has not been mined yet, run that workflow first (copy `workareas/trace-requirements/ched-pp/trace-to-requirements.workflow.js` and repoint its paths) |
| Extract a document, Confluence page, image or repo | The method in `.claude/skills/journey-builder/references/SOURCE_EXTRACTOR.md`: characterise first, extract second; `.docx` through `unzip -p`; images one at a time with Read |
| Verify an extract | The trace workflow's Verify phase and parity's rule: a different agent from the author tries to refute every claim |
| Reconcile | The ground rules in `.claude/skills/journey-builder/references/SPEC_RECONCILER.md`: declared precedence, every disagreement recorded, never blocking, provenance on every claim. Not its obligations-model mapping, which is frontend-specific |
| Validate and derive | `tim backlog check`, `tim backlog next` |

Work in the main session as the orchestrator. Each judgement step runs in a subagent; you check what lands on
disk. Never write an extract, a requirement or an increment yourself.

## Rails for every subagent

Paste this block into every prompt:

```
GUARD RAILS: Never use the Grep or Glob tools; use Bash grep/find/jq. One command per Bash call: no &&, ;, |
or cd. Tilde paths (~/git/...) in Bash; absolute paths (/Users/...) in the Read, Write and Edit tools. Never
bare node, never sonar. Write only inside the workarea named below. Headless: never ask a question; decide,
record the decision, keep going.
```

## 0. Intake

Ask for the programme name and the sources only if the user has not given them. Then write
`<workarea>/sources.json` yourself — it is the one file you author:

```json
{
  "programme": "hrp-origin-and-commodity",
  "goal": "One sentence: what is being built, for whom.",
  "repos": { "frontend": "repos/trade-imports-plants-frontend", "backend": "repos/trade-imports-plants-backend", "tests": "repos/trade-imports-animals-tests" },
  "precedence": ["confluence:6518997274", "repo:frontend", "trace:ched-pp"],
  "sources": [
    { "id": "repo:frontend", "kind": "repo", "locator": "repos/trade-imports-plants-frontend", "scope": "the origin and commodity pages, spec/decisions.json", "role": "what exists today and what has already been ruled" },
    { "id": "confluence:6518997274", "kind": "confluence", "locator": "6518997274", "scope": "whole page", "role": "policy: what data must be captured" },
    { "id": "trace:ched-pp", "kind": "trace", "locator": "workareas/trace-requirements/ched-pp", "scope": "pages/country-of-origin.json, pages/variety-of-genus-and-species.json", "role": "how the current service does it" }
  ]
}
```

- `workarea` is `workareas/shared/<programme>/` unless the user names another.
- `precedence` lists sources from most to least authoritative. It decides conflicts. Ask if it is not obvious;
  policy and signed-off design usually beat how an old service happens to behave.
- **The target is always a source.** Add one source per repo in `repos` (kind `repo`, id `repo:<key>`), its
  `scope` the area the goal touches, with the role "what exists today and what has already been ruled". If the
  target keeps a decisions or rulings ledger (such as `spec/decisions.json`), add it to that repo's scope. An
  existing ruling outranks a default the distiller would otherwise invent; place the target in `precedence`
  where the user puts it relative to policy, and ask only if that order is not obvious.
- `scope` narrows a large source. Distil a slice of a big source well rather than all of it thinly.
- Fetch a Confluence page to `<workarea>/sources/<page-id>.json` with
  `tim confluence page <id> --json > <workarea>/sources/<page-id>.json`. Copy a document into `<workarea>/sources/`.

## 1. Extract, one agent per source, in parallel

Spawn one `general-purpose` agent per source (model `sonnet`), all in one message. Each writes
`<workarea>/distil/extract/<source-slug>.json`:

```json
{
  "source": "confluence:6518997274",
  "structure": "What the source is and how it is laid out, found before extracting.",
  "claims": [
    {
      "id": "conf-001",
      "statement": "An importer of potatoes gives the proposed place of landing.",
      "kind": "data | behaviour | rule | copy | integration | constraint | non-functional",
      "ref": "section, heading, table row, page file or line",
      "quote": "The source's own words, verbatim.",
      "confidence": "verbatim | inferred | gap"
    }
  ]
}
```

The extractor prompt says:

- Characterise the source first and write `structure` before any claim (SOURCE_EXTRACTOR.md, "Characterise
  first, extract second").
- One claim per observable fact. A statement a user, operator or other system can observe — never a file,
  class or function.
- `quote` is the source's words. `inferred` means you read it between the lines, so say why in the statement.
  `gap` means the source should say something and does not.
- A trace set is already mined: read its `pages/*.json` in scope and its `conflicts.json`, and take only what
  survived its own verification. The trace workflow's verifier writes its corrections back into
  `pages/*.json`; a set that also has `verify-verdicts.json` (such as `iuu`) records which pages it faulted. Its `acceptanceCriteria` in `backlog.json`
  are not a source: they are an earlier distillation.
- A target repo is read for what it does today: each claim is current observable behaviour or an existing
  ruling (quote the ruling's id and words), and `ref` is the file and line. Files are fine as provenance here;
  the statement still describes what a user or system observes.
- Record what the source says. Do not reconcile with other sources and do not resolve ambiguity.

## 2. Verify, one different agent per extract, in parallel

For each extract, spawn a fresh agent (model `sonnet`) that did not write it. It reads the source and the
extract, tries to refute each claim, and writes `<workarea>/distil/verify/<source-slug>.json`:

```json
{ "source": "confluence:6518997274", "verdicts": [ { "id": "conf-001", "holds": true, "reason": "…" } ], "missed": [ { "id": "conf-005-m1", "statement": "…", "kind": "…", "ref": "…", "quote": "…", "confidence": "…" } ] }
```

Each `missed` entry is a claim object in the extract's shape, its id the nearest claim's id plus `-m1`, `-m2` ….
Default to refuted unless the quote is in the source and the statement follows from it. Then check on disk:
every claim has a verdict (`jq`). A claim that does not hold is dropped; a missed claim is added.

## 3. Reconcile and cross-reference, one agent

One agent (model `opus`) reads `sources.json`, every extract and every verify file, and writes:

`<workarea>/distil/requirements.json`:

```json
{
  "requirements": [
    {
      "id": "req-001",
      "statement": "The importer gives the country the plants originate from.",
      "why": "Policy needs it for risk assessment.",
      "claims": ["conf-012", "trace-004"],
      "status": "adopted | question | out-of-scope",
      "delta": "new | change | exists",
      "deltaNote": "For change: how today's behaviour differs. For exists: the target claim that already meets it",
      "conflicts": ["c-001"]
    }
  ]
}
```

`<workarea>/distil/conflicts.json`:

```json
{
  "conflicts": [
    {
      "id": "c-001",
      "about": "Whether a country of origin is asked once per consignment or per commodity line",
      "positions": [ { "source": "trace:ched-pp", "says": "…", "claim": "trace-004" } ],
      "resolution": "precedence | question",
      "outcome": "What was adopted, and why",
      "question": "For a question only: the question for Sam, one sentence",
      "default": "For a question only: what will be built if nobody answers"
    }
  ]
}
```

The reconciler prompt says:

- Merge claims that say the same thing from different sources into one requirement citing all of them. That
  is the cross-reference: a requirement backed by two sources is stronger than one, and the report says so.
- Every disagreement becomes a conflict. Where `precedence` settles it, adopt the winner and record it; never
  block on it. Only a disagreement precedence cannot settle, or a `gap` that matters, becomes a question — and
  every question carries a default, so building can start.
- One question per decision. Never copy one question onto many requirements.
- A requirement the goal excludes is `out-of-scope`, with the reason in `why`.
- Every adopted requirement carries a `delta` against the target's claims: `new` (not there), `change` (there
  but differs; say how in `deltaNote`) or `exists` (already true; cite the target claim).
- A requirement that contradicts an existing ruling in the target is a conflict. Precedence settles it, or it
  becomes a question whose default is to keep the ruling.

## 4. Consolidate, one agent

One agent (model `opus`) turns adopted `new` and `change` requirements into increments in two passes (an
`exists` requirement is already met: it goes in the report, never in an increment, and each acceptance
criterion reads as the change, not a restatement of what is there), then writes
`<workarea>/backlog.json` in the one shape and runs `tim backlog check <workarea-under-workareas> --json` until
it passes. Give the agent the path to `backlog.schema.json`: every field it writes is defined there, and `check`
validates against that file.

- **Pass 1, thin slices.** Group requirements into the thinnest end-to-end behaviours a user or system can
  observe. Each slice spans every repo it needs. Never a slice per layer ("the backend for X", "the tests for
  X"): a slice whose acceptance can only be observed once another slice in a different repo lands is a layer
  split, and is wrong.
- **Pass 2, combine.** Merge related slices where building them separately would repeat the same set-up,
  review and ladder for little gain: the same page or journey step, the same record, the same integration.
  Keep a slice separate where it carries an open question others do not, or would make the increment too
  large to review in one sitting. Aim for increments a reviewer can hold in their head, around three to ten
  acceptance criteria each. Say in each row's `notes` which slices it combines and why.
- Each row: `id` (`inc-001` onwards, in build order), `title`, `detail` (what and why, in plain English),
  `acceptanceCriteria` (observable; each ends with its provenance in brackets, such as
  `(confluence:6518997274 §Notification data; trace:ched-pp country-of-origin)`), `requirements` (the req
  ids it covers), `sources`, `repos`, `kind`, `dependsOn` (a real ordering need only), `status`, and
  `openQuestions` where a question touches it.
- An acceptance criterion never names a file, function, class, CSS class, test file or command (the rules
  in `SHAPE.md`).
- A row touched by an unanswered question is `todo` when its question has a default, with the question in
  `openQuestions` so the builder follows the default and says so. It is `blocked` only when there is no safe
  default to build.
- **Re-distilling over an existing backlog:** keep every existing id, and never change the status of a row
  that is not `todo`. Add new rows with new ids.
- Also put `programme`, `generatedFrom` (the source ids) and `invariants` (rules every increment keeps, once
  each) on the envelope.

Then check it yourself, in the main session:

```bash
tim backlog check <workarea-under-workareas> --json
jq -n --slurpfile r <workarea>/distil/requirements.json --slurpfile b <workarea>/backlog.json '[$r[0].requirements[] | select(.status=="adopted" and .delta!="exists") | .id] - [$b[0].increments[].requirements[]?]'
jq '[.increments[].requirements[]?] | group_by(.) | map(select(length > 1) | .[0])' <workarea>/backlog.json
```

The second must print `[]`: every adopted requirement that is not `exists` is in an increment. The third must print `[]`: none is in
two. If either is not empty, send the consolidator back with the output.

## 5. Report, one agent

One agent (model `opus`) drafts the report from the files on disk and returns it as its reply, between
`----- BEGIN report.md -----` and `----- END report.md -----`. The harness refuses a subagent writing a report
file, so you save the reply to `<workarea>/report.md` unchanged. Decisions come first:

1. **Questions for Sam.** One per open question: the question, the default that will be built if nobody
   answers, which increments it touches, and the sources on each side. Any clash with an existing ruling in
   the target first, then most consequential first.
2. **What precedence settled.** Each conflict decided by precedence, in one line: what won, over what.
3. **Already met.** Each `exists` requirement, in one line, with the target claim that meets it.
4. **The increments.** A table: id, title, acceptance count, repos, depends on, status.
5. **Coverage.** Each source: how many claims, how many held under verification, how many requirements
   they back. Requirements backed by more than one source are called out; so are single-source `inferred` ones.
6. **Out of scope.** What was excluded and why.

Plain English, GDS style: short sentences, active voice. No file dumps.

## Done means

- `tim backlog check` passes.
- Every adopted `new` or `change` requirement is in exactly one increment; every `exists` one is in the report.
- `report.md` leads with the questions.
- Tell the user: the counts, the questions, and how to build it:
  `tim backlog next <workarea-under-workareas>`, then the BUILD phase (`BUILD.md`). For a dry run of one increment's plan,
  run the build loop with `planOnly: true`.
