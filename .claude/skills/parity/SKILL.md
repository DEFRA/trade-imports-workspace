---
name: parity
description: 'Build, check and adjudicate a findings report for a comparison corpus. Two corpora today: `dr21` (run EUDPA-328, 97 findings against Design release 2.1, a design still in flux) and `dr1` (run EUDPA-328-DR1, the same live-animals frontend against the signed-off Design release 1). Five modes: REPORT regenerates the page from the backlog and serves it at full resolution; WALK presents the gated findings for a batch of rulings and applies them; MIGRATE moves a finding''s prose into the six structured slots and rewrites it into plain English, under ten invariants; CAPTURE re-shoots a side''s evidence by running that side''s own Playwright specs, then checks the result against a static enumeration of its screens; AUTHOR derives the findings themselves from the captured evidence — triage the previous corpus, slice the service so every screen is covered exactly once, fan out one authoring agent per slice, verify each slice with a different agent than wrote it, re-capture the states the findings were guessing at, then ingest (triggers: "regenerate the parity report", "rebuild the findings report", "rule the parity decisions", "walk parity EUDPA-X", "migrate parity EUDPA-X", "recapture the parity corpus", "map the application", "author the parity findings", "write the findings for EUDPA-X", "run the authoring pass", "compare the two sides"). NOT for running the build loop over the accepted findings — that is journey-builder, which consumes the same backlog''s status/gate/dependsOn. NOT for reviewing a PR (use review).'
---

Render a backlog of findings as a decision surface, and help rule on it.

The corpus is data. There are two of them — `dr21` and `dr1`, both comparing
the same frontend against a design prototype — and nothing here counts to two
inside one comparison either: `tools/parity/corpora.json` holds a `sides[]`
list, and the requirements side will not always be a prototype. Read the corpus
profile; do not assume the shape.

Which corpus you are in changes more than the paths. `dr21` compares against a
design still in flux, so a finding there has to earn its place. `dr1` compares
against a signed-off definition, so a finding there is born as accepted work.
See "Bands are per-corpus data" below before you write, rule on or render
anything.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/...`. Bash expands `~` automatically.

**Bash call hygiene** — one command per Bash call, no `&&`, no `;`, no `cd`.
Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) →
"Bash call hygiene". Everything in this skill runs through

```
npm --prefix ~/git/defra/trade-imports-workspace/tim run parity -- <subcommand> …
```

or, where `tim` is on PATH, `tim parity <subcommand> --workspace
~/git/defra/trade-imports-workspace`. **Always pass `--workspace` unless the
shell is already inside this checkout**: `tim` walks up from the current
directory first, so standing in the stale `trade-imports-animals` clone
silently resolves a different corpus. Check which binary you have with
`readlink -f "$(which tim)"`, and put this checkout's on PATH with
`npm --prefix ~/git/defra/trade-imports-workspace/tim link`.

## The two files and what each is for

- **`workareas/journey-builder/<run>/backlog.json`** — judgement. The findings,
  their prose, their citations' identity, the rulings. Tracked, and a `git diff`
  on it is a prose review.
- **`workareas/journey-builder/<run>/evidence.json`** — derived. URLs, blob ids,
  snippets, anchor results, the `[[cN]]`-marked copy of the prose. Regenerable
  from scratch; never hand-edited.

`.corpus-meta.json` beside them holds the pins, the captures and every count the
report's masthead prints. Nothing on the page is typed in.

**`detail` is frozen forever.** It is the only oracle that proves the structure
pass and the language pass lost nothing. Never edit it, never delete it, never
reword it. The renderer stops reading it once a finding is migrated; the checker
never stops.

## Bands are per-corpus data

How a comparison sorts its findings is a property of that comparison, so the
taxonomy lives in `corpora.json` under the corpus's `bands[]` — an ordered list
of `{ id, label, blurb }`, and the order is render order. It used to be
hardcoded in `render/page.js`; a corpus that declares no bands still falls back
to those three through `DEFAULT_BANDS` in `tim/src/parity/corpus-profile.js`, so
an older corpus renders exactly as it did.

- **`dr21`** keeps `frontend-only` / `needs-design-decision` / `needs-backend`.
  Those describe a negotiation: 97 findings against a design still in flux,
  where the middle band is what the report exists for. **Do not reword them** —
  49 rulings were made under that wording.
- **`dr1`** has `frontend-work` / `needs-backend` / `disputed`. DR1 is signed
  off, so a difference is a fault in the frontend and the fix is in the
  frontend. There is no band for "we might not want this", because that question
  is closed. `disputed` means the finding's own correctness is in doubt, or DR1
  contradicts itself — never that the change is unwanted.

Adding or changing a band is a data edit in `corpora.json`, not a code change.
A finding whose `band` matches no declared band is not silently dropped: the
renderer collects it under a *Not in a band* section, under its raw name, which
is how a typo shows up.

## Modes

Emit `MODE: REPORT|WALK|MIGRATE|CAPTURE|AUTHOR` on the first line of your reply,
then follow that section.

They are written in order of how often they are reached, not in pipeline order.
A comparison runs CAPTURE, then AUTHOR, then REPORT, then MIGRATE, and WALK only
where the corpus is a negotiation.

### REPORT — regenerate the page

Triggers: "regenerate the parity report", "rebuild the findings report".

```
tim parity report EUDPA-328 [--open]
```

`report/` is a static app — `index.html`, `app.css`, `app.js`, `assets/` — and
opens straight off the filesystem. **There is no server and there must not be
one.** The page never fetches and its script is not a module, which are the
only two things a `file://` page cannot do; a test holds both. Never introduce
a `fetch` or an ES module into the page script without replacing the delivery
first.

