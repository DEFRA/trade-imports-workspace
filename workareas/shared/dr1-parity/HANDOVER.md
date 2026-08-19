# Handover — bring the frontend up to Design Release 1

Supersedes the previous handover, which briefed the architecture rewrite. That
work is done. This one briefs what is left.

Everything below the line is the prompt. Copy it whole.

---

You are comparing the DEFRA live-animals import notification frontend against
**Design Release 1** of the GOV.UK prototype, and turning the differences into
a work list.

**Why this exists.** The frontend was built against an out-of-date prototype.
DR1 is the signed-off visual definition of the application. Your output is the
work needed to bring the frontend up to match it.

That framing governs everything. This is not a negotiation — the design is
settled. Where the frontend differs from DR1 the frontend is wrong, unless the
finding itself is mistaken. Findings are born as work. A ruling is needed only
where a finding's *correctness* is in doubt, never where its desirability is.

## The one rule that governs every finding

**You are comparing functionality, not code.** Prototype code is Nunjucks views
and an 11,000-line `routes.js`. The frontend is Hapi with a journey engine.
They are not expected to match and never will. What is expected to match is
*what a user can see and do*.

A finding says "DR1 asks the user to choose a document type; the frontend infers
it from the filename". A finding never says "`routes.js:9014` differs from
`controller.js:130`". If a finding's substance is a code difference, it is not a
finding — drop it.

Code references are supporting context. Frontend-side ones earn their place:
they tell whoever does the work where it lands. Prototype-side ones are mostly
noise — on the previous run 416 of 819 citations pointed into throwaway
prototype code and consumed most of the citation effort. Do not repeat that.

## Where the work stands

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) beside this file for the shape, and
[`SIZING.md`](SIZING.md) for how DR1 was measured from source. Both are
current. The run id is **`EUDPA-328-DR1`** and the corpus is **`dr1`**.

**Done, on `main`:**

- The crawler, the route-plan vocabulary, the walker and the whole delta-based
  comparison are deleted — 11,541 lines. Agents write the navigation now, as
  plain Playwright; deterministic code takes the pictures.
- `tim parity capture` runs a side's own specs from `<workarea>/specs/<side>/`.
  It starts the application itself and stops what it started.
- `tim parity coverage` enumerates a side's screens **statically from source**
  and diffs that against the manifest. That is the honest replacement for the
  crawler's frontier and it costs nothing.
- **The prototype side is complete: 23 of 23 pages plus 17 states, 40 screens.**
  Coverage reports nothing missing and nothing unexplained.
- **The frontend side is complete: 33 of 33 pages**, 14 tests across the six
  specs under `specs/frontend/`. The corpus entry no longer says PARTIAL.
- **A rendered-HTML capture now exists beside every screenshot and page model**,
  in each side's `htmlDir`. That directory was named in every corpus profile
  from the start and nothing had ever written it, so until now a finding could
  be argued from a picture and from a model but never from the markup.
- **`pairs.cjs` exists**, at `workareas/shared/dr1-parity/pairs.cjs`. 41 pair
  rows covering 31 distinct frontend screens and 36 distinct prototype screens,
  with 2 `onlyFrontend` and 4 `onlyPrototype`.
- **The 97 previous findings are triaged**, in `carryover.json` beside this
  file: **50 carry, 37 retired, 8 changed, 2 recheck.** The 37 retirements are
  18 germinal, 8 templates, 6 amend/copy/delete, 3 dashboard tabs and 2 on their
  own merits. It is a triage index, not a set of findings — a `carries` verdict
  is permission to copy the substance across, not the copy itself.
- **The band taxonomy is settled and built** — see "What was decided without
  Sam" below.

**Not done:**

- **`workareas/journey-builder/EUDPA-328-DR1/` does not exist.** No backlog, no
  `.corpus-meta.json`, no `evidence.json`. Nothing downstream of the captures
  has been built.
- No finding has been authored. That is deliberate — see the gate below.

## Where to start

Both captures are clean and the pairing is written, so the discovery work is
behind you. What is left is authoring.

1. **Read the pairing before you read anything else.** `pairs.cjs` is judgement
   and every non-obvious pair carries a note saying what settled it. Its two
   one-sided lists are where the comparison's shape actually lives.
2. **Read `carryover.json`.** 50 of the previous run's 97 findings carry, and
   copying the substance across is cheaper than re-deriving it. Each verdict
   cites the prototype line that settles it — re-open that line before acting
   on it, because the prototype is still being edited and a line number is the
   first thing to go stale.
