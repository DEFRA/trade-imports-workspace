# DR2.1 parity report v2 — plan

Run: `EUDPA-328-report-v2`. Backlog: `report-v2-backlog.json` beside this file.

The corpus is 97 increments, 49 of them gated on Sam, plus 8 deferred candidates and
1 withdrawn finding. The report exists so those 49 rulings can be made.

---

## 1. What is wrong with the report today

**The decisions are unreadable.** `compare/build-page.js:84` wraps the whole finding in one
`<p>`. The author wrote 2 to 6 paragraphs; HTML collapses them. The median finding is 1,274
characters and the longest is 3,345. There are 516 `file:line` references inside the prose
and 217 backticked identifiers. So the reader gets a wall of text studded with line numbers.

**The evidence is out of reach.** `build-page.js:88-92` renders every citation as inert
`<code>`. There is no link and no snippet, so checking any claim means leaving the page.

**There are no pictures.** `build-page.js` has never contained an `<img>`.

**The page discards the best material it already has.** The upstream findings file
(`workareas/shared/dr21-parity/backlog.json`) holds `detail`, `correction`, `falsifiedBy` and
`verification` as four separate fields. `build-increments.js:100-104` joins three of them into
one string with sentinel markers and drops the fourth. `build-page.js:52-66` then splits the
sentinels back out with `indexOf`. The `verification` field — 97 entries of dense adversarial
prose, the best-written text in the corpus — has never been rendered.

**It also hides work in progress.** 24 notes and 1 ruling sit in the canonical backlog today.
The page renders neither. Regenerating the backlog with `build-increments.js` would overwrite
them, because `:164` rewrites the whole file.

**Some of what it does say is wrong.** `:346` claims "60 of these items were corrected". The
real figure is 39 — the findings file has 60 `correction` keys but 21 of them are empty
strings, which `build-increments.js:102` correctly skips and the page's hardcoded number does
not. `:332-335` claims 103 page models; there are 104 (70 prototype + 34 frontend). `:98`
filters on band alone, so the one withdrawn finding is still presented among "97 verified
items". `:380-381` renders only the first refuted finding and silently loses any second.

**It cannot be regenerated for anything else.** The run id `EUDPA-328` is hardcoded at
`:14-17`, the masthead facts at `:332-346`, the output path at `:439`. `npm run build-page`
needs a `cd` into `compare/`, which an agent cannot type, and bare `node` is denied. A report
no agent can run is not regenerable.

---

## 2. Target state

One command regenerates the whole page from `backlog.json`:

```
tim parity report EUDPA-328
tim parity report EUDPA-328 --open
```

The page is served locally at full resolution. For each finding it shows, in this order:

1. **The decision**, for the 70 gated items — one question, the options where the prose names
   them, what stays blocked if it is not settled, and the exact `rule-decision.sh` argument
   string with a copy control.
2. **Two columns**, frontend left, prototype right, fixed everywhere. 86 of 97 findings
   describe both sides; the comparison is the finding, and it is currently invisible.
3. **Pictures** — a cropped, padded shot of the actual control on each side, side by side, at
   2x device scale, with the full-page shot behind a disclosure.
4. **What differs**, in one or two sentences.
5. **Sources** at the foot of each column: superscript markers in the prose, snippets and
   GitHub permalinks underneath, so a claim is checked without leaving the paragraph.
6. **This finding is wrong if** — the falsifier, always visible, styled as a challenge.
   It is how Sam says no.
7. **How this was checked** — the `verification` prose, collapsed, labelled as a verbatim
   audit record.

Every number on the page is derived from the data. Every card has an id anchor so one finding
can be linked to a colleague. Deferred candidates and withdrawn findings appear in their own
sections, never in the counts.

The published Claude artifact is a derived export of the same generator: crops only, WebP
data URIs, full-page evidence linking back to local paths. It is not the design target.

---

## 3. Decisions taken

### The generator lives in `tim`, not in `tools/parity/` and not in the workarea