`--target artifact` writes `report/artifact.html`, one self-contained file to
send someone. It is a second emitter of the same generator, not a reduced tier:
the element crops travel inside it as WebP and the full-page screenshots become
a stated local reference, so what it does not carry is named rather than
quietly dropped. Nothing is ever downsized to fit a channel. It does not write
to the seal store — shipping a copy must not change what the local build says
you have seen.

`report` writes `workareas/journey-builder/<run>/report/`, hardlinking the
screenshots into `assets/` rather than copying 20 MB of them. It
prints image coverage per side; `--require-images` turns a gap into a non-zero
exit so a release-grade regeneration can be gated while daily regeneration stays
permissive.

Run `tim parity check EUDPA-328` alongside it and read the warnings. Rebuild
`evidence.json` first if the backlog's citations have changed:

```
tim parity citations EUDPA-328 --write
tim parity evidence EUDPA-328 --write
```

`citations` rebuilds `citations[]` from the prose, and carries every resolution
a person made with `set-citation` back over the top of it. It prints two
breakdowns for that reason: what the backlog holds, and what the parser derives
on its own — the parser still reports a hand-resolved citation as unresolved,
because it still cannot see what the citation points at. Read the first.

A hand resolution the prose no longer contains is kept, flagged `orphaned`, and
named in the output rather than dropped. Restore the prose or strike the
citation deliberately; do not ignore the line.

Before a regeneration anyone will rule from, run the evidence check. It is the
only command that reads pins, captures, coverage and citations together — each
of them alone can read green over a stale one of the others:

```
tim parity check-evidence EUDPA-328
```

A moved pin or a missing capture is blocking, and `--strict` makes it a
non-zero exit. A citation whose anchor has drifted is not: it is a finding to
re-verify, which is the expected yield of pinning to HEAD.

**Never `--reseal` on someone's behalf.** The report records the pictures it
last showed in `evidence/seals.json`; anything that has moved since carries a
ribbon and is listed at the top of the page. `--reseal` says "I have looked at
these and accept them", which is a person's statement, not a build step.

### WALK — present the gated findings and apply a batch of rulings

Triggers: "rule the parity decisions", "walk parity EUDPA-X".

**WALK is a negotiation, and `dr1` is not one.** Accept, reject and defer are
answers to "do we want this", which is a live question against a design still
being drawn and a settled one against a design that has been signed off. On
`dr21` the walk is the point of the report. On `dr1` a finding is accepted the
moment it is written and verified, and the only thing that can hold it up is
doubt about whether the finding is *correct* — which is the `disputed` band, not
a ruling. Do not run a walk over `dr1` looking for desirability decisions;
there are none to make.

The report is the presentation surface. Open it, filter to *Not yet ruled*, and
read the decision block at the top of each gated card: one question, the options
where the prose names them, what stays blocked, and the exact argument string.
The page collects a batch and the *copy batch* control returns one command per
line.

