# Gap 1: parity COMPARE/AUTHOR as a requirements distiller

The synthesis (`00-synthesis.md`) reads parity as three things: a renderer (§6.3 items 4 to 6), a ruling tool (`rule-decision.sh`), and a schema (`tim/src/parity/schema.js`, §6.1 item 22). It never reads COMPARE or AUTHOR as what they are: **the most complete multi-agent requirements-gathering pipeline in the workspace, and the only one whose quality controls are enforced by tested tools rather than by prompt reading order.** No analysis file mentions `phase.sh`, `tim parity slices`, `tim parity yield`, `tim parity duplicates` or `carryover` (checked by grep over `analysis/`). The only reference is one line, `e-backlog-corpus.md:416`, which lists "parity AUTHOR → ingest" as one of four row shapes.

This matters for Sam's stated priority, which is quality in requirements gathering. The distiller needs five controls, and parity already has all five, built and tested:

1. fan-out with **proven coverage**
2. **resumable gated phases**
3. a **thin-output detector**
4. a **whole-corpus duplicate sweep**
5. a **per-run contract** that stops N agents writing N dialects

Trace-mining and the digest have none of them in mechanical form. §8.10 calls for the distiller to be "the union of trace-mining and the digest", so it would rebuild weaker versions of all five.

Everything below was read in full at the workspace's current HEAD (`chore/NO_JIRA-requirements-pipeline`).

---

## 1. What exists, piece by piece

### 1.1 The phase ledger: `tools/parity/phase.sh`

**The table** (`phase.sh:29-44`). Each row is `phase|needs|what it is`:

```
setup      ||                The corpus exists … and a finding contract written for this comparison
heads      |setup            Where every application stood when the run began
enumerate  |setup            Each side's screens listed statically from its own source
specs      |enumerate        Playwright specs that … photograph every screen
capture    |specs            Both sides photographed, and coverage reporting nothing missing
pair       |capture          pairs.cjs: which screen answers which, with the one-sided lists
carryover  |pair             The previous corpus triaged: carries, retired, changed or recheck
slice      |pair             The service cut into slices, proven so every captured screen is owned by exactly one
author     |slice,carryover  One authoring agent per slice, each writing findings to the contract
verify     |author           A different agent per slice, asking only whether each finding is correct
dedupe     |verify           The whole corpus read at once for duplicates no per-slice verifier can see
states     |verify           The states the findings were guessing at, photographed in one serial pass
ingest     |verify,dedupe    backlog.json assembled. This freezes every finding's detail permanently
report     |ingest           Anchors, crops, citations, evidence, meta, the rendered page, and the checks
```

**Verbs.** `status`, `start`, `done --note`, `gate`, `reset --note` (`:5-9`).

- `done` refuses while any prerequisite is not `done` (`:145-150`).
- `done` refuses with no note: "A phase recorded with no note is worth very little a week later" (`:151`).
- `gate` exits 1 and names each unmet prerequisite with its description (`:161-173`).
- `status` prints the first unblocked phase that is not done as `Next:` (`:115-140`).

**Why it exists** (`:11-19`). Two orderings are "not style":

- An author spawned before the slicing is proven "writes findings nobody owns".
- An ingest before verification "freezes the prose permanently over whatever was there".

The script also says why it records phases rather than reading them off the disk: "half a slice's findings on disk look exactly like a finished slice" (`:13-14`). **That sentence is the whole argument for a distiller ledger.**

**It works in practice.** `workareas/parity-setup/EUDPA-328-DR1C/pipeline.json` is a complete run with a note on every phase. The notes are the best run narrative in the estate. For example, the dedupe note reads: "The hand sweep past it found one true duplicate, invisible to the tool because both findings sat in one slice… also found four findings that were two… and the subject nobody raised at all: which obligations gate submission." The skill's COMPARE prose (`SKILL.md:119-137`) makes the ledger the resumption mechanism: "a phase marked done that is not is the one failure this whole design cannot recover from."

### 1.2 Coverage proof, part one: did we gather every source item? (`tim/src/parity/coverage.js`)

**Enumerator.** A per-corpus, hand-written, static enumerator module (`enumerate.cjs`, loaded at `coverage.js:25-29`). It says which units a source *has*, read from the source and never from a browser: "an answer that costs nothing and cannot be wrong about a screen it failed to reach" (`:18-20`).