`tim parity report|citations|check|counts`. `tim/package.json` already owns vitest, eslint,
prettier, coverage and `TZ=UTC`, and `tim/CLAUDE.md` already mandates test-on-input/output.
No directory under `tools/` has a `package.json`; the only Node there is dependency-free and
untested. CLAUDE.md already says skills should prefer `tim <cmd> --json` once a surface is
covered.

*Rejected: `tools/parity/build-report.js` behind a `.sh` wrapper.* It would stand up a second
vitest/eslint/prettier toolchain for one directory. An untested HTML generator is exactly what
produced the wrong numbers listed in section 1. Note that the argument sometimes made for this —
that only `tim` is allowlisted — is false: `.claude/settings.json:63-64` globs `tools/**` as
well. The toolchain argument is the real one.

*Rejected: leaving it in `workareas/shared/dr21-parity/compare/`.* It is a one-run artefact
that happens to be tracked.

`build-page.js` and its npm script are **deleted** when the replacement lands. Two generators
is worse than one bad one. `pairs.js`, `diff.js`, `diff-all.js`, `build-backlog.js`,
`build-increments.js` and `phase3.workflow.js` stay: they built this corpus once and
`pairs.js` is hand-authored judgement.

Two shell entry points remain in `tools/parity/`, because they genuinely need a `cd`:
`start-parity.sh` (the dispatcher) and `capture-screens.sh`.

### Content is data; presentation is code

The generator never rewrites prose, never invents a number, never guesses a path. If a
decision reads as a blur, the fix lands in `backlog.json`. If evidence is missing, the page
says so.

That splits the work in two, and the two ship independently. The generator must render the
**unmigrated** backlog acceptably on day one, splitting the sentinels exactly as
`build-page.js:52-66` does. That bridge is what lets the report ship before the 97-item
content pass finishes.

### `detail` is frozen forever

Never edited, never deleted, never rewritten. It is the only oracle that proves the structure
pass and the language pass lost nothing. The renderer stops reading it. `backlog.json` roughly
doubles to about 500 KB; that is nothing for a tracked file, and it is what makes every guard
in section 4 work.

### Structured prose goes in `finding.*`, and it comes from a join

Six named slots: `frontend`, `prototype`, `difference`, `correction`, `falsifiedBy`,
`verification`, plus `decisionRequired` and `relatedTo`.

Four of them are a **join, not an LLM pass**. The upstream findings file already holds
`detail`, `correction`, `falsifiedBy` and `verification` separately (verified: 97
`verification`, 97 `falsifiedBy`, 60 `correction` of which 21 empty — the 39 that reached the
canonical file). Only `difference` and `decisionRequired` need authoring.

*Rejected: a `detailStructured` block with `bandRationale` and `confidenceRationale` slots.*
Seven findings argue their band and five argue their confidence. Adding two slots that are
empty on 90 and 92 items manufactures structure. That prose reads naturally inside `difference`
and the confidence chip.

### Citations are data, extracted once, never a render-time regex

`citations[]` on each increment, with `[[cN]]` markers inline in the prose. Verified absent
from the corpus today, so it is a safe delimiter.

A regex at render time is unsafe: 391 of the 516 in-prose references are bare basenames, and
`copy.en.js` alone matches 21 files in the frontend. 77 more are bare `:NN` continuations
whose antecedent is the previously named file, and `inc-028` alternates sides mid-sentence.
A regex produces confidently wrong links, which is worse than the inert `<code>` we have now.

The `[[cN]]` marker also means the copy editor physically cannot mangle a reference while
rewording the sentence around it, and the checker can count references exactly.

**The resolver never guesses.** Anything ambiguous goes to a queue for a human. Expect about
30 citations there.

### Judgement in `backlog.json`, derived content in `evidence.json`

Citation *identity* (side, path, lines, `asWritten`, anchors) is judgement — someone decided
that `copy.en.js:6` means `features/import-purpose/copy/copy.en.js`. Citation *content* (URL,
snippet, blob id) is a pure function of identity plus a pinned SHA.