Apply them one call at a time:

```
~/git/defra/trade-imports-workspace/tools/parity/rule-decision.sh EUDPA-328 inc-055 accept --note "why"
```

`--note` is required on every ruling. A ruling without a reason is worth very
little three months later, and this backlog is meant to outlive the conversation
that made it. `tools/parity/next-decision.sh` still walks them one at a time in
the terminal for the ones that need discussion.

Rulings and what they do: `accept` unblocks it for the build loop; `reject`
drops it as a recorded decision; `defer` marks it decided-not-now; `falsified`
drops it and strips the dependency from anything waiting on it, because the loop
never treats a dropped dependency as satisfied.

### MIGRATE — move a finding's prose into slots, then rewrite it

Triggers: "migrate parity EUDPA-X", "run pass A", "run pass B".

Two passes, two commits, never one. The split is what makes the guard work.

**Pass A moves words. It does not reword them.** Read the frozen `detail`, split
it across `frontend`, `prototype`, `difference`, `correction`, `falsifiedBy`,
and import `verification` verbatim from the upstream findings file. Every
citation token becomes its `[[cN]]` marker.

**Pass B rewrites into GDS plain English**, over `frontend`, `prototype`,
`difference`, `correction`, `falsifiedBy` and `decisionRequired.question` only.
`verification` is an audit record and is never touched. Technical vocabulary
stays — `govukServiceNavigation`, `isGerminalProduct` and
`showTemperatureQuestion` are the names of real things. What goes: sentences
over 25 words, passives where an actor exists, nested parentheticals, and
preamble that the section headings now carry.

Workers never edit JSON. They write a slot file and call the setter:

```
tim parity set-slot EUDPA-328 inc-037 frontend --pass a --file /path/to/slot.txt
tim parity set-decision EUDPA-328 inc-055 --question "…" --source authored --option "…" --consequence "…"
tim parity check EUDPA-328 --pass a
```

`--pass` matters: the word budgets apply to Pass B and the residue check applies
to Pass A, so a finding has to say which one wrote it.

The personas are in `references/`: [COPY_EDITOR](references/COPY_EDITOR.md) for
the writing, [CLAIM_VERIFIER](references/CLAIM_VERIFIER.md) for the adversarial
read afterwards, [EVIDENCE_CURATOR](references/EVIDENCE_CURATOR.md) for the
pictures. **A different worker verifies than wrote.**

### CAPTURE — re-shoot the evidence, then check you got everything

Triggers: "recapture the parity corpus".

**These are requirements-gathering tools, not tests.** They use Playwright
because Playwright drives browsers. Nothing here asserts that an application is
correct. They record what an application currently does, so it can be compared
against a signed-off design. That is why they live in the workspace and not in
either application's repo.

For the same reason **nothing under `tim/` may import an application** — not the
frontend's `fit/` helpers, not the prototype's `journey-demo/e2e/journey.js`.
Neither is maintained. A harness built on an unmaintained suite breaks the first
time somebody refactors a suite nobody runs, and it makes the design comparison
a hostage to another repo's test code. The specs re-derive widget handling
themselves, in the spec, where it is visible.

There used to be a discovery stage — a crawler that worked out which screens an
application had and how to reach them, a route-plan vocabulary and a walker that
replayed it. All of it is deleted: 11,541 lines. **Agents write the navigation
now, as plain Playwright specs, and deterministic code takes the pictures.**
Any note, plan or handover you meet that talks about a cartographer, a route
plan, a frontier, a value ladder or a hints file is describing something that no
longer exists. `tim parity map`, `seed-anchors` and `insertion-anchors` are gone
with it.

Two commands answer "did we photograph everything", from opposite ends:
`capture` records what a spec could actually reach, and `coverage` says what the
side's own source claims it has. Two more sit around them: `anchors` says which
control each finding is about, and `ingest` assembles the backlog.

Before either, read `.corpus-meta.json`: `pins` is where the citations resolve
and `captures` is where the pixels came from, and the report says so on the page
when they disagree. A re-capture is what makes them agree again.

Capture ids are immutable. A capture at a new commit writes a new directory; it
never overwrites the old one, because the old evidence is the record of what a
ruling was made against.

