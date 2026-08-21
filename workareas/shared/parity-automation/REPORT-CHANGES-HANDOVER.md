# Handover — strip the imagery from the parity report, and order it for triage

Everything below the line is the prompt. Copy it whole into a fresh session.

---

You are making two changes to the parity findings report. Both are for one
reason: **somebody has to triage 124 findings and the report does not currently
help them do it.**

**Fan this out. Do not do it serially yourself.** The investigation, the
implementation and the verification are separable and there is more than one
file involved. Use subagents, or a workflow with a pipeline stage per work
package. Your job as the parent is to brief, to judge what comes back, and to
run the things that cannot run in parallel. There is a worked example of the
shape in `workareas/shared/dr1c-parity/author-workflow.js` — one agent per
slice, each verified by a different agent.

## The tooling you are working on

The comparison pipeline is the **`parity`** skill.

| | |
|---|---|
| Skill | `.claude/skills/parity/SKILL.md` — read the `REPORT` and `CAPTURE` sections |
| Renderer | `tim/src/parity/render/` — `page.js`, `card.js`, `sections.js`, `run.js`, `artifact.js`, `prose.js`, `theme.js`, each with a sibling test |
| Corpus data | `tools/parity/corpora.json` |
| The run you are changing | `EUDPA-328-DR1C` → `workareas/journey-builder/EUDPA-328-DR1C/` |

Regenerate with:

```
tim parity report EUDPA-328-DR1C --workspace ~/git/defra/trade-imports-workspace
```

**`tim/` has hard rails and they are not optional.** Read `tim/CLAUDE.md` before
writing a line. The ones that will bite you here:

- **Test on input/output.** Call the function and assert its return value, or
  render and assert the output. `toHaveBeenCalled` / `toHaveBeenCalledWith` are
  banned. Do not `vi.mock()` tim's own modules.
- **Ship code and behavioural test together**, in the same diff.
- **GDS plain English** for every user-facing string, including anything the
  report prints and anything `tim parity report` prints to stdout.
- Run `npm --prefix ~/git/defra/trade-imports-workspace/tim test` and
  `npm --prefix ~/git/defra/trade-imports-workspace/tim run lint`.
- Before committing: `sonar analyze --staged`, and fix any BLOCKER or CRITICAL.

## Change 1 — take the imagery out of the report

**Sam's words: "remove the screenshots from the report, it doesn't help, so
needs all ripping out."**

**Rip it out properly. Do not hide it with CSS and do not leave the generator
producing assets nothing reads.** A `display: none` that leaves 2.9 MB of
hardlinked PNGs in `report/assets/` is not what was asked for.

### What "all" covers

Take out **every picture the report renders**: the full-page screenshots, the
element crops, and the insertion crops. The reason given was that they do not
help triage, and that reason applies to all three.

**Confirm this scope in one line with Sam before you start**, because it is the
one genuinely ambiguous word in the request and it changes the size of the job.
If he means full-page shots only and wants the element crops kept, that is a
smaller change and the rest of this section still applies.

### What goes with them

Work these out from the code rather than trusting this list, but expect to
touch:

- The image markup in `render/card.js` and whatever `render/page.js` does with
  `visual[]`.
- The asset hardlinking in `render/run.js` — the report currently hardlinks
  screenshots into `report/assets/` rather than copying 20 MB of them.
