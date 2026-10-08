# Design Release 2.1 prototype specs

Fit-style Playwright specs that walk every Design Release 2.1 journey of the
GB-notification-service prototype (`/design-release-2.1/*`), asserting the
headings, labels, hints, options and error messages it renders. Every test
records a trace, a video and screenshots; the traces and the specs are
requirement sources for the DR2.1 DISTIL run.

## Run it

```bash
npm --prefix ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/prototype-specs ci
npm --prefix ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/prototype-specs test
```

`test` boots the prototype from `~/git/defra/defra-design/GB-notification-service`
in dev mode on port 3010 (Playwright `webServer`, waits on the TCP port, reuses a
server already on that port outside CI), runs the suite with one worker, then
collects the outputs. Override with `PROTOTYPE_DIR` and `PROTOTYPE_PORT`.

Pass Playwright arguments after `--`, for example one spec:
`npm --prefix … test -- e2e/templates.fit.spec.js`. A filtered run keeps the
existing evidence and only replaces what it re-shoots.

Other scripts: `test:only` (Playwright without the collection step), `report`
(open the HTML report), `collect` (re-run the collection), `coverage` (print the
route coverage table used in `COVERAGE.md`).

## What it writes

| Output | Where |
|---|---|
| HTML report, videos, raw traces | `playwright-report/`, `test-results/` (gitignored) |
| Trace zips, one per test, `<spec>--<test-slug>.zip` | `../sources/traces-prototype/` |
| Trace index `{file, spec, test, status, pages}` | `../sources/traces-prototype/index.json` |
| Full-page screenshot per page state, `<page-slug>[--<state>].png` | `../evidence/prototype/` |
| Evidence index `{slug, url, heading, state, file, spec, test}` | `../evidence/prototype/index.json` |

`pages` lists every main-frame document request in order, including POSTs and
redirect hops. The page slug is the URL path with `/design-release-2.1` removed
(`dashboard` for the mount root).

## Layout

- `e2e/*.fit.spec.js` — one spec per feature area: dashboards, section 1 (type,
  origin, commodity, reason), section 2 (commodity, identification, additional
  details), transport and arrival, documents, consignment parties and contact,
  end-to-end journeys plus the hub/review/declaration, managing notifications,
  templates, address book.
- `e2e/support/journey.js` — page actions (bespoke autocompletes, commodity
  checkboxes, MOJ date picker) and shared assertions.
- `e2e/support/evidence.js` — `capture()`, the evidence screenshots.
- `e2e/support/fixtures.js` — records the pages each test visits.
- `COVERAGE.md` — route → test → states, and what could not be reached.

## Prototype gotchas the suite handles

- Dev mode only; `serve` forces https and secure cookies.
- One worker: the kit races session state across concurrent requests.
- Country, port and transit-country fields are bespoke autocompletes: type per
  key, then click `button.app-country-search__option`.
- Species are checkboxes `#commodity-species-<id>`; wait for the hidden
  `selectedSpecies` value before continuing.
- MOJ date pickers are dismissed with Escape after typing.
- Arrival dates are only "complete" within 7 days back to 6 months ahead, so the
  suite uses dates relative to today.