Both files are tracked. `git diff backlog.json` is a clean prose review; `git diff
evidence.json` after a re-pin shows exactly which citations moved and which changed content.
Snippets baked into `backlog.json` would bury the prose diff under 200 KB of code; snippets
computed at render time would make the report depend on two clones being on disk.

Freshness is one comparison: each citation stores `blob`, the output of
`git rev-parse <sha>:<path>`. Matching blob means the snippet is exactly what the URL shows.

### The frontend is captured at the corpus SHA, not at HEAD

`repos/trade-imports-animals-frontend` is 4 commits past `32f6106c`, and one of them is the
EUDPA-124 port-of-entry typeahead — which is itself the subject of an in-flight finding.
Capturing at HEAD would produce imagery that contradicts the findings the pictures are meant
to support.

`tools/parity/pin-checkout.sh` clones locally to
`workareas/shared/dr21-parity/checkouts/frontend@32f6106c/`, checks out the SHA, then overlays
the capture harness from the current branch. The manifest records `appSha` and `harnessSha`
separately, so the claim is precise: the application is the corpus SHA, the capture harness is
current. Worktrees are not used — they detach from the stack bind-mount.

*This is gated on Sam (section 8).* Re-capturing at HEAD is a legitimate choice, but it is a
deliberate re-run that changes what the 49 decisions are about, not a shortcut to pictures.

### Capture calls go inside the 26 existing `*.fit.spec.js` files

Those specs already know how to reach each state and already assert the page landed. The
capture call is guarded by an env flag set only by a new `test:fit:capture` script and a
separate `evidence` Playwright project, so `test:fit:features` and CI are unchanged.

*Rejected: extracting all 26 navigation preambles into `fit/screens/<screen>.js`.* It is a
genuine improvement to that repo and it should happen on its own merits, but it is a 26-file
refactor on the critical path of a report. Adding one guarded line per spec is not.

### Traces are regenerated, not mined

The trace CLI offers `snapshot`, `eval` and `screenshot` only — no `fullPage`, no `clip`, no
locator target, no `deviceScaleFactor`, no `mask`. Trace-mined stills are viewport-sized and
1x; the screencast frames are 800x750 JPEG filmstrip thumbnails. Re-running to produce a trace
and then extracting a worse image from it is dominated by re-running to produce the image.
Mining stays as archaeology for a commit that can no longer be built.

Traces are stored under the screen's own name, which removes `fe-miner/targets.js` and its 33
hand-maintained title-matching strings.

### Anchors are semantic descriptors, not CSS selectors

`{"kind":"field","name":"cphNumber-county"}`, `{"kind":"summary-row","key":"Number of
animals"}`, `{"kind":"insertion","after":{...}}`. Resolved by one ladder that asserts exactly
one match and otherwise records a typed error. A raw CSS string re-run against moved markup
matches the wrong node silently or nothing silently; a descriptor that fails to resolve
surfaces in the report as an evidence-broken card, which is information, not a rendering bug.

Descriptors live in the backlog and are emitted to `anchors.<side>.json`. Adding element
evidence to a finding therefore needs no spec edit, ever.

### Images degrade through four states, and never break

Per side, per screen, highest available wins: element crop, then full-page shot, then a
**page-model plate** built from the captured JSON (h1, headings, buttons, field labels in
document order, captioned "page model only"), then a plate naming the exact capture command.

The plate matters because 70 prototype PNGs exist and zero frontend PNGs do. The day-one case
is one side present, one side absent. A missing file changes the markup; it never emits a
broken `<img>`, and it never collapses to one column — an asymmetric layout reads as "there is
nothing on that side", which is a different and false claim.

Screens resolve through `pairs.js`, not through `screens[]`. `screens[]` gives a matched pair
for only 21 of the 49 gated findings, and 24 of its entries are slash-joined pseudo-ids.

### Delivery: local page primary, artifact derived

All three designs agree and the reasoning is arithmetic. 70 prototype full-page PNGs are
already 16 MB at 1x. At 2x, with the frontend side added and base64 on top, full-page imagery
in an artifact is an order of magnitude over the 16 MB ceiling. The only way to fit it is to
downsize, which is the one thing the brief rules out. So the artifact carries crops only, as
WebP, and says on the page which evidence it cannot carry.