- The image-coverage lines `tim parity report` prints ("images: frontend 61/61
  cited screens") and the `--require-images` flag that turns a gap into a
  non-zero exit. **If nothing renders images, a flag that gates on them is
  dead** — remove it, and remove it from the skill's REPORT section too.
- **The seal store and the drift ribbon.** `evidence/seals.json` records which
  pictures the reader was last shown, and the report draws a ribbon and a drift
  panel when a hash has moved. That machinery exists only to police imagery. So
  does `--reseal`. Check whether anything else depends on them before removing.
- `render/artifact.js` — the single-file export carries element crops as WebP
  and states what it cannot carry. If crops are gone, that whole passage is
  gone with them.

### What must NOT be ripped out

- **The capture pipeline stays.** `tim parity capture` also writes the rendered
  DOM and the page models, and those are what findings are argued from. The
  images stay on disk as the evidence record; they simply stop being rendered.
- **`tim parity anchors` stays** unless the crop removal makes it genuinely
  dead. It reports controls that resolve nowhere and findings that name no
  control, and those reports are useful independently of cropping. Judge it,
  say what you decided, and say why.
- **`tim parity check-evidence` stays**, but re-read it: "screens with no
  picture" and "anchors that matched nothing" may need rewording or removing.
  Do not leave a check reporting on something the report no longer shows.

### The one hard constraint on the page itself

The report is a static app that opens straight off the filesystem. **There is no
server and there must not be one.** The page never fetches and its script is not
an ES module — a test holds both. Do not introduce either while you are in
there.

## Change 2 — order the findings for triage

**Sam's words: "the ordering of the increments, can you group the order by page
and then also by the order in
`repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/flow/flow.js`
so when triaging, things are grouped."**

Today the cards sort by `byGateThenType` inside each band (`render/page.js`
around line 259), and bands are the top-level render order. Somebody triaging
therefore meets the same page five times in five places.

### What to build

**Group by page, and order those groups by the journey.** `flow.js` is the
authority on journey order. Read it at generate time from the frontend checkout
— **do not hardcode the order into `tim`**, because `flow.js` changes and a
copied list goes stale silently. It exports `sections`, each with an `id` and an
ordered `pages` array, plus `allFlowPages` which flattens them in order.

Today that order is:

```
start          dashboard
origin         origin
commodities    commodities, consignment-details
animalIdentification
               animal-identification
consignment    import-reason, import-purpose, destination-country,
               port-of-exit, exit-date, additional-details
documents      documents
addresses      addresses, cph-number
transport      port-of-entry, transit-countries, transporters,
               transporters-select, private-transporter-details
contact        consignment-contact-select
review         notification-view, declaration, confirmation
```

### The decisions you have to make, and must state

None of these is obvious. Make each one deliberately and record it in the
commit message.

1. **Page ids are not screen ids.** `flow.js` says `portOfEntryPage`; the corpus
   says `fe-arrival-details`. `workareas/shared/dr1c-parity/enumerate.frontend.cjs`
   already holds that mapping in `SCREEN_OF_VIEW` and derives the rest. Decide
   whether to read it from there, re-derive it, or put the mapping somewhere a
   second corpus could reuse. **Do not silently duplicate it** — a second copy
   of a mapping is a second thing to go stale.

2. **Not every screen is in the flow.** `flow.js` sequences no page for the hub,
   `delete-notification`, `cancel-amend`, or the five address pickers. The
   enumerator says so explicitly for the first three. Decide where those land —
   a trailing "not in the journey" group is honest; scattering them is not.

3. **A finding can name several screens.** Decide which one orders it, and be
   consistent. Ordering by the earliest frontend screen in journey order is the
   obvious rule; say if you pick another.

4. **Some findings name no frontend screen at all** — the prototype-only ones.
   Decide where they go.

5. **Bands are currently the top level.** Decide whether page grouping replaces
   bands, nests inside them, or bands become a filter rather than a structure.
   Bands are per-corpus data in `corpora.json` and `dr1c`'s are
   `frontend-work` / `needs-backend` / `disputed`. **This is the biggest call in
   change 2** — ask Sam if you are not sure, because it decides what the page
   looks like.

6. **Ruled findings.** Four decisions have been applied to this run: one
   rejected (the address book) and three deferred (dashboard sort). Decide
   whether a dropped finding still takes a slot in its page group. The report
   already knows how to render withdrawn items.

### What not to break

- **The bands still have to render.** A finding whose band matches nothing is
  collected under *Not in a band* under its raw name — that is how a typo shows
  up, and it must keep working.
- **The filters and the batch controls.** The page has domain and type filters
  and a *copy batch* control that returns one ruling command per line. Whatever
  you do to ordering, those still have to work.
- `tim parity check EUDPA-328-DR1C` must still pass all ten invariants, and
  `tim parity check-evidence` must still run.

## How to verify you have finished

```
npm --prefix ~/git/defra/trade-imports-workspace/tim test
npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
tim parity report EUDPA-328-DR1C --workspace ~/git/defra/trade-imports-workspace
tim parity check EUDPA-328-DR1C --workspace ~/git/defra/trade-imports-workspace
tim parity check-evidence EUDPA-328-DR1C --workspace ~/git/defra/trade-imports-workspace
```

Then **open the report and read it as somebody triaging**. The size should have
dropped a lot — it is 2.9 MB today and almost all of that is imagery. Walk one
page group top to bottom and check it reads as one piece of work rather than as
five findings that happen to share a screen.

There is a second corpus, `EUDPA-328-DR1`, that renders through the same
generator. **Regenerate it too** and confirm you have not broken it — it has
133 findings, no rulings, and a different band set.

## Knowledge already paid for — do not rediscover it

- **Bash call hygiene.** One command per call. No `&&`, no `;`, no `cd`. Write
  `~/git/defra/trade-imports-workspace/…`, never a literal `/Users/…` path.
- **`curl`, `wget`, `node`, `env`, `python`, `python3`, `bash -c` are on the
  workspace deny list.** Do not attempt a transformed retry. `awk`, `grep` and
  `sed` are fine. Wrap any node you need in an npm script.
- **`npm install` is blocked by a guard hook.**
- **Give every subagent a guard-rails block**, or they will spam permission
  prompts. Tell them what not to run as well as what to run.
- **`workareas/shared/*/capture/` is gitignored**, so `git status` will not show
  you anything you break in there.
- The report opens at
  `workareas/journey-builder/EUDPA-328-DR1C/report/index.html`.

## When you finish

Say what you removed, what you decided on each of the six ordering questions,
and what you deliberately left alone. Name anything you found while in there
that is wrong and did not fix.