3. **Author against `FINDING-CONTRACT.md`** — one file per finding under
   `findings/`, then `tim parity ingest`. Verify before the first ingest:
   `detail` is composed then and frozen from that moment.
4. **Take the one open question to Sam** — see "What is still open for Sam".

## What was believed at handover and turned out to be wrong

These are kept rather than quietly corrected. Each cost real work to overturn,
and the record of what was believed is the most useful thing in this document.

**"Roughly ten frontend screens answer to nothing in the signed-off design."**
Believed because DR1 has no `exit-date`, `port-of-exit` or `destination-country`
view file. That is true of the *view files* and false of the *questions*.
`app/views/reason-for-import.html` renders `importReasonItems`, and
`buildImportReasonItems` (`app/routes.js:8778-8820`) attaches a **conditional
reveal to four of the five reasons**. The captured page model for the
temporary-admission reveal carries `temporaryAdmissionExitDate`,
`temporaryAdmissionPortOfExit`, `transitExitBorderControlPost`,
`transhipmentDestinationCountry`, `transitDestinationCountry` and
`internalMarketPurpose`. **DR1 asks all four follow-ups inline on the reason
page; the frontend spreads them across four pages of its own.** So the screen
count asymmetry is mostly a page-splitting difference, not a set of frontend
inventions. `onlyFrontend` is **2**, not 10 — delete and cancel-amend — and both
are behind the DR2 session guard. Settled by reading the prototype's reason-page
source against the captured page models.

**"`fe-additional-details` is never reached."** It was never broken. It was
being skipped by `test.describe.configure({ mode: 'serial' })` behind the
failing `fe-exit-date` test above it — serial mode skips the rest of the block
once one test fails, so one real failure presented as two. Fixing the exit-date
navigation made both pass. Settled by reading the spec's own describe block
rather than the page.

**"`/address-book` is shared across all releases, so the previous run's 13
address-book findings carry over unchanged."** The shared-path argument is
correct about `/address-book` and irrelevant to those 13 findings. They are the
`domain: addresses` findings, and they are not about `/address-book` at all —
they are about `roles-and-addresses.html`, `consignment-address-select.html`,
`contact-address-for-consignment.html` and `cph-number.html`, **all four of
which DR2.1 overrides**. So the DR2.1 pictures behind them are of overridden
views, and "identical in both releases" was never established for any of them.
**11 of the 13 carry anyway** — on their own evidence, one finding at a time, as
recorded in `carryover.json`; inc-037 is `changed` and inc-091 is `recheck`. The
conclusion survived; the argument for it did not. `SIZING.md` carried the same
error and has been corrected in place.

## Then: authoring findings

[`FINDING-CONTRACT.md`](FINDING-CONTRACT.md) beside this file is the shape of a
finding file and the rules that go with it. Read it before writing one.

Agents read both sides' evidence for one paired screen — the screenshot, the
page model, the rendered HTML — and write the finding directly, one JSON file
per finding under `findings/`. There is no delta format in between and there
must not be one again. `tim parity ingest` assembles them into `backlog.json`;
nothing writes that file by hand.

The agent also **names the control its finding is about**, which is what drives
the element crop. Do not reintroduce inferring it from the finding's own prose.

A different agent verifies than wrote, and the question it answers is "is this
finding correct", not "do we want it".

`workareas/journey-builder/EUDPA-328/backlog.json` holds the previous run's 97
findings. **Read a dozen. They are the standard** for what a good finding looks
like: functional, falsifiable, and about what a user sees.

**Many of them do not apply to DR1.** That work is done: `carryover.json` holds
a verdict and a citation for all 97. **50 carry, 37 retired, 8 changed, 2
recheck.** The 37 retirements break down as:

- **Germinal products do not exist in DR1** — 18 findings. `getSearchCommodities`
  adds them only for a DR2.1 session.
- **Templates do not exist in DR1** — 8 findings.
- **Neither do amend, copy-as-new or delete** — 6 findings. All are behind the
  same DR2 session guard. The first handover did not know this.
- **The dashboard tabs** — 3 findings, gated the same way.
- **2 on their own merits**, unrelated to release gating.

A verdict is a claim about the prototype, never about the frontend. `retired`
means DR1 has nothing to compare against, so the frontend matching it or not
says nothing; `changed` means DR1 has the thing in a different shape and the
finding must be rewritten from the DR1 view rather than copied.

Do **not** carry the address-book findings on the shared-path argument — see
"What was believed at handover and turned out to be wrong" above. Each of them
carries on its own evidence or not at all.

## Knowledge already paid for — do not rediscover it