**Diff.** `compareCoverage` (`:75-102`) splits the result into three lists, not two:

- `missing` — enumerated, but never captured
- `states` — captured under an `<page>-<state>` name, attributed to their page mechanically, longest prefix first (`:84-92`)
- `unexplained` — captured, but nothing in the source accounts for it. This is "the only part of this list worth reading line by line" (`:66-68`).

**Honest absence.** A side the corpus declares no capture for gets a `why`, not a zero (`:137-141`). `--strict` exits non-zero while anything is missing (`commands/parity/index.js:584-598`). The SKILL loop (`SKILL.md:205-217`) sends missing screens back as briefs until coverage is clean or each gap is a *stated absence*.

**Distiller mapping.** This is exactly the check a distiller lacks between "characterise each source" and "extract". Each source's characteriser (the digest's `SOURCE_EXTRACTOR` characterise step) should emit an **enumeration of addressable units**: headings, table rows, `h4:/li:n` tokens, trace action ids, screens. A coverage command then proves every unit was either extracted from or explicitly stated as not a requirement. Today `extract-finalize.sh` states "what could not be read" in prose (synthesis §6.1 item 1). Nothing diffs it against what was read.

### 1.3 Coverage proof, part two: every item owned by exactly one slice (`tim/src/parity/slices.js`)

**The file.** `slices.json` is `{slices: [{id, screens[], chrome, note}]}` (`slices.js:33-71`). Every malformed entry is refused by name. The code explains why half-parsing is worse than failing: "a clean set difference over a slice list missing an entry" (`:25-28`).

**`ownership`** (`:121-145`) computes three lists:

- `duplicated` — a screen in more than one slice
- `uncovered` — captured, but in no slice
- `unknown` — named by a slice, but in no manifest

**`sound`** holds only when all three are empty **and exactly one slice has `chrome: true`** (`:233-237`).

**It also prints, without failing:**

- `splitPairs` (`:161-173`): a pair whose two halves sit in different slices, "so each owner reads half a comparison". This is legitimate for many-to-one pairs but "named and left for a person to accept rather than counted and forgotten".
- `oneSided` (`:190-198`): screens only one side has, with their owner. The code distinguishes "covered" from "deliberately assigned": "only one of them is worth making" (`:179-184`).

**The chrome rule** (`SKILL.md:709-717`, `slices.js:200-206`, `renderSlices:279-291`). Ten agents left alone write the phase-banner finding ten times. So one slice owns the cross-cutting furniture and every other slice is told "in as many words" not to raise it. The rule behind it: "**Duplicates cost more than gaps**, so brief for gaps" (`SKILL.md:714-717`).

**Worked example.** `workareas/shared/dr1c-parity/slices.json`: 11 slices over 127 screens. Every slice carries a `note` that briefs its agent. Some notes carry established facts, such as the two one-sided transporter facts in the `transport` note. One carries an explicit open scope question the agent must raise and "do NOT decide": the `address-book` note. The `_comment` block records the tie-break used: "Where a pair crosses a boundary the pair wins."

**Distiller mapping (the most valuable single transfer).** The distiller's cross-cutting requirements are parity's chrome:

- CSRF, auth and session
- Welsh and bilingual content
- accessibility
- error-summary pattern
- GOV.UK layout
- audit and logging
- the "save and come back" behaviour

The synthesis already names the symptom without the cure. F P10: "IUU repeats the CSRF round-trip AC on every page". §5's rule says cross-cutting rules are "header invariants referenced by id, not repeated per row". Parity turns that from advice into a proof: exactly one slice owns the cross-cutting concerns, the tool refuses a slicing without one owner, and `yield`'s `strayed` check (below) reports any slice writing outside its brief.

### 1.4 The thin-output detector: `tim/src/parity/yield.js`

**Thin slices.** `perSlice` (`:69-116`) computes findings per owned screen and flags any slice under `THIN_FRACTION = 0.4` of the median (`:23`). The rationale is the key sentence for any fan-out distiller: "An agent that ran out of context and truncated looks exactly like a slice with little to report, and nothing else in this pipeline tells them apart" (`:16-18`). It "asks rather than rules" (`SKILL.md:856-860`).