### One new skill, `parity`, with three modes

`capture`, `report`, `walk`. `tools/parity/` already exists with three correctly parameterised
decision scripts and no owning skill; it is absent from `docs/reference/tools-index.md` and
from the CLAUDE.md routing table.

*Rejected: a fifth mode on `journey-builder`.* Ownership splits cleanly — `parity` builds and
adjudicates the backlog, `journey-builder` consumes `status`/`gate`/`dependsOn` to run the
build loop. Both mutate the same file, so the handoff is stated in both SKILL.md files.

*Rejected: a report-only skill.* The complaint is walker UX, not document formatting. The
report is the batch presentation surface the walker lacks. Splitting them puts the evidence in
one skill and the ruling button in another.

---

## 4. Migrating 97 findings from prose to structure

Two passes, two commits, never one. The split is what makes the guard work.

### Pass 0 — normalise, no judgement

Rewrite the 3 frontend and 4 prototype evidence path roots to repo-relative. Split the 4
slash-joined `screens` values. Add `"corpus": "dr21"`. Write `.corpus-meta.json` with the four
pinned SHAs and the derived counts.

In place and atomic (`jq > tmp; mv`), never a regeneration — `build-increments.js:164`
overwrites the whole file and would destroy the 24 notes and 1 ruling already recorded.

Verify by asserting `next-increment.sh --dry-run` and `backlog-counts.sh` produce
byte-identical output. They key only on `id`, `status`, `dependsOn`, `commit`,
`failure_reason` and `milestone`, so nothing added here can break the build loop.

### Pass A — structure. Move prose, do not reword it

Join each increment to its finding **by ordinal**, and assert the titles match. The findings
file has no id field; `build-increments.js` preserves order, so position is the reliable key
and title equality is the checksum. Title-primary is the weaker choice because 98 titles exist
against 97 increments.

`finding.detail` seeds `frontend`, `prototype` and `difference` by sentence assignment.
`finding.correction` becomes `correction` (39 items). `finding.falsifiedBy` becomes
`falsifiedBy` (97). `finding.verification` becomes `verification` **verbatim, never rewritten**
— it is an audit record, and rewording it destroys its value while adding 97 items of rewrite
risk.

Every citation token is replaced by `[[cN]]`. Commit.

### Pass B — GDS plain English

Over `frontend`, `prototype`, `difference`, `correction`, `falsifiedBy` and
`decisionRequired.question` only.

Technical vocabulary stays. `govukServiceNavigation`, `isGerminalProduct` and
`showTemperatureQuestion` are the names of real things. What goes: sentences over 25 words,
passives where an actor exists, nested parentheticals, and preamble that the section headings
now carry.

Budgets, enforced with a visible escape: `frontend` and `prototype` 60 words or fewer,
`difference` 90, `falsifiedBy` 40, `decisionRequired.question` 25 and one sentence. Over budget
is a hard fail unless `finding.longBecause` is set, which then shows in review. A silent
advisory would be ignored.

Commit. The review surface is `git diff <A>..<B>` per domain.

### Who writes

Fan out by domain, nine workers: germinal-products 18, addresses 13, commodities 13,
dashboard 11, general 11, templates 9, transport 9, spine 8, documents 5. Per domain rather
than per increment, because vocabulary consistency inside a domain is the point and 97 workers
is unreviewable fan-out.

Workers never edit JSON. They call `tools/parity/set-slot.sh <inc> <slot> --file <path>`.

**A different worker verifies than wrote.** After Pass B, one `CLAIM_VERIFIER` per domain — not
that domain's writer — reads the diff plus the frozen `detail` against a fixed rubric: is any
count, absolute, identifier or quoted string in the original absent or weakened? This is the
same adversarial pairing that produced the `verification` field in the first place.

### How it is verified — `tim parity check`

Baseline for the first three is the pre-migration git blob, so the oracle cannot drift.

