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

**The capture harness moved into `tools/parity/capture/`.** It is its own npm
project with its own Playwright, because a spec in the workspace cannot resolve
`@playwright/test` out of another repo's `node_modules`.

```
tools/parity/capture/
  package.json          its own Playwright
  page-model.js         the structural extractor, one copy, shared
  frontend/             capture.js, walk.spec.js, playwright.config.js
  prototype/            (the DR1 walker goes here)
```

It borrows each application's own journey helpers rather than forking them —
the frontend's `fit/live-animals-journey.js`, the designer's
`journey-demo/e2e/journey.js`. **The app owns how to reach a screen; this owns
what to record when it gets there.**

**The frontend repo is clean.** It carries a single two-line change now — the
fit suite getting its own default port, a genuine fix to its own suite — on
`chore/EUDPA-328-fit-port`. Everything else came out.

**Two defaults were removed, not repointed.** `CAPTURE_EVIDENCE_DIR` and
`CAPTURE_MODEL_DIR` are required and the capture refuses to start without them.
They used to default into the DR2.1 corpus, so a DR1 run would have quietly
filed its evidence under the comparison it was replacing.

**Four `.gitignore` rules** now keep captured pixels and page models out of
`workareas/shared/`. Without them one capture run commits ~100,000 lines. The
DR2.1 corpus did exactly that.

## One thing needs you

The harness's Playwright is not installed — the guard hook blocks `npm install`
from an agent. One-time:

```bash
cd ~/git/defra/trade-imports-workspace/tools/parity/capture
npm install
npm run install:browser
```

Until that runs the frontend capture cannot be verified end to end. Everything
else is committed and pushed.

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
- **The prototype harness still lives in `workareas/shared/dr21-parity/`** with
  ten near-identical configs and `BASE` as a per-spec constant. The DR1 walker
  should be built in `tools/parity/capture/prototype/` from the designer's own
  `walk.spec.js` instead — see `HANDOVER.md`.