**Take the pictures.**

```
tim parity capture EUDPA-328-DR1 --side frontend
```

It runs that side's own hand-written Playwright specs, from
`<workarea>/specs/<side>/`. The path is computed from the corpus's `workarea`;
a side does not name it, because a second copy in `corpora.json` would be a
second source of truth that nothing reads. It starts the application itself when
nothing is already listening on the side's `app.baseURL`, and stops only what it
started — so with the workspace stack up on the same port it photographs the
container instead, which is why the `dr1` frontend is on 3005 rather than 3000.

On every screen a spec names it takes **four things in one page visit** — a
full-page screenshot, an element crop per anchor, a page model and the rendered
HTML — so all four are of the same render. It writes `manifest.json` into the
capture directory itself.

The rendered HTML lands in the side's `htmlDir`. Every corpus profile has named
that directory from the start and nothing ever wrote it until August 2026, so a
finding could be argued from a picture and from a model but never from the
markup. It can be now, and the markup is the cheapest thing to be certain about.

`--specs <path>` runs specs from somewhere other than the side's own directory.
`--headed` shows the browser.

**Captures cannot run in parallel.** One server, one session, `workers: 1`. Fan
out the authoring of specs; serialise the run.

**Then check you got everything.**

```
tim parity coverage EUDPA-328-DR1 [--side frontend] [--strict]
```

Coverage enumerates a side's screens **statically from its own source**, through
the `enumeratorModule` its corpus entry names, and diffs that list against the
manifest. It is the honest replacement for the crawler's frontier, and it is
honest for a structural reason: **it cannot be wrong about a screen it never
reached, because it never has to reach one.** A crawler's coverage number was
only ever a claim about how far the crawler got.

`--strict` turns a missing screen into a non-zero exit. Without it the command
just states the position, which reads like:

```
frontend: 33 of 33 pages captured, plus 0 states of them.
prototype: 23 of 23 pages captured, plus 17 states of them.
```

A screen that turns out to be genuinely unreachable is a **stated absence**, not
a failure. Say so, and leave it uncaptured. A wrong picture is worse than none.

**Say which controls to crop.**

```
tim parity anchors EUDPA-328-DR1 --side frontend --write
```

`anchors` derives `anchors.<side>.json`, under the side's `evidenceRoot`, from
the backlog — specifically from each increment's `controls` array, which the
agent authoring the finding fills in by naming the control the finding is about.
It replaces `seed-anchors`, which derived the same file from a compare-delta
format that no longer exists. The capture loads the file for its own side, so
adding element evidence to a finding is a data change and never a spec edit.

Without `--write` it reports and writes nothing. Either way it names **every
increment that named no control** — "N findings name no control, so they fall
back to a whole-page shot", with the ids. That report is the point of the
command as much as the file is: **a whole-page shot may not stand in for a
finding about one control**, so an empty `controls` array has to be a stated
choice rather than an omission nobody sees.

Run it before the capture, not after: a side captured before its anchors exist
gets full-page shots only.

**Assemble the backlog.**

```
tim parity ingest EUDPA-328-DR1 [--replace] [--dry-run]
```

`ingest` builds `backlog.json` from the one-file-per-finding JSON under
`<workarea>/findings/`. Those files are what AUTHOR below produces. Read
[`FINDING-CONTRACT.md`](../../../workareas/shared/dr1-parity/FINDING-CONTRACT.md)
for that file's shape, and for its two sharp edges:

- **`detail` is composed at the first ingest and frozen from that moment.** It
  is assembled from the four prose slots the first time ingest sees a finding,
  and a re-ingest that would change an existing `detail` refuses and names the
  increment. So the slots must be right *before* the first ingest; afterwards
  they move only through `tim parity set-slot`.
- **The increment id is bound to the finding's file name.** Rename the file and
  the id changes, which reads as "old finding struck, new finding added" and
  orphans every ruling and citation attached to the old id.

`--replace` rebuilds from scratch and refuses while any increment holds a
ruling. `--dry-run` reports what it would write and writes nothing.

Playwright lives in tim. Until it is installed `capture` stops with a typed
`MISSING_DEP`; the fix is `npm install` in `tim/` then `npx playwright install
chromium`, and Sam has to run it because the guard hook blocks `npm install`
from an agent.