| # | Invariant | Pass A | Pass B |
|---|---|---|---|
| I1 | `detail` byte-identical to baseline, all 97 | gate | gate |
| I2 | `citations[]` immutable after Pass A — same refs, paths, lines, sides. Markers may move between slots; a citation may never be deleted or edited | gate | gate |
| I3 | Every `file:line` token in the frozen `detail` (516) and in `evidence.*` (194) appears as some citation's `asWritten` | gate | subsumed by I2 |
| I4 | `[[cN]]` markers in each slot match that slot's `cites`, and both are a subset of `citations[].ref` | gate | gate |
| I5 | **Quote conservation.** Every double-quoted span of 5 characters or more, and every backticked identifier in the frozen `detail`, appears verbatim in some slot. No escape hatch | gate | gate |
| I6 | **Number conservation.** Every numeric literal that is not a citation line number survives, matched through a one-to-twenty word map so "five items" and "5" both pass | gate | gate |
| I7 | **Anchor check.** Every `citations[].anchors` string appears in the resolved snippet | gate | gate |
| I8 | **Word residue.** `detail` minus citations minus stopwords; 98% or more of tokens present across the slots, residue printed per increment | gate | disabled by definition |
| I9 | **Slot sanity.** Five slots non-empty on 97; `correction` on exactly 39; `decisionRequired` on all 70 gated; budgets met or `longBecause` set | gate | gate |
| I10 | **Polarity list.** Every hedge introduced (`may`, `might`, `appears to`, `some`) and every absolute removed (`no`, `never`, `only`, `always`, `exactly`, `unconditionally`) | advisory | printed list, signed off by the verifier |

I5 and I6 are the two that stop a language pass losing evidence. On the 26 `copy-change`
findings the quoted UI string *is* the finding — "has as it's aim," against "has as its aim" —
and a copy editor is exactly the kind of agent that would silently correct the typo it is meant
to be reporting. I6 catches the other common softening, a dropped count.

I10 cannot be a gate. "Always" legitimately becomes "on every page". The only defence is the
printed list plus an adversarial reader who did not write the text.

**Canary before every fan-out.** Migrate `inc-037` alone — 3,345 characters, five paragraphs,
the largest in the corpus — through Pass A, run all ten invariants, and read the residue by
hand before any of the nine workers start. Repeat for Pass B.

### Authoring the 47 missing decision questions

Only 22 of the 49 sam-gated findings state the ask in words, and 1 of the 21 backend-gated.
The rest are derived from `falsifiedBy`, which always encodes the counterfactual, and marked
`"source": "authored"`. The report labels them: *drafted from the falsifier — check this is the
right question.* This is the only content added rather than moved, and it is the content Sam
needs to make the rulings.

---

## 5. Evidence pipeline

| Stage | Command | Produces |
|---|---|---|
| 0 | `tim parity normalise --write` | path roots, screen splits, `.corpus-meta.json` |
| 1 | `tim parity citations --write` | `citations[]` and an unresolved queue |
| 2 | `tim parity evidence --write` | `evidence.json` — URLs, blob ids, snippets, anchor results |
| 3 | `tools/parity/pin-checkout.sh --side frontend` | `checkouts/frontend@32f6106c/` |
| 4 | `tools/parity/capture-screens.sh --side prototype` / `--side frontend` | `evidence/<side>@<sha>/` and manifest |
| 5 | `tim parity seed-anchors` | ranked descriptor candidates from `compare/deltas/` |
| 6 | curate (fan-out) then `set-visual.sh` | `visual[]` on each increment |
| 7 | `tim parity report EUDPA-328` | `report/index.html` and assets |
| 8 | `tim parity check EUDPA-328` | invariants, drift, coverage |

**Determinism.** Fixed viewport 1280x1200, `deviceScaleFactor: 2`, `animations: 'disabled'`,
`caret: 'hide'`, `reducedMotion: 'reduce'`. Three volatile regions are already known and get
masks: the declaration page's current date, the confirmation page's generated reference, and
the documents scan timer. Without these a no-op re-capture drifts everything and the drift
panel becomes noise.

