# What landed, and what DR1 is for

Supersedes the three-PR plan that was here. Sam's corrections, applied: no PRs
on the workspace, no tickets for anything outside `repos/`, and the capture
harness belongs in the workspace because it is not a test.

## Done

**The tooling is on `main`.** The whole branch fast-forwarded — 49 commits, all
history intact. The objects were already pushed so this cost nothing: the repo
is 12.89 MiB total. `archive/dr21-parity-corpus` tags the tip, so every
capture, page model and delta stays restorable whatever happens to the working
tree.

**The capture harness is a `tim` surface.** It went first into
`tools/parity/capture/` as its own npm project; Sam ruled against a standalone
project, so it now lives in `tim/src/parity/capture/` and Playwright is tim's
own dependency. There is no separate npm project and no second `node_modules`.

```
tim/src/parity/capture/
  page-model.js         the structural extractor, one copy, shared
  screens.js            screenshots, element crops, manifest
  route-plan.js         the contract the discovery stage writes to
  walk.js               the route-plan interpreter — generic steps only
  walk.pw.js            the Playwright entry (.pw.js: not a spec, and vitest collects *.spec.js)
  run.js                tim parity capture
  cartography/          tim parity map — the discovery stage
```

**It borrows nothing from either application.** The earlier plan had it call
the frontend's `fit/live-animals-journey.js` and the designer's
`journey-demo/e2e/journey.js`; Sam ruled that out, because neither is
maintained. So the harness needed its own answer to "which screens are there
and how do you reach them", which is what `tim parity map` is: it crawls a side
from the rendered page alone and writes the route plan `tim parity capture`
walks. **The map works out what to record and how to get there; the capture
records it.**

Both are requirements-gathering tools rather than tests. Playwright is there
because Playwright drives browsers; nothing in either asserts that an
application is correct.

**The frontend repo is clean.** It carries a single two-line change now — the
fit suite getting its own default port, a genuine fix to its own suite — on
`chore/EUDPA-328-fit-port`. Everything else came out.

**The two environment variables are gone, not repointed.**
`CAPTURE_EVIDENCE_DIR` and `CAPTURE_MODEL_DIR` used to default into the DR2.1
corpus, so a DR1 run would have quietly filed its evidence under the comparison
it was replacing. Every path now comes from the corpus profile and none has a
default; a side that names no `evidenceRoot` or `modelDir` stops the run and
says so. The only variable left is `TIM_CAPTURE_CONTEXT`, which `tim parity
capture` sets itself to hand the Playwright entry one file of resolved paths.

**Four `.gitignore` rules** now keep captured pixels and page models out of
`workareas/shared/`. Without them one capture run commits ~100,000 lines. The
DR2.1 corpus did exactly that.

## One thing needs you

tim's Playwright is not installed — the guard hook blocks `npm install` from an
agent. One-time:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim install
npx --prefix ~/git/defra/trade-imports-workspace/tim playwright install chromium
```

Until that runs, `tim parity map` and `tim parity capture` both stop with a
typed `MISSING_DEP` and neither can be verified end to end. Nothing browser-side
has ever run: the pure parts are covered by tim's suite, but every selector in
the control reader and the driver has only met a stand-in page. Everything else
is committed and pushed.

## What the DR1 comparison is for

This changes the tooling's shape, so it is worth stating exactly.

**We built against an out-of-date prototype. DR1 is the signed-off visual
definition of the app. The job is to bring the frontend up to match it.**

That is not what the DR2.1 report was. That was a negotiation surface — 70
findings gated on a ruling, because the design itself was in flux and half the
differences were open questions. Against a signed-off definition there is far
less to decide: a difference means the frontend is wrong, and the output is a
work list.

Consequences, none of them yet applied:

- **The `needs-design-decision` band largely evaporates.** It existed because
  DR2.1 was moving. Against a signed-off definition the honest bands are closer
  to *frontend work*, *needs backend*, and *disputed* — the last being small,
  for cases where the definition looks wrong rather than the app.
- **The default disposition flips.** Today a finding is born awaiting a ruling.
  It should be born as accepted work, with rulings reserved for findings whose
  correctness is in doubt.
- **The gate stops being "does Sam agree with this design"** and becomes "is
  this finding correct" — a much cheaper question, and one an adversarial
  verifier can largely answer.
- **The report becomes a work list, and the handoff already exists.**
  `journey-builder` consumes `status`, `gate` and `dependsOn` to run a build
  loop over whatever has been accepted, and its increment types — add-page,
  add-section, add-field, obligation-change, flow-change, copy-change — are
  already how findings are classified. "Difference found" to "frontend changed"
  is one existing skill boundary, not a new thing to design.

Whether to re-shape the bands before the DR1 run or after the first pass: I
would do it after. The delta counts will tell you whether the distinction still
earns its place.

## Knowingly deferred

- **A third kind of comparison will not work as data.** `sides[]` is genuinely
  a list for the columns, coverage and asset ladder — but the finding schema
  has `frontend` and `prototype` as literal keys in `schema.js:79-80`,
  `set.js:7-8`, `check.js:10-11`, `load.js:72-73`, `counts.js:106`. A corpus
  whose sides are named differently would parse, render two empty columns and
  report 0% migrated, silently. **This does not block DR1**, whose sides keep
  those names.
- **Screen pairing is per-corpus code**, not data — `corpora.json` points
  `pairingModule` at a hand-authored CommonJS file. DR1 needs its own.
- **The three bands are hardcoded** in `render/page.js:14-33`, labels
  duplicated in `render/card.js:4-8`. The band rethink above wants them in
  `corpora.json` anyway.
- **`compare/build-increments.js:14`** writes to a hardcoded stale path
  containing both the pre-migration workspace name and the old run id.
- **The retired prototype harness still sits in
  `workareas/shared/dr21-parity/harness/`** with ten near-identical configs and
  `BASE` as a per-spec constant. Nothing points at it any more: the DR2.1
  corpus's `captureCommand` is `tim parity capture`, and DR1 has no walker to
  write at all — it maps instead. Its Prototype Kit knowledge has been carried
  into the prototype side's `_appComment` in `corpora.json`. Delete it once a
  live map has proved that nothing else was in there.
- **The capture reads the derived route plan, not the map.** `tim parity map`
  writes `<side>.routes.json` from `map.<side>.json` so the pipeline works end
  to end, but a plan walks one session, so any screen needing a fresh session
  or a widget the plan has no word for is listed in `unexpressible[]` and left
  out. Pointing the capture at the map itself would raise the screen count.
