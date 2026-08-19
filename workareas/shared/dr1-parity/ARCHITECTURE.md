# The DR1 comparison: what is a tool, what is an agent

Two pivots happened fast and nobody has seen the shape written down. This is
that shape, end to end, before anything is deleted.

Nothing here has been built or removed yet. This is the gate.

## The line

> Code is deterministic **only where its entire job is to be identical across
> two runs.** Everything above that line is judgement, and judgement is an LLM
> with tools.

Below the line is integrity: the guarantee that a picture cannot change
silently under a ruling somebody is about to make. Above it is everything that
decides what a screen *is*, what differs, and whether that difference matters.

The old pipeline put judgement below the line twice — once in a crawler that
inferred what to type from hint text, and once in an extractor whose fixed
vocabulary decided in advance what a page could be said to have. Both failed in
the same way: they produced confident, wrong answers with no way to tell them
from right ones.

## The pipeline, end to end

```
  ┌── agents ─────────────────────────────────────────────────────────┐
  │                                                                   │
  │  1. read the views and routes    →  2. write plain Playwright     │
  │     (one slice at a time)              specs, one per slice       │
  │                                                                   │
  └───────────────────────────────────────────┬───────────────────────┘
                                              ▼
  ┌── tools (deterministic) ──────────────────────────────────────────┐
  │                                                                   │
  │  3. tim parity capture — start the app, run the specs, and on     │
  │     every screen a spec names: full-page shot, element crops,     │
  │     page model, manifest row, content hashes                      │
  │                                                                   │
  │  4. tim parity coverage — enumerate the application's screens     │
  │     STATICALLY and diff against the manifest: "did we get         │
  │     everything", answered without crawling                        │
  │                                                                   │
  └───────────────────────────────────────────┬───────────────────────┘
                                              ▼
  ┌── agents ─────────────────────────────────────────────────────────┐
  │                                                                   │
  │  5. read both sides' evidence for one paired screen and author    │
  │     the finding directly — no delta format in between             │
  │                                                                   │
  │  6. a different agent adversarially verifies it: is this          │
  │     finding CORRECT? (not: do we want it?)                        │
  │                                                                   │
  └───────────────────────────────────────────┬───────────────────────┘
                                              ▼
  ┌── tools (deterministic, all proven) ──────────────────────────────┐
  │                                                                   │
  │  7. citations → evidence → report → check → check-evidence        │
  │     the work list, with permalinks, snippets, crops, insertion    │
  │     captions and a drift panel                                    │
  │                                                                   │
  └───────────────────────────────────────────┬───────────────────────┘
                                              ▼
                                    journey-builder consumes
                                    status / gate / dependsOn
```

Steps 3, 4 and 7 are code. Steps 1, 2, 5 and 6 are agents. The handoff between
them is always a file on disk, never a function call.

## What each stage is, and why

### 1–2. Agents write the navigation

An agent reads `app/views/*.html` and `app/routes.js` for one slice, and writes
a Playwright spec that drives those screens and calls `captureScreen()` on each.

Plain Playwright, not a plan format. A spec is readable, diffable and
hand-editable; Playwright is more expressive than any step vocabulary worth
inventing. The retired DR2.1 harness's ten specs are the existence proof — and
they are where the Prototype Kit knowledge lives (Escape-dismiss the MoJ date
picker; re-request through the kit's nodemon bounce; assert the landing URL so a
silently-rejected page cannot leave a mislabelled capture).

**The one thing carried over that must not be:** those specs `require` the
prototype's own `journey-demo/e2e/journey.js`. Nothing under `tim/` may import
an application. The new specs re-derive the widget handling themselves, in the
spec, where it is visible.

### 3. Capture is a tool

`tim parity capture` keeps its whole existing shape. It resolves every path from
the corpus profile, starts the application if nothing is listening, generates a
Playwright config, and hands the specs one context file. What changes is two
lines: `testDir` becomes the corpus's spec directory and `testMatch` becomes
`*.pw.js`. The route plan disappears from the context.

`screens.js` does not change at all. Motion off, caret hidden, device scale
pinned, model read in the same page visit as the picture, content hash per file,
manifest as the only index, capture directories immutable per commit. That is
the integrity layer and it is already right.

### 4. Coverage is a tool, and it is new

Enumerate the prototype's root views and route mounts *from the source tree*,
enumerate the frontend's screens from its journey definition, and diff each
against what the manifest actually holds. Three lists, two set differences —
deterministic by construction.

This is the honest replacement for the crawler's frontier. The crawler answered
"what is there" by driving the application, badly. A static enumeration answers
it cheaply and cannot be wrong about a screen it never reached, because it never
had to reach one.

### 5. Agents author findings directly

Today: page models → JSON diff → 472 deltas → agents → 97 findings. The deltas
exist only to serve a mechanism nobody needs, and a structural diff cannot tell
a missing field from a field the other side builds out of different markup —
which is why `taskItems`, `summaryRows` and `allFields` exist as hand-coded
semantic special cases.

Instead: an agent reads both sides' evidence for one paired screen — the
rendered HTML, the screenshot, the page model — and writes the finding.

**A finding is about what a user can see and do.** "DR1 asks the user to choose
a document type; the frontend infers it from the filename." Never "`routes.js:9014`
differs from `controller.js:130`". If a finding's substance is a code
difference, it is not a finding.

Code references are supporting context. Frontend-side ones earn their place —
they tell whoever does the work where it lands. Prototype-side ones are mostly
noise: 416 of the previous run's 819 citations pointed into throwaway prototype
code and consumed most of the citation effort.

