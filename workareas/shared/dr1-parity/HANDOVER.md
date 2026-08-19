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
- The frontend is enumerated at **33 screens**, read from its journey
  definition rather than a route table.

**Not done:**

- **The frontend capture is `PARTIAL`** — 31 of 33 screens from a run that was
  stopped part-way, so no frontend spec has ever had a clean pass. The corpus
  says PARTIAL in as many words. **Re-run it before anything is ruled from it.**
- **`pairs.cjs` does not exist.** `corpora.json` points the `dr1` corpus at
  `workareas/shared/dr1-parity/pairs.cjs` and nothing has written it. Screen
  pairing is per-corpus code, not data. Without it the report cannot put the
  two sides side by side.
- **`workareas/journey-builder/EUDPA-328-DR1/` does not exist.** No backlog, no
  `.corpus-meta.json`, no `evidence.json`. Nothing downstream of the captures
  has been built.
- No finding has been authored. That is deliberate — see the gate below.

## Your first four steps

1. **Re-run the frontend capture until it is clean.**
   ```
   npm --prefix ~/git/defra/trade-imports-workspace/tim run parity -- capture EUDPA-328-DR1 --side frontend --workspace ~/git/defra/trade-imports-workspace
   ```
   Six specs already exist under `specs/frontend/`. They were written but never
   proved. Expect failures and fix them in the specs.
2. **Get coverage to a stated number on both sides.**
   ```
   npm --prefix ~/git/defra/trade-imports-workspace/tim run parity -- coverage EUDPA-328-DR1 --workspace ~/git/defra/trade-imports-workspace
   ```
   A screen that turns out to be unreachable is a *stated absence*, not a
   failure. Say so and leave it uncaptured. A wrong picture is worse than none.
   Then update the `frontend` entry under `captures` in `tools/parity/corpora.json`
   with the new sha and a note that says what it covers — and drop the word
   PARTIAL only when it is genuinely no longer true.
3. **Write `pairs.cjs`.** Which frontend screen corresponds to which DR1 screen
   is judgement, and a wrong pairing produces a confident diff of two unrelated
   pages. The DR2.1 one is the model:
   `workareas/shared/dr21-parity/compare/pairs.js` — it exports `pairs`,
   `onlyFrontend` and `onlyPrototype`. **The one-sided lists matter as much as
   the pairs**: the frontend has 33 screens against DR1's 23, so roughly ten
   frontend screens answer to nothing in the signed-off design. That asymmetry
   is the most interesting thing this comparison has found so far.
4. **Then stop and show Sam the counts and the pairing** before authoring a
   single finding. That is where you learn what this comparison actually is.

## Then: authoring findings

Agents read both sides' evidence for one paired screen — the screenshot, the
page model, the rendered page — and write the finding directly. There is no
delta format in between and there must not be one again.

The agent also **names the control its finding is about**, which is what drives
the element crop. Do not reintroduce inferring it from the finding's own prose.

A different agent verifies than wrote, and the question it answers is "is this
finding correct", not "do we want it".

`workareas/journey-builder/EUDPA-328/backlog.json` holds the previous run's 97
findings. **Read a dozen. They are the standard** for what a good finding looks
like: functional, falsifiable, and about what a user sees.

**Many of them do not apply to DR1**, and checking is cheaper than re-deriving:

- **Germinal products do not exist in DR1.** `getSearchCommodities` adds them
  only for a DR2.1 session. That retires inc-004 and the three it roots
  (inc-090, inc-092, inc-096) plus the backend half inc-088 — 18 findings are
  tagged `germinal-products`.
- **Templates do not exist in DR1** — 9 findings.
- **Neither do amend, copy-as-new or delete.** All are behind the same DR2
  session guard. The previous handover did not know this.
- **`/address-book` is shared across all releases**, so those screens are
  identical in DR1 and DR2.1 and the previous run's 13 address-book findings
  carry over unchanged. Check them rather than re-deriving them.

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
  `~/git/defra/trade-imports-animals` — a stale clone. Pass
  `--workspace ~/git/defra/trade-imports-workspace` unless your shell is
  already inside the right checkout.
- Frontend: `repos/trade-imports-animals-frontend`
- Prototype: `~/git/defra/defra-design/GB-notification-service`
- Your workarea: `workareas/shared/dr1-parity/`
- **Work on `main`.** No PRs, no review. Commit directly and push. No tickets
  for anything outside `repos/`.
- One Bash command per call. No `&&`, no `;`. Write `~/git/defra/…`, not
  `/Users/samfarrington/…`.
- `npm install` is blocked by a guard hook. Edit `package.json` and ask Sam.

## What nobody has decided

- **The band taxonomy and ruling vocabulary.** `needs-design-decision` and
  accept/reject/defer were built for a negotiation over a design still in flux.
  Against a signed-off definition the honest bands are closer to *frontend
  work*, *needs backend* and *disputed*, and a finding should be born as
  accepted work rather than awaiting a ruling. The bands are hardcoded in
  `render/page.js:14-33` with labels duplicated in `render/card.js:4-8`; the
  rethink wants them in `corpora.json`. **Raise it once you have counts** — the
  counts tell you whether the distinction still earns its place.
- **Whether the ~10 frontend screens with no DR1 counterpart are in scope.**
  They may be legitimate additions, or they may be the out-of-date prototype
  showing through. That is Sam's call and it is probably the biggest question
  this comparison will put to him.
