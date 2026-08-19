# Handover — compare the live-animals frontend against Design Release 1

Paste everything below the line to a fresh orchestrator.

---

You are comparing the DEFRA live-animals import notification frontend against
**Design Release 1** of the GOV.UK prototype, and turning the differences into
a work list.

**Why this exists.** The frontend was built against an out-of-date prototype.
DR1 is the signed-off visual definition of the application. Your output is the
work needed to bring the frontend up to match it.

That framing matters. This is not a negotiation — the design is settled. Where
the frontend differs from DR1 the frontend is wrong, unless the finding itself
is mistaken. So findings are born as work, and a ruling is needed only where a
finding's *correctness* is in doubt, never where its desirability is.

The previous run against DR2.1 worked the other way round, because that release
was in flux and half the differences were genuinely open design questions. Do
not carry that posture over. The band names and the ruling vocabulary you
inherit — `needs-design-decision`, accept/reject/defer — were built for that
other job. If they feel like they are asking Sam to approve the design rather
than confirm a finding, say so; they probably need re-shaping, and that is a
conversation to have after the first delta counts land, not before.

## Where you are

- Workspace: `~/git/defra/trade-imports-workspace`. **Never**
  `~/git/defra/trade-imports-animals` — that is a stale clone and `tim` will
  silently read its corpus if your shell is inside it. Pass
  `--workspace ~/git/defra/trade-imports-workspace` unless you are already in
  the right checkout.
- Frontend under comparison: `repos/trade-imports-animals-frontend`
- Prototype: `~/git/defra/defra-design/GB-notification-service`
- Your workarea: `workareas/shared/dr1-parity/`
- Read `.claude/skills/parity/SKILL.md` before you touch anything.

## The one rule that governs every finding

**You are comparing functionality, not code.** Prototype code is Nunjucks views
and a 9,000-line `routes.js`; the frontend is Hapi with a journey engine. They
are not expected to match and never will. What is expected to match is *what a
user can see and do*.

So a finding says "DR1 asks the user to choose a document type; the frontend
infers it from the filename". A finding never says "`routes.js:9014` differs
from `controller.js:130`". If a finding's substance is a code difference, it is
not a finding — drop it.

Code citations are **supporting context, not the comparison**. Frontend-side
ones earn their place: they tell whoever implements a ruling where the work
lands. Prototype-side ones are mostly noise — a line number in throwaway
prototype code helps nobody. On the previous run, 416 of 819 citations pointed
into the prototype and consumed most of the citation effort. Do not repeat
that. Let the resolver queue what is ambiguous, print the reason, and move on;
do not hand-resolve a queue.

The corollary: when the checker reports that a citation's identifier is no
longer in the file, that is a pointer that moved, **not a finding in doubt**.
Do not go and re-verify the claim.

## What Design Release 1 is

Verified, do not re-derive:

- DR1 is **the root URLs**. There is no `/design-release-1` mount.
  `app/views/index.html:36-61` describes it as *"The current design release
  journey at the root URLs. Use this for stable reference work"* and starts it
  at `/create-notification`. `app/routes.js` mounts only `testing`,
  `design-release-2` and `design-release-2.1`; the root router **is** DR1.
- So the base path is `''`, not `/design-release-2.1`.
- DR2 is a copy of DR1 and DR2.1 a copy of DR2, both since drifted. The
  previous comparison targeted DR2.1, which is in flux; the interaction
  designer has asked for DR1 as the stable reference.
- **DR1's screen set is smaller than DR2.1's.** The root views have no
  `create-template`, `view-template`, `dashboard-actions`, `dashboard-changes`,
  `dashboard-inspection`, `consignment-add-address` or `delete-notification`.
  Drop the templates and germinal slices entirely.
- **`/address-book` is shared across all releases** —
  `app/lib/version-mount.js:45-52`. Those screens are identical in DR1 and
  DR2.1, so the 13 address-book findings from the previous run carry over
  unchanged. Check them rather than re-deriving them.

## Your tools

Everything is `tim parity <subcommand> <runId>`; `--json` on any of them.

| Command | What it does |
|---|---|
| `normalise` | Pass 0 — rewrite evidence path roots to repo-relative, split joined screen ids |
| `meta --write` | Record the pins (where citations resolve) and the captures (where the pixels came from), separately |
| `seed-anchors --write` | Derive from the deltas which controls get cropped, as data |
| `insertion-anchors --write` | Work out where a control that exists on only one side would sit on the other |
| `manifest --side S --sha X --write` | Index a capture directory so the report never globs the filesystem |
| `citations --write` | Extract `file:line` from the prose; queue the ambiguous |
| `evidence --write` | Permalinks, blob ids, snippets, anchor checks |
| `report [--open]` | Render `report/` — a static app, `index.html` + `app.css` + `app.js` + `assets/` |
| `report --target artifact` | One self-contained file to send someone |
| `report --reseal` | Accept every picture that moved since it was last shown |
| `check --pass a\|b` | The ten prose-migration invariants |
| `check-evidence [--strict]` | Pin drift, capture integrity, screens with no picture, dead citations — the only command that reads all of them together |
| `repoint --side S --to SHA` | Preview old picture beside new before superseding a capture |
| `map --side S [--write]` | Discovery — crawl a side and record which screens it has and how to reach them |
| `capture --side S` | Walk the plan the map wrote and record what the application does |