**Content-addressed curation.** Each frame records the sha256 of the image it was curated
against. On rebuild, a changed hash renders the new image with a *changed since curation*
ribbon and lists the finding in a drift panel at the top of the page. Sam is never shown a
silently swapped picture under a decision he is about to make.

**Capture ids are immutable.** A capture at a new SHA writes a new directory; it never
overwrites the old one. The old evidence remains as the record of what was decided against.

**Link verification is local, never over HTTP.** `git cat-file -e <sha>:<path>` proves the file
exists at that commit; `git branch -r --contains <sha>` proves the pin is pushed, or the
permalink 404s. A citation that fails the first is *a finding* — the notes already record one
dead backend citation — and renders struck through with the reason. HTTP link-checking would
make the build non-deterministic, offline-hostile and rate-limited.

**Coverage is reported, not hidden.** stdout and the footer both carry
`images: prototype 40/40 cited screens, frontend 0/27`. `--require-images` turns a gap into a
non-zero exit, so a release-grade regeneration can be gated while daily regeneration stays
permissive.

**Git policy.** `capture/screens/` and the new `evidence/*/{page,crop,html,trace}/` stay
gitignored; `evidence/*/manifest.json` and `evidence/*/model/` are tracked. Provenance survives
a fresh clone, pixels are regenerable from a pinned SHA in about three minutes. The current
`.gitignore` rationale — "no finding cites one" — is about to be false and must be rewritten to
the real reason.

---

## 6. Skill packaging

```
.claude/skills/parity/
  SKILL.md                     triggers: "regenerate the parity report",
                               "rule the parity decisions", "walk parity EUDPA-X",
                               "recapture the parity corpus"
  references/EVIDENCE_CURATOR.md
  references/COPY_EDITOR.md
  references/CLAIM_VERIFIER.md

tools/parity/
  corpora.json                 target-as-data, shaped like tools/journey-builder/targets.json
  start-parity.sh              dispatcher: MODE: CAPTURE|REPORT|WALK
  capture-screens.sh           the only place a cd is needed
  pin-checkout.sh
  set-slot.sh  set-visual.sh   atomic writers, copying rule-decision.sh:55,99-101
  decision-counts.sh  next-decision.sh  rule-decision.sh    (existing, adopted)

tim/src/parity/                schema, corpus profile, loader, citations, assets, render, check
tim/src/commands/parity/       commander wiring

workareas/journey-builder/EUDPA-328/
  backlog.json  evidence.json  .corpus-meta.json  deferred.json
  report/index.html  report/assets/
```

`corpora.json` lives in `tools/` rather than `tim/src/` because the three shell scripts read it
too. It holds, per corpus: capture roots, the pairing module path, and per-side ordered
`pathRoots` mapping each of the seven prefix variants to a GitHub repo. Ordered longest-first,
with `app/` last because it is a prefix of nothing else. Four repos, not two — the notes cite
backend and address-book classes as well.

Per-run pins live in `.corpus-meta.json`, sibling of `.digest-meta.json` which
`target-profile.sh:24` already reads. Every masthead fact comes from there.

Also edited: `.claude/settings.json` gains explicit `tools/parity/*` entries per the
`frontend-change` precedent; CLAUDE.md gains one routing row; `docs/reference/tools-index.md`
gains a `parity` section; `tools/journey-builder/backlog-set-status.sh:29` gains `dropped`,
which is missing today and is why `inc-014`'s status was hand-edited and cannot be reproduced.

### Schema safety

zod at load, additive-tolerant and subtractive-strict. Unknown keys pass through; a missing or
retyped required key is a hard, named error (`inc-042: expected string at .band, got
undefined`). `journey-builder` can add fields freely; a rename fails the build the moment it
happens instead of emitting a silently empty section.

One contract test parses the **real** `EUDPA-328` backlog through the real schema, skipped when
the file is absent. CI on a fresh clone stays green; Sam's machine catches drift immediately.

