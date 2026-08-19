# Landing the parity tooling, retiring the DR2.1 corpus

Written 19 August 2026, after a seven-agent review of all three repos. The
detail behind every claim here was verified against the files, not inferred.

## What is worth keeping

The comparison generator. Given a corpus — two or more sides, their repos,
their pins and their captures — it resolves every `file:line` in the findings
to a permalink and a snippet, shoots the control each finding is about on both
sides, works out where a control that exists on only one side *would* sit on
the other, records the picture you were last shown so a re-capture cannot
silently change what a ruling was made against, and renders the whole thing as
a static page you can rule from. It is about 11,600 lines with 777 tests, and
almost all of it reads the corpus as data.

The DR2.1 corpus itself — 97 findings, 241,353 insertions of captures, page
models and deltas — is being retired in favour of Design Release 1.

## Three PRs, in order

### PR-1 — build-loop genericisation (workspace, small)

The `journey-builder` target-profile work that was half-finished before any of
this started. Four live-animals facts still sit in `prepare-digest.sh` and
belong in `targets.json`: the Confluence page id `6497338582`, the canvas
filename, the `spike/$RUN_ID-live-animals-spec` branch slug, and the journey
name written into `.digest-meta.json`.

Independent of everything else. Lands first so PR-2 branches off a clean main.

### PR-2 — the parity tooling (workspace, ~11,600 lines)

`tim/src/parity/`, `tools/parity/`, the `parity` skill, the docs. Five commits
rather than one squash, so review is possible:

1. `tim parity` library + CLI wiring
2. `tools/parity` entry points + `corpora.json`
3. the promoted capture and diff modules (see below)
4. tracking policy — `.gitignore`, `workareas.md`, two carried backlogs
5. docs — skill, CLAUDE.md, tools index, retirement note

**Three files get promoted out of the workarea and into the tooling tree**,
because they are corpus-free and everyone will need them:

| From | To |
|---|---|
| `harness/e2e/page-model.js` | `tools/parity/capture/page-model.js` |
| `compare/diff.js` | `tools/parity/compare/diff.js` |
| `compare/diff-all.js` | `tools/parity/compare/diff-all.js` |

Four path couplings get fixed on the way: the literal `dr21` evidence default,
a dead `.app-dr2-dashboard-glance-card` selector two releases stale, the
side-named `anchors.prototype.json` leaf, and `diff-all.js`'s `../fe-miner` and
`../harness` relative roots, which should come from the corpus profile.

**Five cheap corrections that must not reach main:**

- `next-decision.sh:18` defaults `--gate` to `sam`; make it required
- `corpora.json:100-101,115` carry literal `/Users/samfarrington/` prefixes when
  the `~/` variants beside them already work
- `corpora.json:24-25` claims the `tools/parity` shell scripts read that file.
  None of the three does
- `CLAUDE.md:44` — the `parity` row is separated from the routing table by a
  blank line and renders as stray pipe-delimited text
- `docs/reference/workareas.md:28` hardcodes `dr21-parity` inside an otherwise
  durable policy doc; `:33` says "Eight files" over eight bullets

### PR-3 — evidence capture (frontend, 6 files, 998 lines)

Test-only. No production code touched, no new dependencies, one new Playwright
project gated behind `FIT_CAPTURE`.

**One thing must change before it is raised.** `fit/evidence/capture.js:17` and
`fit/evidence/page-model.js:390` default to writing into
`~/git/defra/trade-imports-workspace/workareas/shared/dr21-parity/…` — a
production repo whose test suite writes into another repo's workarea by
default. Both are already env-overridable; the fix is to make the *default*
repo-local (`fit/evidence/capture/`) and gitignore it.

## What is left behind, and why that is safe

Nothing is deleted until the branch tip is tagged. Everything below stays
recoverable from that tag forever.

| Left behind | Size | Why |
|---|---|---|
| Captures, page models, deltas | 239 files, ~110,000 lines | Regenerable in ~25s per side from a pinned commit |
| `prior/` | 99 files, 31,192 lines | Superseded DR2 evidence |
| `phase0/` | 10 files | Smoke output from the first day |
| `frontend-snagging-eudpa315/logs/` | 52 files, 5,112 lines | A different ticket's agent scratch |
| `journey-builder/EUDPA-328/*.json` | ~75,000 lines | The retired corpus |

Two older backlogs — `EUDPA-249` and `EUDPA-288`, 1,522 lines — do go to main.
The `workareas/shared/` tracking rule exists for exactly that.

A one-page `RETIREMENT.md` replaces the eleven narrative files: what was built,
why DR2.1 is retired, the archive tag and how to restore any file from it, the
two capture SHAs, and what the 49 gated-but-unruled findings represent.

The harness README's "Gotchas" section is promoted to
`docs/best-practices/playwright/prototype-kit.md` — dev mode because production
forces https and secure cookies, wait on the TCP port not an HTTP probe under
Node 24, `workers: 1` because the kit races session state, `deviceScaleFactor:
2` with `reducedMotion` for byte-identical re-runs, one port per worker.

## Decisions only you can make

1. **Which ticket?** EUDPA-328 was the DR2.1 comparison and its outcome is now
   "retired". Landing tooling under a ticket whose subject is being abandoned
   reads oddly. A new chore ticket, with EUDPA-328 closed against
   `RETIREMENT.md`, is the honest framing.
2. **Is DR1 settled, or is it the designer's current preference?** If it could
   move again there is a case for holding PR-2 until the tooling has run
   end-to-end on a second corpus once — it never has. PR-1 and PR-3 land
   regardless.
3. **Should the frontend own `fit/evidence/` at all?** The alternative is to
   move the whole capture library into the workspace and leave the production
   repo with only the Playwright project gate. That halves the fork risk — the
   extractor exists twice today, ESM in the frontend and CommonJS in the
   harness — but the extractor then cannot use the app's own test fixtures.
   This changes what PR-3 *is*, so it wants deciding before review.
4. **What is the DR1 comparison for?** Against DR2.1 the report was a decision
   surface: 70 findings gated on your ruling. DR1 is described in the
   prototype's own index as *"the current design release journey… use this for
   stable reference work"*. If DR1 is a stable reference, the same tooling is
   answering a different question — conformance rather than negotiation — and
   the three bands (`frontend-only`, `needs-design-decision`, `needs-backend`)
   and the ruling vocabulary may need rethinking rather than re-pointing.

## Known limits of what is being merged

- **A third kind of comparison will not work as data.** `corpora.json` says
  `sides[]` is a list and nothing counts to two. That is true of the columns,
  the coverage report and the asset ladder — but the *finding schema* has
  `frontend` and `prototype` as literal keys in `schema.js:79-80`,
  `set.js:7-8`, `check.js:10-11`, `load.js:72-73` and `counts.js:106`. A corpus
  whose sides are named differently would parse, then render two empty columns
  and report 0% migrated, silently. **This does not block DR1**, whose sides
  keep those names. It is the first follow-up ticket.
- **Screen pairing is per-corpus code, not data.** `corpora.json` points
  `pairingModule` at a hand-authored CommonJS file. DR1 needs its own.
- **The three bands are hardcoded** in `render/page.js:14-33`, with their
  labels duplicated in `render/card.js:4-8`. Two lists that can drift.

Six follow-up tickets should be raised and linked from PR-2 before review, so
the deferred work is visible rather than discovered.