**These are requirements-gathering tools, not tests.** They use Playwright
because Playwright drives browsers. Nothing in them asserts that an application
is correct: they map an application and record what it currently does, so it
can be compared against a signed-off design. That is why they live in the
workspace and not in either application's repo.

For the same reason nothing here may lean on an application's own journey
helpers — the frontend's `fit/live-animals-journey.js`, the prototype's
`journey-demo/e2e/journey.js`. **Neither is maintained**, the prototype's
certainly not, so a harness built on either breaks the first time somebody
refactors a suite nobody runs. Nothing under `tim/src/parity/capture/` imports
an application.

That leaves the question the helpers used to answer: which screens does this
application have, and how do you reach them? The cartographer answers it. So
capture is two stages, and the second refuses to start without the first:

```bash
tim parity map <runId> --side frontend --write
tim parity capture <runId> --side frontend
```

`map` opens the side at the `app.baseURL` and `app.startPath` its corpus entry
names and crawls with no knowledge of the journey — reading each rendered page,
filling what the page itself says how to fill, taking one forward action and
queueing every choice it did not take. `--write` produces, under the corpus
workarea's `cartography/`, `map.<side>.json`, a `hints.<side>.json` stub with
one empty entry per field nothing could fill, and `<side>.routes.json` — the
route plan — plus one page model per screen in the side's `modelDir`. Fill a
value into the hints file and the next run takes it at the top rung.

The route plan walks one session end to end, so a screen reachable only from a
fresh session, or one behind a widget the plan has no word for, is named rather
than written as a walk that would photograph the wrong page. `map` prints
`N of M screens can be walked again by the capture stage`. **Read that line** —
it is the coverage of the capture, not of the map.

`capture` then walks the plan and, on every screen it reaches, takes a
full-page screenshot, an element crop per anchor and a page model in the same
page visit, and writes `manifest.json` into the capture directory. A screen it
could not reach is a stated absence, never a broken image.

Every path comes from the corpus profile. Nothing has a default, deliberately:
a default would file DR1's evidence under the DR2.1 corpus it is replacing. Add
the `dr1` corpus first, then map, then capture.

