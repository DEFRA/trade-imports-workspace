# Parity capture — requirements-gathering harness

These are **not tests**. They use a test framework because Playwright is the
right tool for driving a browser, but nothing here asserts that an application
is correct. They walk an application and record what it currently does —
screenshots, element crops, and a structural page model of every screen — so it
can be compared against the signed-off visual definition.

That is why they live in the workspace and not in the app repos. A test belongs
to the thing it tests. A requirements-gathering tool belongs to the comparison,
and the comparison spans two codebases that are not expected to match.

## What it produces, and what consumes it

Each side of a comparison produces, into that corpus's evidence directory:

- `<side>@<sha>/page/*.png` — a full-page screenshot per screen
- `<side>@<sha>/crop/*.png` — an element crop per declared anchor
- `<side>@<sha>/manifest.json` — the index; the report reads this, never the
  filesystem, so a missing frame is a stated gap and not a broken image
- a page model per screen — every heading, field, label, hint, option list,
  summary row and task item in document order

`tools/parity/compare/` diffs the two sides' page models. `tim parity` turns
the result into a report. Neither ever globs a directory.

## Running it

One-time, per checkout:

```bash
cd ~/git/defra/trade-imports-workspace/tools/parity/capture
npm install
npm run install:browser
```

Then, per corpus — **both variables are required and there is deliberately no
default**, because a guess files this comparison's evidence under a different
one:

```bash
export CAPTURE_EVIDENCE_DIR=~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/evidence
export CAPTURE_MODEL_DIR=~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/capture/frontend/model
npm run capture:frontend
```

| Variable | Default | What it does |
|---|---|---|
| `CAPTURE_EVIDENCE_DIR` | *none — required* | Where screenshots, crops and the manifest land |
| `CAPTURE_MODEL_DIR` | *none — required* | Where page models land |
| `CAPTURE_APP_ROOT` | `repos/trade-imports-animals-frontend` | The application to walk |
| `CAPTURE_PORT` | `3060` | Its own port, so it never collides with the app's fit suite |
| `CAPTURE_DSF` | `2` | Device scale factor |

## Why it borrows the app's journey helpers

`frontend/walk.spec.js` imports `fit/live-animals-journey.js` from the frontend
repo. Driving its own journey is genuinely the application's knowledge — its 26
fit specs depend on those helpers and they are maintained with the app — so
this borrows them rather than forking them. The prototype side does the same
with the interaction designer's `journey-demo/e2e/journey.js`.

The rule: **the app owns how to reach a screen; this owns what to record when
it gets there.**

## Determinism

Two runs at the same commit must produce the same bytes, because that is what
makes a changed hash mean the code changed. Fixed viewport, 2x scale, motion
stopped, caret hidden. The page model additionally normalises the generated
notification reference and any UUID out of the serialised output — without
that, every model differs on every run, every delta churns, and a real change
arrives buried in noise nobody reads.

The capture directory is named after the last commit that touched the
application's `src`, not its `HEAD` — so editing this harness does not orphan
every picture it has already taken.

## Prototype Kit gotchas

Carried forward from the DR2.1 harness, all still true:

- **Dev mode, not `serve`.** Production forces https on a plaintext server and
  sets secure-only cookies, which breaks sessions over http.
- **Wait on the TCP port, not an HTTP probe.** Under Node 24 the kit accepts
  connections before an HTTP probe settles.
- **`workers: 1`.** The kit dev server races journey state across concurrent
  requests.
- **One port per parallel runner**, for the same reason.