On a failed run the directory survives under `tim/.parity-runs/`. Read
`test-results/*/error-context.md` in it: it holds a full accessibility snapshot
of the failing page, which is the fastest way to see what state the run was
actually in.

The full sequence, in order:

```
tim parity capture EUDPA-328-DR1 --side frontend
tim parity capture EUDPA-328-DR1 --side prototype
tim parity coverage EUDPA-328-DR1 --strict
tim parity ingest EUDPA-328-DR1
tim parity anchors EUDPA-328-DR1 --side frontend --write
tim parity anchors EUDPA-328-DR1 --side prototype --write
tim parity capture EUDPA-328-DR1 --side frontend        # re-shoot, now with crops
tim parity capture EUDPA-328-DR1 --side prototype
tim parity repoint EUDPA-328-DR1 --side <side> --to <sha>   # preview, old beside new
tim parity repoint EUDPA-328-DR1 --side <side> --to <sha> --accept
tim parity meta EUDPA-328-DR1 --write
tim parity report EUDPA-328-DR1
```

**Capture appears twice on purpose.** Anchors come from findings, and findings
are written from captures, so the first pass round is unavoidably full-page
only; the crops arrive on the second. Adding element evidence to a finding after
that is a data change — a name in `controls`, then `anchors` and a re-capture —
and never a spec edit.

`tim parity manifest` is for a capture directory that came from something other
than `tim parity capture` — the older harnesses wrote no manifest of their own.

`repoint` is not optional politeness. Accepting a new capture supersedes every
picture in the corpus at once, and the preview is where a lost screen — one the
new run did not reach — is caught before it silently disappears.

Which crop lands on which card is **named, not inferred**. The finding's
`controls` array says which control it is about: a bare string without
whitespace is read as a field's `name` attribute, a bare string with whitespace
as a visible label, and an explicit `{ kind, name | text }` settles the cases
where either reading is plausible. A curated frame in `visual[]` overrides it.
Where a finding names no control, the card keeps the whole page — which is why
`anchors` prints those findings rather than passing over them.

**A reader cannot see an absence**, and this is the part of the old pipeline
that has no replacement yet. For "the prototype has X and we do not", the side
with nothing to show used to get an *insertion crop*: a picture of a control
that is there, outlined, captioned with what is missing and where it would go.
The renderer still draws one where `anchors.<side>.json` carries an
`insertions[]` entry, and `tim/src/parity/insertion.js` still holds the
derivation — but the `insertion-anchors` command that called it is deleted and
nothing imports the module. So on a corpus captured today, one-sided findings
show a whole page with nothing outlined. Say so when it matters to a finding;
do not describe an insertion crop the reader will not be shown.

### AUTHOR — derive the findings from the evidence

Triggers: "author the parity findings", "write the findings for EUDPA-X", "run
the authoring pass".

AUTHOR sits between CAPTURE and REPORT. It assumes both sides are photographed,
`coverage` reports nothing missing and nothing unexplained, and the corpus's
pairing module exists — `pairs.cjs` in the workarea, saying which screen answers
which, with the `onlyFrontend` and `onlyPrototype` lists beside it. Without the
pairing every agent works out for itself what its screen compares against, and
that judgement is never written down.

**Say what it does not do, first.** AUTHOR produces findings, not rulings. Every
finding it writes is written by one agent and checked by a different one, and
when it finishes **no person has read a single one of them.** All 133 findings
the `dr1` run produced were `status: "todo"` at the end of it. The output is a
work list somebody still has to open, and six of those 133 were `disputed` — the
mode's own statement that it could not settle them.

**The contract is step zero.** Before an agent is spawned the corpus needs a
finding contract: one file in the workarea, beside the findings it governs,
saying what a finding is and what shape its file takes. `dr1`'s is
[`FINDING-CONTRACT.md`](../../../workareas/shared/dr1-parity/FINDING-CONTRACT.md)
and it is the worked example — read it whole before writing another.