Playwright lives in tim. Until it is installed both commands stop with a typed
`MISSING_DEP`. One-time, and **Sam has to run it** because the hook blocks
`npm install` from an agent:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/tim install
npx --prefix ~/git/defra/trade-imports-workspace/tim playwright install chromium
```

## This is the first run of these tools on a second corpus

They have only ever been run against DR2.1. **They will break.** Fixing them as
you go is the job, not a distraction from it.

The standing rule: **a fix belongs in the tool, not in a workaround.** If you
find yourself copying a file to make something work, or hardcoding a path in
your workarea, stop and fix the tool instead. That is how this stops being a
one-off.

Known breakages, in the order you will hit them:

1. **Neither `map` nor `capture` has ever driven a browser.** Both are new: the
   capture moved out of its own npm project into `tim/src/parity/capture/`, and
   the cartographer beside it was written from scratch. Their pure parts are
   covered by tim's own suite, but everything browser-side — the control
   reader, the crop arithmetic, the driver's step kinds — has only ever run
   against a stand-in page. Expect the first live run to be about selectors
   rather than about logic. The fix belongs in the tool.
2. **Screen pairing is code, not data.** You must hand-author
   `workareas/shared/dr1-parity/compare/pairs.js` mapping `fe-*` to `dr1-*`,
   plus `onlyFrontend` and `onlyPrototype`. Keep the CommonJS contract exactly:
   `module.pairs`, `module.onlyFrontend`, `module.onlyPrototype`, and each pair
   `{frontend, prototype}`.
3. **`compare/build-increments.js:14` writes to a hardcoded stale path** —
   `~/git/defra/trade-imports-animals/workareas/journey-builder/EUDPA-328`,
   which is both the pre-migration workspace name and the old run id. Derive it
   from the corpus profile. Same for `compare/phase3.workflow.js:10`.
4. **The side ids must stay `frontend` and `prototype`.** They are literal keys
   in the finding schema and the invariant checker. Change the *labels*, not
   the ids.

## Mapping DR1

**There is no walker to write.** Do not port the ten DR2.1 specs, and do not
start from the designer's `journey-demo/e2e/walk.spec.js` and its
`journey-demo/e2e/journey.js` fill helpers. Sam has ruled that those are not
maintained. A comparison against the signed-off design cannot rest on an
unmaintained suite in the design repo, and the same goes for the frontend's
`fit/live-animals-journey.js`.

Instead, map each side and let the route plan fall out of the map:

```bash
tim parity map <runId> --side frontend --write
tim parity map <runId> --side prototype --write
```

Give each DR1 side an `app` block in `corpora.json` — a `baseURL` and the
`startPath` the journey begins at. DR1 is the root URLs, so the prototype side's
`startPath` has no release prefix.

Carry the DR2.1 prototype side's `_appComment` across verbatim; it holds the
hard-won Prototype Kit knowledge. Serve the kit in dev mode
(`journey-demo/serve-prototype.js`), not `serve`, because production mode forces
https on a plaintext server and sets secure-only cookies, which breaks the kit's
sessions over http. Wait on the TCP port rather than on an HTTP probe: the kit
accepts connections before a request settles under Node 24. Port 3010 — the
workspace stack owns 3000, 3001, 3007, 3100 and 3200.

Two other things from the old harness are already in the generated Playwright
config and need no action: one worker, because the kit races session state, and
`deviceScaleFactor: 2` with `reducedMotion: 'reduce'` so two runs at one commit
produce the same bytes.

Expect the first map to leave fields unfilled and choices unexplored — that is
what `hints.<side>.json` and the frontier are for. Fill the hints file, run it
again, and read the coverage line at the top of the map before treating it as an
inventory.

## Design rules you must not violate

- **`detail` is frozen forever.** It is the only oracle proving the language
  passes lost nothing. Never edit it.
- **A citation is immutable from the moment it stops being queued.** Never
  delete or edit a resolved one.
- **Never `--reseal` on Sam's behalf.** The seal store records the picture he
  was last shown; resealing says "I have looked at these and accept them",
  which is his statement, not yours.
- **A whole-page shot may not stand in for a finding about one control.** If a
  finding is about a radio group and the card shows a whole page, the evidence
  has failed.
- **Backlogs are canonical JSON**, never prose documents. Write to them through
  the setters — `set-slot`, `set-decision`, `set-citation` — so a fan-out worker
  cannot reformat the file or touch a second increment.

## Two gates — stop and ask

- **Before writing decision questions for more than one finding**, author
  exactly one, show it beside the frozen original, and wait.
- **Before rewriting more than one finding into plain English**, do exactly
  one, show it beside the original, and wait.

Both were gated on the previous run for good reason: they are 40+ and 96
irreversible judgement calls respectively. Produce the canary, then carry on
with everything that does not depend on it.

## Your first five steps

1. Read `SKILL.md`, then `MERGE-PLAN.md` beside this file for what the tooling
   is and what is known broken.
2. Add a `dr1` corpus to `tools/parity/corpora.json` — every path the capture
   uses comes from it, so nothing can run until it exists. Sides keep the ids
   `frontend` and `prototype`, label the second one "Design release 1",
   `screenPrefix: 'dr1-'`, paths under `workareas/shared/dr1-parity/`, and give
   each side an `app.baseURL` and `app.startPath`. Omit `baselines.passA` until
   citations are final. Run `tim parity check-evidence` and expect it to fail —
   read what it says.
3. Run `tim parity map <runId> --side frontend --write` with the frontend up.
   Nothing here has ever driven a browser — getting one map out is your first
   real task, and it proves the whole discovery path. Check `git status` is
   clean afterwards.
4. Map the prototype the same way, capture both sides, and pin to the latest
   commit of each. Read the map's coverage line and the "can be walked again by
   the capture stage" count before you trust either side's screen list.
5. Run the differ, hand-author `pairs.js`, and produce the deltas. **Stop
   there** and show Sam the delta counts before any finding is authored — that
   is the point where you will know whether DR1 is a small comparison or a
   large one, and it changes everything downstream.

## What nobody has decided yet

Raise these with Sam rather than choosing for him:

- What is this comparison *for*? Against DR2.1 it was a decision surface — 70
  findings awaiting a ruling. If DR1 is a stable reference, this may be a
  conformance check, and the three bands (`frontend-only`,
  `needs-design-decision`, `needs-backend`) and the ruling vocabulary may be
  the wrong shape.
- Which run id and ticket? Every downstream path depends on it, and
  `next-decision.sh` / `rule-decision.sh` only accept an `EUDPA-*` glob today.
- Does the frontend need re-capturing at all? It has not changed. Its full-page
  shots and page models are corpus-independent; only the element crops are
  corpus-derived, because anchors come from the deltas. If the existing
  frontend capture can be reused with a fresh `anchors.frontend.json`, the
  capture cost halves — but nothing in the profile expresses "share this side's
  captures with another corpus" yet.
