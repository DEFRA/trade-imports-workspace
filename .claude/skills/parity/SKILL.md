---
name: parity
description: 'Build, check and adjudicate a findings report for a comparison corpus. Two corpora today: `dr21` (run EUDPA-328, 97 findings against Design release 2.1, a design still in flux) and `dr1` (run EUDPA-328-DR1, the same live-animals frontend against the signed-off Design release 1). Four modes: REPORT regenerates the page from the backlog and serves it at full resolution; WALK presents the gated findings for a batch of rulings and applies them; MIGRATE moves a finding''s prose into the six structured slots and rewrites it into plain English, under ten invariants; CAPTURE re-shoots a side''s evidence by running that side''s own Playwright specs, then checks the result against a static enumeration of its screens (triggers: "regenerate the parity report", "rebuild the findings report", "rule the parity decisions", "walk parity EUDPA-X", "migrate parity EUDPA-X", "recapture the parity corpus", "map the application"). NOT for running the build loop over the accepted findings — that is journey-builder, which consumes the same backlog''s status/gate/dependsOn. NOT for reviewing a PR (use review).'
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

Emit `MODE: REPORT|WALK|MIGRATE|CAPTURE` on the first line of your reply, then
follow that section.

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
`<workarea>/findings/`. Read
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