It stays in the workarea rather than moving into `references/` because six of
its sections are per-corpus data and would be wrong the moment they were
generalised: the band table (bands are per-corpus data — see above), the
`domain` list, the two `evidence` path roots, the requirements side's view-path
rule, the "what is not a finding" exclusions, and the volatile values a
comparison must never compare — on `dr1`, an arrival date whose valid window is
derived from `new Date()` and whose pixels therefore change daily. Everything
else in it is corpus-independent and should be carried across a sentence at a
time. **Do not keep a second copy here.** A contract in two places drifts, and
the drifted one is the one the agents read.

The contract exists so that ten agents on ten slices produce one backlog rather
than ten dialects of one. It has to be finished before the first agent starts.

#### 1. Triage the previous corpus first, if there is one

One agent, reading the previous run's `backlog.json` and writing
`carryover.json` beside the new workarea: per finding, a verdict of `carries`,
`retired`, `changed` or `recheck`, and the mechanism that settles it — the line
in the new requirements source that still says what the old finding said it
said, or the absence that retires it.

**Carrying a finding is cheaper than re-deriving it, and striking one is cheaper
still.** On `dr1` this triaged the previous 97 findings to 50 carry, 37 retired,
8 changed and 2 recheck, and 63 of the eventual 133 carried substance across.
The 37 retirements were mostly whole features the new requirements side does not
have — 18 germinal products, 8 templates, 6 amend/copy/delete — so more than a
third of the previous corpus was struck before an authoring agent was spawned.

A verdict is a claim about the requirements side, never about the frontend.
`retired` means there is nothing to compare against, so the frontend matching or
not matching says nothing at all. `carries` is permission to copy the substance
across, not the copy itself: the authoring agent still writes the DR1 finding,
and records the old id in `carriedFrom`.

This is one agent, one pass, one file. Its brief is the four paragraphs above
rather than a persona in `references/`, because its whole rubric is four
verdicts and a citation.

#### 2. Slice by screen, and cover every screen exactly once

`dr1` used ten slices: service-wide, dashboard, hub, origin-and-reason,
commodities, identification, addresses, transport, documents, review. They are
named after parts of the service rather than after screens, because a finding
usually spans two screens and an agent that owns a *part* can see both.

**Prove the slicing before you spawn anything.** Every screen id in both
sides' `manifest.json` must appear in exactly one slice's screen list — none in
two, none in none. The pairing says which screens travel together, so a slice
owning a frontend screen owns the requirements screens it pairs with, and the
`onlyFrontend` and `onlyPrototype` lists have to be assigned deliberately rather
than falling off the end. Print both set differences and read them. On `dr1`
nothing checked this before the agents were spawned, and one finding was found
homeless by two slices and written by a third — caught by the verification pass,
which is not what the verification pass is for.

**One slice owns the chrome.** The phase banner, the service navigation, the
caption above the heading, the back link, the footer, the page title and the
button pattern appear on every screen, so ten agents left to themselves write
the same finding ten times. Name one slice — `service-wide` on `dr1` — give it
the chrome, and tell every other slice **in as many words** not to raise a
chrome finding. A gap is one missing row in a work list. A duplicate is two
increments, two ids, two sets of citations, and somebody three months later
working out whether they are the same change. **Duplicates cost more than
gaps**, so brief for gaps.

#### 3. One authoring agent per slice, all in parallel

Follow [FINDING_AUTHOR](references/FINDING_AUTHOR.md). Each agent gets six
things and no fewer:

1. **The contract**, whole. Not a summary of it.
2. **The pairing** — its slice's rows out of `pairs.cjs`, with the notes saying
   what settled each non-obvious pair.
3. **The carryover** — the verdicts for the previous findings that land in its
   slice, so it starts from what is already known rather than re-deriving it.
4. **Its screens**, and the statement that the other slices own the rest.
5. **The evidence paths** — for every one of its screens, on both sides: the
   full-page screenshot, the page model, and the **rendered DOM**. All three come
   from one page visit, so they describe the same render.
6. **What is already known** — the paid-for knowledge for this corpus. An agent
   that has to rediscover that a search panel swallows the mousedown spends its
   run on that instead of on findings.

**Tell it to read the pictures.** A finding written from source is a reading,
not an observation, and a dozen `dr1` findings said so honestly in their own
`confidence` field. The rendered DOM is the cheapest evidence in the corpus and
the hardest to argue with; the screenshot is the only thing that shows what a
user meets.