The agent also **names the control its finding is about**. That replaces
`anchors.js` seeding crops from deltas, and it replaces the `anchorsNamedIn`
hack that infers the control by whole-word matching against the finding's own
prose. Naming it is strictly better than guessing it from the sentence.

### 6. Verification is adversarial, and it is a different question now

Against DR2.1 the gate was "does Sam agree with this design" — 70 findings
waiting on a person because the design was moving. Against a signed-off
definition the gate is "is this finding correct", which an adversarial verifier
can largely answer on its own. A different agent verifies than wrote.

### 7. The report is untouched

`citations | evidence | report | check | check-evidence | repoint | manifest |
meta | counts | set-*` all stay exactly as they are. They know nothing about
how findings were produced. They rendered 97 findings with permalinks,
snippets, screenshots, element crops, insertion captions and a drift panel, and
that is proven.

## What gets deleted

In its own commit, so the deletion is reviewable separately from the
replacement.

| Path | Lines | Why |
|---|---:|---|
| `tim/src/parity/capture/cartography/**` | ~2,700 + 2,200 test | The crawler. Frontier, session replay, stopping rules, value ladder, classifier, identity, map, plan. |
| `tim/src/parity/capture/route-plan.js` | 151 + 137 test | The `remember`/`interpolate` plan vocabulary. Specs replace it. |
| `tim/src/parity/capture/walk.js`, `walk.pw.js` | 199 + 273 test | The plan interpreter and its Playwright entry. |
| `tim parity map` (command registration) | ~70 | The crawler's front door. |
| `workareas/shared/dr21-parity/compare/diff.js`, `diff-all.js` | — | The mechanical comparison and the delta format. |

That is roughly **5,700 lines**, about half of them tests for code that is
going.

**Kept from what the deltas produced:** element crops, and showing where a
missing control would sit. `insertion.js` derives that position from the two
page models and only needs the missing control's name and label — which an
agent now states directly. It is an adapter, not a rewrite.

**Not deleted, and this needs your call:** `compare/deltas/` itself. The DR2.1
report cites it — `captureCitationRoots` in `corpora.json` maps
`compare/deltas/` to a capture kind. Deleting the data would break citations in
a report you have already ruled from. My recommendation is to delete the code
and keep the data, and let the DR2.1 corpus keep its own evidence.

## The uncommitted work in the tree splits cleanly

There are 18 modified files and 3 new ones sitting uncommitted. They divide
along exactly the line above:

- **Survives** — `app-server.js` and its test (start the app if nothing is
  listening, stop what you started), the `app.cwd` resolution in
  `corpus-profile.js`, `startCommand` in `corpora.json`, the `ensureApp` wiring
  in `capture/run.js`, and the `mini-dom.js` test support. This is deterministic
  plumbing and it is good work. I will commit it first, on its own.
- **Dies with the crawler** — every `cartography/*` change. It is fixes to the
  thing being deleted.

## What is proven and what is not

- **The report pipeline is proven.** 97 findings rendered end to end.
- **Recording screens is proven in its old form** — 70 prototype screens and 33
  frontend ones — but **unproven in its new home inside `tim`**. Nothing has
  ever run browser-side from `tim` except one eleven-minute crawl. Playwright
  *is* now installed in `tim/node_modules`, so this can finally be tested.
- **The crawler is disproven.** Its first live run produced five defects, every
  one a judgement failure wearing a code bug's clothes: it emitted the locator
  `[name=""]` and waited thirty seconds for it, twice; it tried to fill a select
  hidden behind a collapsed filter panel; it drove a date picker through its
  calendar instead of typing into the input. An agent reading those pages would
  have made none of those mistakes.

## The cost, stated honestly

Two runs will produce differently worded findings. Reproducibility moves from
the process to the artefact: what was ruled on stays fixed because `detail` is
frozen and the backlog is canonical JSON, even though re-running the analysis
would phrase things differently.

That is the right trade for a comparison whose output is a work list rather
than a regression suite. But it is a real trade and it is being made
deliberately.

## Order of work

1. Commit the surviving half of the working tree. *(no decisions needed)*
2. Delete what the table names, in one commit.
3. Build the spec stage for **one slice only** — origin-and-reason: small,
   self-contained, and the retired harness has a spec for the DR2.1 equivalent
   to read. Prove it end to end before writing a second.
4. Add the coverage check.
5. **Stop. Show you the screen counts for both sides**, before a single finding
   is authored. That is where we learn whether DR1 is a small comparison or a
   large one, and it changes everything downstream.

## Three things I am not deciding

**Does the frontend need re-capturing at all?** It has not changed since the
previous run, and its screenshots and page models are corpus-independent. My
recommendation: re-capture it anyway, because it is the only way to prove the
capture stage works in its new home before betting the prototype side on it —
and it costs one run.

**Which run id and ticket does DR1 get?** Every downstream path depends on it.
`next-decision.sh` matches `EUDPA-*` as a glob, so a suffixed id such as
`EUDPA-328-DR1` works; anything not starting `EUDPA-` breaks two shell scripts.
My recommendation: a new ticket, because this is a different comparison against
a different release with a different disposition — but it is your call whether
that is worth a ticket.

**The band taxonomy and ruling vocabulary.** `needs-design-decision` and
accept/reject/defer were built for a negotiation. Against a signed-off
definition the honest bands are closer to *frontend work*, *needs backend* and
*disputed*, and a finding should be born as accepted work rather than awaiting
a ruling. My recommendation: leave it until we have counts. The counts tell us
whether the distinction still earns its place, and re-plumbing it up front is
guessing.