Every one of these cost a failed run. They are in the prototype specs already;
the frontend is a different codebase, so treat them as the *class* of thing
that bites rather than as literal selectors.

- **A search widget posts a HIDDEN input, and its open results panel overlays
  the buttons and swallows the mousedown.** Clicking Continue while it is open
  reaches nothing: no error, no navigation, no POST — the page just sits there.
  Dismiss the panel, then assert the hidden field is non-empty.
- **An answered item in a hub still renders a link.** On the addresses hub a
  "Change" link sits in the same container with the same classes as the "Add"
  link of an unanswered one, separated only by one extra class. A loop driving
  off "any link" reopens the first section forever and never visits the rest —
  and the hub advances anyway, so it surfaces four screens later at review.
  Two agents wrote that bug independently.
- **The declaration is a checkbox, not a radio.**
- **The arrival date has a moving valid window** (today−7d to today+6m). A
  hardcoded date silently expires and the notification is quietly incomplete
  until review says so. It is derived from `new Date()`, and it is the one
  field in the corpus whose pixels change day to day.
- **`selectedSpecies` is seeded with `"[]"` on page load**, so "assert not
  empty" passes before anything is selected. Assert against `/^(\[\])?$/`.
- **The frontend needs `STUB_MODE=true`** or it bounces to an identity provider
  that is not running. It is already in `corpora.json`.
- **The Prototype Kit bounces nodemon** while recompiling. Wrap the first
  navigation in `expect(async () => {...}).toPass({ timeout: 240_000 })`.
- **A serial describe block turns one failure into several.**
  `test.describe.configure({ mode: 'serial' })` skips the rest of the block once
  a test fails, so a single broken navigation presented as two missing screens
  and sent somebody looking for a second bug that did not exist. Before writing
  up a screen as unreachable, check whether the test above it failed.
- **The hub is not the only way into a page.** Some pages are reachable by
  walking the journey forward and not from the hub at all — `fe-exit-date` is
  reached by answering temporary admission of horses and saving twice. If a hub
  row is dead, try the journey before concluding the page cannot be captured.
- **Read the rendered HTML before writing a finding about markup.** It is in
  each side's `htmlDir` now, of the same render as the screenshot and the page
  model. It is the cheapest evidence in the corpus and the hardest to argue
  with.
- **A view file's absence does not mean a question's absence.** DR1 asks exit
  date, port of exit and destination country as conditional reveals on
  `reason-for-import`, with no view file of their own. Search the page models
  for the field name before concluding a side does not ask something.

## A frontend defect found during capture — and the wrong version of it

Recorded here because it is a real finding waiting to be written, and because
the first version of it was badly overstated. Both halves are worth keeping.

Under `reasonForImport = temporaryAdmissionHorses`, the hub's **"Exit details"
row renders visible but with no link**. `rowGatePasses`
(`src/server/app/flow/navigation.js:25`) tests only `row.pages[0]`, which is
destination country — and destination country is out of scope for that reason,
so the gate fails and the row renders unlinked.

**The first read concluded a user could not complete their notification at all.
That was wrong.** `shared/kit.js:94-100` falls through to `nextInSection`, and
`flow.js` puts the whole exit trio in the same section as import reason, so Save
and continue on the reason page walks the user into port of exit and then exit
date. Nothing is unreachable going forwards.

**The true defect is narrower and still real:** those two pages are reachable
going forwards and unreachable on return. A user who leaves and comes back to
the hub cannot get to either of them, and the row that should take them there
looks answered-but-inert. Write it up as that, not as a blocked journey.

The general lesson: a dead hub row is evidence about the hub, not about the
journey. Follow the forward path before you claim a page cannot be reached.

## How to work

- **Orchestrate, do not implement.** Fan out one agent per slice and pair each
  with a *different* agent whose brief is to find what is wrong. That second
  pass caught an assertion that could never fail, a navigation check that only
  asserted the page had changed, and a `goto` with no landing assertion — none
  of which the authors could see in their own work.
- **Captures cannot run in parallel.** One server, one session, `workers: 1`.
  Fan out the *authoring*; serialise the *run*.
- On failure the run keeps its directory under `tim/.parity-runs/` — read
  `test-results/*/error-context.md`, which holds a full accessibility snapshot
  of the failing page. It is the fastest way to see what state it was in.

## Rules you must not violate

- **`detail` is frozen forever.** It is the only oracle proving a language pass
  lost nothing. Never edit it.
- **A citation is immutable from the moment it stops being queued.**
- **Never `--reseal` on Sam's behalf.** The seal store records the picture he
  was last shown; resealing is his statement, not a build step.