**Tell it to check the brief.** Three separate agents on this run disproved
premises they were handed, two of them from the handover: that roughly ten
frontend screens answered to nothing in DR1 (false — DR1 asks those questions as
conditional reveals with no view file of their own), that DR1's two save-exits
use different messages (one validator serves both), and that DR1 says "Consignor
or exporter" (it says "Consignor"). **That is a feature, and the brief must say
so**, or an agent reads a contradiction as its own mistake and writes the finding
the brief expected.

#### 4. A different agent verifies each slice than wrote it

Follow [FINDING_VERIFIER](references/FINDING_VERIFIER.md). Its only question is
**"is this finding correct"**. Never "do we want it" — against a signed-off
design that question is closed, and a verifier that starts answering it is
running a WALK nobody asked for.

**This is the step that earns its keep.** On `dr1` it took 118 findings to 132,
falsified about a dozen claims outright, and found errors the authors could not
see in their own work. The classes it catches:

- **A claim about markup dressed as a claim about behaviour.** "The frontend lets
  you walk past this question" was true of the page and false of the journey, in
  three separate findings: the obligation model marks the field mandatory and the
  review gate enforces it. The user cannot submit — they are just never told why.
- **A claim stated more strongly than the evidence supports.** "A user cannot
  complete their notification" was a blocked return path, not a blocked journey.
- **A finding whose own falsifier was never run.** "DR1's address disclosure
  shows nothing the row does not" — it shows a phone number and an email. The
  falsifier fired on the finding the moment somebody executed it.
- **Two findings that are one.** One duplicate struck across 118.
- **A missed finding.** The net was +14, so the pass adds as well as removes.

It also catches findings that name a control which could never crop — a field
called "Back", a whole page title used as a label — both of which would have
fallen back to the whole-page shot the naming rule exists to prevent.

#### 5. Loop back for the states nobody photographed

Authors will name states their claims depend on that no capture holds — a table
with rows in it, a card at its maximum, an error state, a hub row under a
particular answer. **Collect those across all slices, then do ONE capture pass.**
Captures cannot run in parallel: one server, one session, `workers: 1`. Fan out
the authoring; serialise the run.

Then walk the pictures back into the findings, and **raise a confidence rating
only where the picture answers the question, never because a picture arrived.**
On `dr1` nine states were shot, ten findings moved from medium to high, four
claims were refined, and nothing was falsified. Where only one side is now
photographed, the finding's `correction` says so and names the state still worth
shooting.

Expect the pass to find work of its own. `dr1`'s 133rd finding came from this
step: a new picture showed a second completion threshold no finding owned. The
capture agent also added a state nobody asked for, having noticed that a piece
of copy renders only when the card is full — so the finding about it could not
have resolved against the state that had been requested.

#### 6. Ingest, then anchors, then recapture for the crops

```
tim parity ingest EUDPA-328-DR1
tim parity anchors EUDPA-328-DR1 --side <side> --write
tim parity capture EUDPA-328-DR1 --side <side>
```

In that order, and the ordering is not arbitrary: `anchors` derives the crops
from the `controls` each finding names, so the findings must be in the backlog
before the anchors exist, and the anchors must exist before the capture that
shoots them. That is why capture appears twice in a full run. See CAPTURE above
for the whole sequence.

`relatedTo` entries are written as file slugs, because at authoring time no
`inc-NNN` exists — `ingest` assigns the ids and resolves the slugs in the same
pass, including forward references to findings written later in the same batch.
An unresolvable slug is a named error, not a silent drop.

#### The sharp edges, and what each one costs

- **Verify before the first ingest.** `ingest` composes `detail` from the four
  prose slots the first time it sees a finding and freezes it from that moment;
  a re-ingest that would change an existing `detail` refuses and names the
  increment. `detail` is the only oracle proving a later language pass lost
  nothing, so it must be frozen over verified prose. Afterwards the slots move
  only through `set-slot`.
- **Never rename a finding file.** The increment id is bound to it. A rename
  reads as "old finding struck, new finding added" and orphans every ruling and
  citation attached to the old id.
- **Do not delete a control to make a coverage number go green.** `anchors`
  prints four numbers per side — anchors, insertion points, controls that
  resolve nowhere, findings that named no control — and they are only worth
  having while they stay honest. `dr1` keeps three uncroppable controls and two
  findings that name none, each with its reason recorded. A control that
  resolves nowhere is named and left uncropped, because inventing a crop is
  worse than admitting there isn't one.