**Chrome exemption.** The chrome slice is left out of the median and never flagged, because "its denominator is a lie" (`:95-101`). This fix landed after the tool flagged the one slice doing the most cross-cutting work (commit `baa92e75`).

**`misfiled`** (`:134-161`) finds two failures:

- `homeless`: filed under a slice id that does not exist
- `strayed`: a finding none of whose screens belong to its own slice. This is "the one that produces a duplicate". The chrome slice cannot stray (`:144-149`, commit `c37db0c2`).

**Ingest readiness.** `readyToIngest` requires that the findings exist, none is unverified, none is homeless and none is unreadable (`:210-215`). `--strict` exits non-zero otherwise (`index.js:642-669`).

**It works in practice.** In the DR1C ledger note on `author`, two slices were flagged thin. Coverage auditors were sent: "addresses added 1 and ruled the rest genuine, address-book added 0 and justified why 3 is right for 8 screens."

**Distiller mapping.**

- Per-source extraction: requirements extracted per enumerated source unit, per extractor.
- Per-slice authoring: requirements per owned unit.

In both cases the denominator comes free from 1.2. Trace-mining's critic states coverage in prose (`trace-to-requirements.workflow.js:1369-1376`, `coverageAssessment: string`). It has no per-worker yield and cannot tell a truncated extractor from a quiet source.

### 1.5 The whole-corpus duplicate sweep: `tim/src/parity/duplicates.js` and `DUPLICATE_SWEEPER.md`

**The mechanical pass.** Every pair of findings is judged on three rules (`duplicates.js:168-218`):

- `screen-and-wording`: a shared screen, and title Jaccard ≥ 0.3
- `screen-and-control`: a shared screen and a shared control
- `wording`: Jaccard ≥ 0.6 on different screens. This rule exists because "the same change written up against two different screens is exactly the leak this looks for".

Side names are added to the stopwords, because every title names both sides and would otherwise make every pair look alike (`:88-113`). Candidates are sorted cross-slice first. It "finds candidates and strikes nothing" (`:223-229`).

**The judgement pass** (`DUPLICATE_SWEEPER.md`). This is the "only agent in this pipeline that sees more than one slice" (`:4-5`). Its governing question is:

> **"Would one person, doing one piece of work, close both?"** If yes, they are one finding. If the work splits into two things a person could schedule independently, they are two. (`:55-58`)

Its bookkeeping (`:66-83`):

- Never delete a file.
- Keep the most complete survivor.
- Fold the other's missing content into the survivor.
- Record the absorption in the survivor's `correction`.
- Band the absorbed one as disputed, naming the survivor.
- When unsure, leave both and say so.
- "Never merge two findings across a band boundary" (`:100-102`).
- "Say what you looked at, including when nothing fired" (`:85-94`).

**Distiller mapping: this is the prototype of Sam's second distillation pass.** The sweeper's question and the combine pass's question sit on one scale:

| Pass | Question | Outcome |
|---|---|---|
| dedupe (parity today) | Is this the *same* change? | absorb: one survivor, the other recorded as absorbed |
| combine (Sam's pass 2) | Is this *different* work one person should do together, in one reviewable unit? | group: `members[]`, a survivor carrying the union of outcomes and ACs |

Both need the same inputs:

- the whole atom set at once, which no per-slice worker has
- mechanical candidate generation over shared surface, shared control or field, and similar wording. These are the synthesis §7.8 proxies, and parity already computes the first two.
- one Opus judge
- non-destructive bookkeeping: never delete, record who absorbed what, never cross a band or gate boundary

The EUDPA-409 combination rules (synthesis §6.1 item 17: "never across a gate or milestone", "considered and left alone" list) are the same shape as the sweeper's "never across a band boundary" and "leave both and say so". **The combine pass should be built as a generalisation of `duplicates.js` and `DUPLICATE_SWEEPER.md`, not from scratch.**

### 1.6 The per-run contract: `tools/parity/templates/FINDING-CONTRACT.template.md`

**What it is.** A 261-line template that `scaffold-corpus.sh` seeds into each workarea.

**Six sections are marked PER-CORPUS** "and are wrong until somebody edits them" (`:10-21`):

1. the band table
2. the domain list
3. the two evidence path roots
4. the requirements side's view-path rule
5. what is not a finding
6. the volatile values never to compare

**Rule:** "It has to be finished before the first agent starts" (`:23-25`; `SKILL.md:161-167`). DR1C's filled-in contract is 38 KB.

**Parts that transfer verbatim to a distiller:**

- **"You are comparing functionality, not code… If a finding's substance is a code difference, it is not a finding. Drop it."** (`:29-42`). This is the anti-recipe rule, stated at the point of authoring. It is exactly Sam's "backlog.json is a requirement, not a recipe".
- **Asymmetric citations** (`:44-49`). Cite the requirements side once, "to show where the requirement is stated". Implementation-side references tell the worker where it lands. For a distiller, requirement citations are mandatory ("verbatim or gap") and implementation hints are non-binding.
- **Splitting and merging** (`:217-225`). This is **Sam's pass-1 grain rule, already written**: "One finding, one change a person could make. If your sentence contains 'and also', you have two findings." Plus the exception: a missing page or block is one `add-page` finding with the content enumerated inside it, "not forty findings nobody can schedule".
- **`falsifiedBy`** (`:149-152`): "the single observation that would prove the finding wrong… 'Further investigation' is not." It is the requirement-side twin of an observable acceptance criterion.
- **"What is not a finding"** (`:195-215`): "the section that saves the most agent time, and it can only be written by somebody who has looked at both sides". The distiller's equivalent is a per-run "what is not a requirement" list. That list is where recipes, house style and legacy behaviour are excluded, which F §4.2 wants and has no home for.
- **Verification protocol** (`:227-246`), covered in 1.7.

The synthesis's source-roles idea (§6.1 item 3) and its AC rule (§5) are both per-run policy. They need a per-run contract that is complete before the first agent spawns, and parity already has the scaffold, the template and the "do not spawn until whole" gate.

### 1.7 One author per slice, a different verifier each

**The author** (`FINDING_AUTHOR.md`):

- Reads the contract whole (`:22-28`).
- Reads the pictures and the rendered DOM, not just source: "A finding written from source is a reading, not an observation" (`:30-52`).
- **Checks the brief**: "disproving one is a result, not a problem" (`:54-68`).
- Stays inside its slice (`:70-78`).
- Runs its own falsifier before filing (`:111-113`).
- **Never writes `finding.verification`** (`:142-145`).

**The verifier** (`FINDING_VERIFIER.md`):

- **"You never verify a slice you wrote"** (`:5`).
- Its only question is "is this finding correct", never "do we want it" (`:15-23`).
- A nine-point rubric: markup dressed as behaviour, overstated claim, falsifier *executed*, same-slice duplicate, **missing finding (net +14 on dr1)**, asking the implementation to fix what the requirements side also does, the requirements source contradicting itself (→ disputed), controls that cannot crop, citations landing on the wrong content (`:36-66`).
- Record rules: fix the slot **and** record `correction`. Overstated means leave the slot and record `correction`. Unsalvageable means disputed with a settling observation (`:68-81`).
- **One `verification` line on every finding, including untouched ones**, because "nothing in this pipeline distinguishes a verifier that found nothing from a verifier that looked at nothing" (`:83-108`).

**Mechanical enforcement.**

- `verificationOf` (`ingest.js:82-85`) is the single reader shared by `yield` and `ingest`. The code explains why: "two readings of that would let a finding pass one and fail the other" (`:73-78`).
- On a corpus declaring `requireVerification`, which every scaffolded corpus does, `runIngest` refuses a first ingest of any unverified finding (`ingest.js:584-600`).

**For the report.** `CLAIM_VERIFIER.md` is an eight-question rubric for rewritten prose: counts, absolutes, hedges, verbs, relationships, quoted strings, identifiers, scope. That is synthesis Q38 ("an adversarial reader over the report prose, as parity has?"), and it already exists as a persona.

### 1.8 Workflow-backed AUTHOR: `workareas/shared/dr1c-parity/author-workflow.js`

**Not mentioned anywhere in the synthesis.** DR1C ran author and verify as a Workflow `pipeline()` (`:264-278`): "a slice's findings go to verification the moment that slice finishes authoring, rather than every slice waiting for the slowest" (`:259-263`). The slicing arrives as `args.slices`, proven by `tim parity slices --strict` before launch (`:13-16`).

Parts worth keeping:

- **Structured author return** `FINDINGS_SCHEMA` (`:214-232`):
  - `slugs`
  - **`notRaised`**: "Things noticed and deliberately not raised, with the reason"
  - `premisesDisproved`
  - `firewallClean`
- **"PROMOTE WHAT YOU NOTICE"** (`:144-147`): "The one thing this method has never checked is whether an observation became a finding. Three times an agent wrote a fact into its own notes and never raised it." `notRaised[]` is the mechanical answer. For a distiller it is the list of "noticed, judged not a requirement", which belongs in the report.
- **Verifier return** `VERDICT_SCHEMA` (`:234-257`): a per-finding `stands|corrected|disputed|struck|added`, plus `why`.
- **The chrome brief inlined into each prompt** by the `slice.chrome` flag (`:84-98`).
- **`RUN-BRIEF.md`**: a shared, whole-file preamble that every agent reads first.
  - §1 is a **firewall** listing paths the run must not read, because the personas themselves point at them. "Flagging a deviation is not permission for it" (`RUN-BRIEF.md:28-31`).
  - §7 is "Knowledge already paid for — do not rediscover it".

  The distiller needs both: a firewall when re-distilling independently, and paid-for knowledge on every run.

### 1.9 Carryover triage (AUTHOR step 1, `SKILL.md:667-690`)

**What it is.** One agent, one pass, one file (`carryover.json`). It gives a verdict per previous finding: `carries | retired | changed | recheck`, plus "the mechanism that settles it — the line in the new requirements source that still says what the old finding said it said, or the absence that retires it". An example from `dr1-parity/carryover.json`: `{id, title, verdict, why, dr1Evidence, screens}`.

**Result on dr1.** 97 → 50 carry, 37 retired, 8 changed, 2 recheck, "before an authoring agent was spawned". The rule is: "`carries` is permission to copy the substance across, not the copy itself." `carriedFrom` records lineage.

**Distiller mapping.** This is how a distiller re-runs when a source changes, such as a new Confluence version or a new design release, without regenerating ids or losing rulings. It answers the regeneration fragility the synthesis names (D §2.7, G §8.3) with a proven step, not a guard.

### 1.10 Ingest: stable ids, frozen oracle, refused destruction (`tim/src/parity/ingest.js`)

**Stable ids** (`assignIds`, `:294-328`). Identity is the **source file**, and the id is carried on `increment.source`. "A file that already has an id keeps it, and only a file nobody has seen before takes the next number." This is the "stable ids never renumbered" rule (synthesis §8.6) already built, where `backlog-generate.sh:273-277` renumbers.

**Cross-references by slug** (`resolveRelatedTo`, `:336-388`). Written before ids exist, they are resolved in the same pass. An unresolvable slug is a named error, and so is a self-reference.

**Refused destruction.**

- A finding whose file vanished while it holds a ruling stops the run (`:546-559`).
- `--replace` over rulings is refused (`:526-534`).
- A `detail` change after first ingest is refused and routed to `set-slot` (`:561-582`).

**Distiller mapping.** This is the synthesis's "content-key identity and the lost-increment guard" (§6.1 item 18), in tested form: 35 tests in `ingest.test.js`.

### 1.11 Heads (`tim/src/parity/heads.js`)

`run-heads.json` records every repo's HEAD at run start, and a re-run reports what moved. Four verdicts, deliberately "not one boolean" (`:84-91`). This is the synthesis §7.5 "pin HEAD per repo before read-heavy phases", already built.

**Test weight behind all of the above:**

| Test file | Tests |
|---|---|
| `slices.test.js` | 22 |
| `yield.test.js` | 20 |
| `duplicates.test.js` | 16 |
| `coverage.test.js` | 18 |
| `heads.test.js` | 17 |
| `ingest.test.js` | 35 |

---

## 2. What is parity-specific, broken or weak (do not port as-is)

1. **The unit is a screen from a capture manifest.** `ownership`, `manifestScreensBySide`, `yield.perSlice` and `ingest.validateFinding` all key on `manifest.json` rows (`slices.js:84-101`, `ingest.js:108-119`, `:153-166`). A distiller needs a generic **source-unit id** (`source:<id>/unit:<token>`) emitted by each source's enumerator. The set algebra does not change; only the loader does.
2. **The prose slots are two-sided and named after one comparison**: `PROSE_SLOTS = ['frontend','prototype','difference','falsifiedBy']` (`ingest.js:33-38`, template `:87-89`). A requirement has N sources, so the slots need to be `{statement, sources[{ref, quote}], acceptance[], falsifiedBy}`.
3. **`FINDING_TYPES` are `frontend-change` modes** (`ingest.js:20-28`): `add-page`, `add-field`, `obligation-change` and so on. These are implementation routes inside the requirement. The synthesis already flags this (§6.4, `page.js:15-23`). Do not carry them.
4. **The ledger is weaker than it looks.**
   - It is bash with a hardcoded phase table (`phase.sh:29-44`), so it cannot be reused for another pipeline without copying the script.
   - It lives in `workareas/parity-setup/<run>/pipeline.json`. `workareas/` is gitignored and only `workareas/shared/` is tracked, so the ledger is not reviewable or shareable.
   - **`start` and `reset` do not invalidate downstream phases.** In DR1B's ledger, `specs` is `running` (15:27) while `capture`, `pair`, `slice`, `author`, `verify`, `dedupe`, `ingest` and `report` are all `done` (13:06 to 14:20). The ledger contradicts itself and `status` would report `Next: specs`.
   - `done` checks prerequisites only at the moment it is called.
   - `gate` is advisory: nothing calls it but an agent that has read the SKILL.
   - The ledger records no artefact hash, so "done" cannot be checked against the disk.

   A distiller ledger should be a `tim` command with the phase table as data, stored beside the backlog in a tracked workarea, cascading a reset to dependants, and recording an artefact fingerprint per phase.
5. **`duplicates` defaults to cross-slice only** (`duplicates.js:236-248`, `--all` opt-in). DR1C's dedupe note records the cost: the one real duplicate "sat in one slice and it only compares across slices". Its measure is also lexical only (title tokens, shared ids): "It measures two sentences" (`SKILL.md:882-891`). For a combine pass, compare every pair by default, and add structured signals the requirement schema will carry (shared source unit, shared decision ref, shared `consistentWith`, same repo set).
6. **"A different agent verifies" is not checked.** No author or verifier identity is recorded on the finding. `yield` only checks that the verification line is non-empty. DR1C's `author-workflow.js` lets the verifier write new findings and verify them itself (`:205-207`). The DR1C ledger admits that auditor and gap-closer findings "had no independent verifier" and are marked only in prose. A distiller should record `authoredBy` and `verifiedBy` (agent label plus phase), and refuse equality.
7. **AUTHOR is prose, and its Workflow is a one-off.** `SKILL.md:249` says "Invoke AUTHOR. Do not reimplement it." But AUTHOR is a SKILL section. The only executable version is `workareas/shared/dr1c-parity/author-workflow.js`, which hardcodes the workarea, the run id, the firewall paths and the evidence SHAs (`:18-74`), and lives outside `.claude/workflows/`. It is a proven shape, not a reusable script.
8. **The `yield` threshold assumes a comparable denominator.** Findings per screen suits parity, where every screen can differ. For requirements the denominator should be *source units owned*, and the chrome-style exemption should apply to the cross-cutting slice.
9. **The phase list is capture-heavy.** `specs`, `capture`, `pair`, `states` and `anchors` are comparison mechanics. A loose-requirements distiller keeps `enumerate` (characterise), `slice`, `author`, `verify`, `dedupe`, `ingest` and `report`, and replaces `capture`/`pair` with **extract** and **reconcile**.

---

## 3. What this means for the distiller design

Here is a phase table for the distiller, reusing parity's gating semantics. Parity's own phase is noted where a row reuses it. Items marked NEW come from the digest or trace-mining, or from Sam's two-pass requirement.

```
setup        |                    workarea + REQUIREMENT-CONTRACT whole (parity: setup + contract)
heads        |setup               every repo and source version pinned (parity: heads)
characterise |setup               per source: structure found, unreadable parts, ENUMERATION of units (digest characterise + parity enumerate)
coverage     |characterise        every unit extracted-from or stated-absent (parity: coverage --strict)
carryover    |characterise        previous distillation triaged: carries/retired/changed/recheck (parity: carryover)
slice        |characterise        units cut into slices, exactly-once, ONE cross-cutting owner (parity: slices --strict)
extract      |slice,carryover     one agent per slice writes ATOMS to the contract (parity: author; trace: extract)
verify       |extract             different agent per slice, recorded per atom (parity: verify; trace :850-927)
yield        |verify              thin slices asked; unverified/homeless/strayed = 0 (parity: yield --strict)
reconcile    |yield               conflicts c-NNN, precedence, panel where needed (digest; NEW as a gated phase)
dedupe       |reconcile           whole-set sweep, ALL pairs, one Opus agent (parity: duplicates + DUPLICATE_SWEEPER)
ingest-atoms |dedupe              atoms.json, stable ids by source file, freeze statement (parity: ingest)
combine      |ingest-atoms        pass 2: group atoms into buildable items, members[], considered-and-left-alone (NEW; generalised sweeper)
report       |combine             generated, decision-led; CLAIM_VERIFIER over report prose (parity: report + CLAIM_VERIFIER)
```

**The rules that transfer, as rules:**

1. **Prove coverage before you spawn.** A slicing is refused by a tool, not by reading order.
2. **One owner for everything cross-cutting.** Every other slice is told in as many words not to raise it, and `strayed` catches the ones that do.
3. **Brief for gaps; duplicates cost more.** The recovery for gaps is mechanical (`coverage`, `yield`, the verifier's "missing finding" rubric point). The recovery for duplicates is one agent reading everything.
4. **A verification record on every item**, including untouched ones, enforced at ingest.
5. **Return `notRaised[]` and `premisesDisproved[]` from every extractor**, and render both in the report.
6. **Carry forward, then author.** Striking an old item is cheaper than re-deriving it.
7. **Ids bound to the source file; cross-references by slug.** Never renumber, never delete a file.
8. **The contract is per-run and whole before the first spawn.** Its "what is not a requirement" section is where recipes are excluded by name.

---

## 4. Corrections to the synthesis

1. **§8.10** ("the distiller is the union of trace-mining and the digest") is incomplete. It should read: **the union of trace-mining, the digest, and parity COMPARE/AUTHOR's control plane**. That control plane is `phase.sh` gating, `coverage`, `slices --strict`, `yield --strict`, `duplicates` plus the sweeper, the per-run contract, author/verifier separation with an ingest gate, carryover, and stable-id ingest. Trace-mining and the digest supply extraction method, source roles, provenance tokens, conflicts, the panel and the ledger. **Neither supplies mechanical coverage, yield or a cross-item sweep.**
2. **§6.1 item 21** cites trace `sequencingNotes` "every page appears exactly once" as a distillation invariant. In trace it is a prose note. In parity it is a tested command with a strict exit code (`slices.js:214-263`). Keep the command, not the note.
3. **§7.7 and §7.2** say "fan out extraction (per source) and verification (per slice) only". Parity shows the better cut. **Fan out authoring per slice of the target**, where a slice is a part of the service that owns units from *all* sources, so one agent sees every source's view of that part. Keep one agent for the cross-slice sweep and the combine. Per-source extraction then reduces to characterise-and-enumerate, and anti-pattern A5 still holds because the sweep and the combine are single-agent.
4. **§7.8 and Q13 (combine).** The duplicate sweep is the existing seed of the combine pass: same inputs, same judge shape, same non-destructive bookkeeping, and a question on the same scale ("would one person, doing one piece of work, close both?"). Build pass 2 by generalising `duplicates.js` and `DUPLICATE_SWEEPER.md`, not beside them. Carry DR1C's lesson: compare all pairs, not only cross-slice pairs.
5. **Q38 (report verification)** is answered in part. `CLAIM_VERIFIER.md` is an existing eight-question adversarial rubric for rewritten prose.
6. **§6.3 and §6.1 item 22** treat parity only as a renderer and shapes. Add to the keep list:
   - `author-workflow.js`'s `pipeline()` author→verify shape
   - the `notRaised` and `premisesDisproved` return fields
   - `RUN-BRIEF.md`'s firewall and paid-for knowledge
   - the phase ledger's `needs` table
   - `verificationOf` as the single shared reader

   And fix, as §2 above lists: ledger downstream invalidation, tracked location, author≠verifier identity, all-pairs dedupe, and N-source slots in place of `frontend`/`prototype`.