- **A whole-page shot may not stand in for a finding about one control.**
- **Backlogs are canonical JSON**, never prose documents. Write through the
  setters.
- **A fix belongs in the tool, not in a workaround.** If you are copying a file
  or hardcoding a path in your workarea, stop and fix the tool.
- **Never mark a capture complete that is not.** Every downstream ruling rests
  on the picture being of what it claims.

## Two gates — stop and ask

- Before writing decision questions for more than one finding, author exactly
  one, show it beside the frozen original, and wait.
- Before rewriting more than one finding into plain English, do exactly one,
  show it beside the original, and wait.

Both exist because they are 40+ and 96 irreversible judgement calls. Produce
the canary, then carry on with everything that does not depend on it.

## Where you are

- Workspace: `~/git/defra/trade-imports-workspace`. **Never**
  `~/git/defra/trade-imports-animals` — a stale clone whose `CLAUDE.md`
  describes an older workspace under a different name. Pass
  `--workspace ~/git/defra/trade-imports-workspace` unless your shell is
  already inside the right checkout.
- **Check what branch you are on, in the workspace AND in
  `repos/trade-imports-animals-frontend`.** Both were left on
  `spike/trace-to-requirements` at one point, and on that branch the frontend
  has no `fit:start` script and the workspace has no dr1-parity files — so the
  capture fails in a way that looks like a broken tool rather than a wrong
  checkout. Both should be on `main`.
- **The frontend capture runs on port 3005, not 3000.** The workspace stack
  runs its own build of the frontend on 3000, and tim uses whatever is already
  listening rather than starting a second copy — so on 3000 a capture with the
  stack up photographs the container instead of the stubbed run, and says
  nothing about having done so. The prototype is on 3010. Both were verified
  with the full stack running.
- Frontend: `repos/trade-imports-animals-frontend`
- Prototype: `~/git/defra/defra-design/GB-notification-service`
- Your workarea: `workareas/shared/dr1-parity/`
- **Work on `main`.** No PRs, no review. Commit directly and push. No tickets
  for anything outside `repos/`.
- One Bash command per call. No `&&`, no `;`. Write `~/git/defra/…`, not
  `/Users/samfarrington/…`.
- `npm install` is blocked by a guard hook. Edit `package.json` and ask Sam.

## What was decided without Sam

**The band taxonomy is per-corpus data, and `dr1` has its own three bands.**
Made on Sam's standing instruction to make the call and flag it afterwards; this
is the flag.

The bands were hardcoded in `render/page.js` with labels duplicated in
`render/card.js`. They are now an ordered `bands[]` list in each corpus's entry
in `tools/parity/corpora.json`, and a corpus that declares none falls back to
the historic three through `DEFAULT_BANDS` in `tim/src/parity/corpus-profile.js`
— so DR2.1 renders byte-for-byte as it did.

- **`dr21` keeps `frontend-only` / `needs-design-decision` / `needs-backend`**,
  wording frozen verbatim. 49 rulings were made under that wording and rewording
  it would silently restate what they meant.
- **`dr1` has `frontend-work` / `needs-backend` / `disputed`.**

The reasoning: DR2.1's middle band exists because that design was still in flux,
so a finding had to earn its place before anyone would build it. DR1 is signed
off. A finding here is born as accepted work, and the only thing that can block
one is doubt about whether it is **correct** — never doubt about whether it is
**wanted**. `disputed` carries that doubt and nothing else.

The same reasoning retires accept/reject/defer for this corpus. That vocabulary
answers "do we want this", which is a question DR1 has already answered. Do not
run a WALK over `dr1` looking for desirability rulings; there are none to make.

## What is still open for Sam

**One question, and it is the one the screen asymmetry actually puts to him:
are the frontend's delete and amend journeys in scope for DR1 parity at all?**

They exist in the frontend. DR1 has no counterpart to either, because the
prototype gates them — along with cancel-amend and copy-as-new — on a
design-release-2 session flag a DR1 user never has, so the handler redirects to
`/`. DR1's dashboard card offers Copy as new and View; the frontend's offers
Resume, Copy as new and Delete.

So they are not a DR1 requirement the frontend has missed, and they are not
obviously wrong either. Either they are features that shipped ahead of the
design, or DR1 is simply not the document that governs them. Nobody but Sam can
say which, and it changes whether `fe-delete-notification` and `fe-cancel-amend`
produce findings or an `onlyFrontend` note.

Note the scale correction: this is **2** frontend screens, not the ten the first
handover predicted. The question is real but it is much smaller than it looked.