- **Make the agents open the crops.** Four were confidently wrong on this run
  and only looking found them: a white square from a collapsed filter panel, two
  whole-page shots from a growth loop that stopped on a page container, and a
  sliver reading "Co" that matched a 1px visually-hidden submit trap.
- **Captures cannot run in parallel.** Said twice on purpose.
- **End by naming what you could not settle.** A question only a designer can
  answer, a requirements source that contradicts itself, a citation pointing at
  an identifier that is nowhere the finding points. Those belong in the handover
  as a short list, not buried in 133 findings.

#### What this method does not check

Every item below held on `dr1` and none of them was made to hold. They are the
places the next run will fail first.

- **Nothing bounds a slice's yield from below.** Ten slices over 133 findings is
  about thirteen each, which fitted. A slice that ran out of context and
  truncated would look exactly like a small slice, and nothing would say which.
  Compare each slice's count against its screen count before accepting the
  batch, and ask about any slice well under the others.
- **Nothing detects a cross-slice duplicate.** The verifier is paired per slice,
  so it never sees two slices at once. One duplicate was struck on `dr1` and
  that number is not evidence the briefing worked — it is evidence that whatever
  leaked was small enough for one agent to notice.
- **Nothing distinguishes a verifier that found nothing from one that looked at
  nothing.** A correction is recorded when it fires; the non-firing case leaves
  no trace. Require each verifier to state per finding what it opened and what
  it ran, so a silent pass is visible as a silent pass.
- **Nothing pins the applications for the duration of the run.** `dr1`'s
  captures and citations agree because nobody committed to either application
  while the run was open. A commit mid-run moves the pins away from the
  pictures, and `check-evidence` only reports it afterwards.
- **Nothing stops a capture photographing the wrong application.** `tim` uses
  whatever is already listening on a side's `app.baseURL` rather than starting a
  second copy, so a corpus sharing a port with the workspace stack photographs
  the container and says nothing about having done so. `dr1` moved the frontend
  to 3005 for that reason. A new corpus picks a new port and the trap is one
  config line away.
- **Nothing enforces the ingest gate.** The rule above — verify before the first
  ingest — is held by reading order alone. One command run early freezes the
  corpus over unverified prose, permanently.

## The invariants, and why each one is there

`tim parity check <run> [--pass a|b]` runs ten. Read the two that matter most:

- **I5, quote conservation.** Every double-quoted span of five characters or
  more and every backticked identifier in the frozen `detail` must appear
  verbatim in some slot. On the 26 copy-change findings the quoted UI string
  *is* the finding — `"has as it's aim,"` against `"has as its aim"` — and a
  copy editor is exactly the kind of agent that would silently correct the typo
  it was asked to report.
- **I10, the polarity list.** Every hedge introduced and every absolute removed,
  printed. It cannot be a gate: "always" legitimately becomes "on every page".
  The only defence is the printed list plus a reader who did not write the text.

The residual risk this skill cannot mechanise is a claim softened in a way no
checker catches — "the frontend enforces" becoming "the frontend checks". Every
finding in this backlog is defensible today and that is its entire value.

## Handoff to journey-builder

Both skills write the same `backlog.json`. The split is produce and consume:

- **parity** builds the findings, resolves their evidence, renders them, and
  adjudicates them. It sets `finding.*`, `citations[]`, `visual[]`, `decision`
  and — through `rule-decision.sh` — `status` and `gate`.
- **journey-builder** consumes `status`, `gate` and `dependsOn` to run the build
  loop over whatever has been accepted. It never reads `finding.*`.

Never run both against one run at the same time. Both write the whole file.

## What this skill will not do

- **Guess a citation.** 35 of the 819 citations are queued for a human with the
  reason printed. A confidently wrong permalink is worse than inert code.
- **Rewrite `verification` or `detail`.**
- **Show a picture from a different commit without saying so.** A frame records
  the hash of the image it was curated against; a changed hash renders a
  ribbon and lists the finding in a drift panel at the top of the page.
- **Resize an image to fit a delivery channel.** The artifact export carries
  element crops only, and says on the page which evidence it cannot carry.