The footer stamps corpus id, run id, all four pinned SHAs, the backlog's sha256 and mtime,
schema version, tim version and generation time. A page that cannot say which corpus it came
from is the current page's defect.

---

## 7. Risks

1. **The GDS rewrite softens a claim in a way no checker can catch.** I5 and I6 stop dropped
   quotes and dropped counts. They do not stop "the frontend enforces" becoming "the frontend
   checks", or a relationship being weakened. The only defence is the printed polarity list and
   an adversarial reader who did not write the text. This is the largest residual risk in the
   plan and it does not reduce to a gate.
2. **47 of the 70 decision questions are the migration's reading, not the analyst's.** Labelled
   as authored. Sam may reject a question as the wrong question — that is a good outcome, and
   the label invites it.
3. **Bare-basename citations will not all resolve.** 391 of 516 are bare and `copy.en.js`
   matches 21 files. About 30 will land in a manual queue. Accepted: a confidently wrong
   permalink is worse than the inert `<code>` we have today.
4. **The pinned frontend checkout may not drive at `32f6106c`.** The navigation in the specs is
   written against HEAD, and EUDPA-329 renamed `e2e` to `fit`. Some screens will need a
   pinned-SHA variant. Failures are recorded per screen and those findings fall back to model
   and trace evidence with the reason printed.
5. **About 53 findings are one-sided and need a hand-authored anchor on the empty side.** The
   delta records say what is missing, so they cannot say where it would go. Automatable to a
   first draft from DOM ordering, not to a finished one. This is the largest genuine labour in
   the evidence work and it is not compressible.
6. **Curating anchors blind will mis-frame some crops.** Mitigated by a second curation pass
   against the actual images, not eliminated.
7. **Very tall pages approach Chromium's screenshot limit at 2x.**
   `dr21-amend-confirmation-modal` is 6,450 CSS px, which is 12,900 device px. Capture falls
   back to 1x for that screen and the manifest records it, so the drop is labelled, not silent.
8. **Two prose surfaces exist during the migration.** `next-decision.sh:56` reads `detail`; the
   report reads `finding.*`. Update `next-decision.sh` inside Pass A, not after, or the
   terminal walker shows the old prose.
9. **Converting the 8 harness specs to ESM touches working specs.** Mechanical and one-time;
   their own assertions prove the conversion.
10. **The report ships one-sided at first.** Every card shows a prototype image against a
    page-model plate until frontend capture lands. Accepted deliberately: stating the corpus
    gap is more useful than delaying, and the plate is genuine evidence.

---

## 8. What needs Sam before it can start

Four decisions. None of them blocks the generator work, which can begin immediately.

1. **Which frontend commit gets photographed.** The plan pins to the corpus SHA `32f6106c` so
   the pictures match the findings. Capturing at HEAD (4 commits on, including the EUDPA-124
   typeahead that one finding is about) would show today's code and quietly change what some of
   the 49 decisions are about. If Sam wants the current state instead, that is a deliberate
   re-run of the comparison, not a shortcut. **Blocks: all capture work.**

2. **Whether the prototype is re-pinned.** The corpus is `7da4f70`; the designers have since
   pushed to `491b392`, and the 8 things that moved are already parked in `deferred.json` with
   a revisit trigger. The plan keeps the old pin and treats the drift as recorded. Re-pinning
   means re-running the comparison. **Blocks: prototype re-capture only.**

3. **Whether the report becomes the ruling surface.** The plan builds a copy-a-batch-string
   affordance so all 49 can be read in one page and applied in one go, with `next-decision.sh`
   kept for the ones needing discussion. If Sam would rather rule one at a time in the
   terminal, that increment is dropped and the report stays read-only. **Blocks: one
   increment.**

4. **Sign-off on one canary decision question and one canary rewrite** before either fan-out
   starts. One authored `decisionRequired` and one rewritten finding, shown side by side with
   the frozen original. Cheaper to reject one than 97.

Everything else in this plan is a call already taken and defended above. If any of them is
wrong, say which and it changes.
