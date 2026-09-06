# Handover — high-risk plants requirements digest

Copy the block below into a fresh session.

---

Run the **journey-builder** skill in **digest mode**, then **backlog mode**, for the
high-risk plants journey. Target id `high-risk-plants-frontend`. Raise a ticket under
epic **EUDPA-407** and use it as the run id.

Follow `.claude/skills/journey-builder/SKILL.md`. It already defines the workarea
layout, the spec worktree, the per-source extractor fan-out, the reconciler,
`spec-lint.sh`, the spec gate and `backlog-generate.sh`. Read it and work inside it —
do not reinvent the process.

**This is requirements gathering, not building.** Stop at a gated spec and an ordered
backlog. Do not run build mode.

**The analysis is yours to do.** The plumbing is ready and the sources are wired up, but
nobody has read them properly yet. Go big: work every source exhaustively. This is a
large, expensive programme and a thin spec costs far more later than the tokens do now.

## Scope

**High-risk plants only. NOT CHED-PP.** They are different things. The corpus under
`workareas/trace-requirements/ched-pp/` has been explicitly ruled out — do not read it,
and do not let it back in by any route.

## Sources — already declared in `targets.json`

`prepare-digest.sh` stages all seven. Priority when they disagree runs top to bottom;
record every disagreement as a conflict rather than picking silently.

| Source | Type | What it is |
|---|---|---|
| `phnns-policy` | document | **Primary.** The policy paper, `.docx` |
| `confluence-user-needs` | confluence | **Primary.** Page 6518997286 |
| `confluence-requirements` | confluence | **Primary.** Page 6518997274 |
| `mural` | images | **Primary.** Mural screenshots |
| `prototype` | repo | Secondary. `GB-notification-service` |
| `live-animals` | repo | Secondary. Read for *consistency*, not requirements |
| `skeleton` | code | The plants engine and its empty set |

Two things I confirmed but deliberately did not analyse for you:

- The `.docx` is not readable in place. `unzip -p <file> word/document.xml`, then strip
  tags — marking `</w:p>`, `</w:tr>` and `</w:tc>` boundaries first, or the whole
  document collapses onto one line and every table is lost. It has prose sections and
  six annexes.
- The prototype is near-empty on plants: a handful of incidental "phytosanitary"
  mentions and nothing else I could find. Confirm that yourself, then move on — do not
  force value out of it.

`SOURCE_EXTRACTOR.md` has no per-source section for any of these. **Writing one is the
first job of each extractor**: open the source, work out its actual structure, write
that down as a new section, then extract against it. Characterise first, extract second
— inferring a document's shape from the parts you happen to hit is how a spec acquires
invented requirements.

## Before you start

1. **Both plants repos should be on `main`.** I left them there, but check.
2. **The `mural` source currently points at the whole requirements folder**, so it picks
   up the `.docx` and a `.DS_Store` alongside the screenshots. Either move the images
   into their own subdirectory and narrow the ref, or have the extractor ignore
   non-images. Tidy it rather than working around it.

## Constraints on the spec and backlog

**Consistency with live-animals, without sharing.** Where high-risk plants needs a screen
or value live-animals already has, copy the live-animals shape — same page structure,
same field semantics, same copy where it genuinely says the same thing — so the two
journeys feel like one service. **Do not centralise, extract or share it.** Feature
folders are independent by design: declare the duplication and move on. Where a
same-named concept carries different constraints in plants, it diverges — say so, and
say why.

**Tag every obligation** `same-as-animals`, `variant-of-animals` or `plants-only`, with a
pointer to the animals obligation for the first two. That is what makes the consistency
rule checkable rather than aspirational.

**Bilingual throughout.** Every page needs `copy.en.js` and `copy.cy.js`,
structure-identical — `copy-parity.test.js` enforces it. Welsh is part of an increment,
not a follow-up.

**Tested throughout.** Each increment carries its unit tests and its in-repo `fit`
Playwright spec. Journey-level coverage goes in `trade-imports-animals-tests` as a fourth
Playwright project alongside `e2e`, `admin` and `ins`, with page objects under
`page-objects/plants/`. Make those explicit backlog increments — not someone else's job.

**The plants repos are a first pass.** Anything you find wrong, missing or half-done goes
in this backlog as a fix increment rather than being worked around. Known already:
`npm run lighthouse` cannot start (missing `scripts/lighthouse/audit-targets.js` and
`seed-notification.js`); CI is short of the animals set (no FIT job, SonarCloud
commented out, no `publish-arm64`); Dependabot not enabled; the backend's
reference-number prefix is deliberately absent pending the agreed plants type code.

Two tripwires are already armed in the frontend: `copy-convention.test.js` and
`copy-parity.test.js` fail the moment the set owns its first feature, naming the
per-feature checks to restore. Expect them, and put restoring those checks in the
backlog against the first feature increment.

**Order the finished backlog in journey order** — start of journey to end — so it builds
up logically rather than bouncing between unrelated parts of the service. The generator
orders by spec section, so get the section order right in the spec and the backlog
follows.

## Finish

Present at the spec gate as the skill describes: the uncommitted worktree diff, lint
counts, conflicts, modelGap markers, and the live-animals relationship tags. Then
generate the backlog and present its shape. Stop there.

`backlog-generate.sh` now refuses to drop increments it cannot re-derive — if it does,
read what it names before reaching for `--force`.
