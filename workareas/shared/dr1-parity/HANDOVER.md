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

Capture lives in `tools/parity/capture/` — its own npm project, because these
are requirements-gathering tools rather than tests and do not belong in either
application's repo. Read its `README.md`.

```bash
cd ~/git/defra/trade-imports-workspace/tools/parity/capture
npm install && npm run install:browser   # one-time, ask Sam — the hook blocks it
export CAPTURE_EVIDENCE_DIR=~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/evidence
export CAPTURE_MODEL_DIR=~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/capture/frontend/model
npm run capture:frontend
```

Both variables are **required** — the capture refuses to start without them,
deliberately, because a default would file DR1's evidence under the DR2.1
corpus it is replacing.

The prototype side is `npm run capture:prototype`, whose walker you will build.

## This is the first run of these tools on a second corpus

They have only ever been run against DR2.1. **They will break.** Fixing them as
you go is the job, not a distraction from it.

The standing rule: **a fix belongs in the tool, not in a workaround.** If you
find yourself copying a file to make something work, or hardcoding a path in
your workarea, stop and fix the tool instead. That is how this stops being a
one-off.

Known breakages, in the order you will hit them:

1. **The frontend capture has never run from its new home.** It moved out of
   the frontend repo into `tools/parity/capture/` and its imports, its git
   `cwd` and its output paths were all rewired in the move. Nobody has run it
   since. Expect the first run to fail; the fix belongs in the tool.
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

## Building the DR1 walker

**Do not port the ten DR2.1 specs.** The prototype repo already has
`journey-demo/e2e/walk.spec.js` — 124 lines, the interaction designer's own
walker, last touched 15 July, which already walks the root (DR1) journey with
no base prefix. It is driven by `journey-demo/e2e/journey.js`, which exports a
`JOURNEYS` array and complete fill helpers: `fillOrigin`, `fillCommodity`,
`fillReason`, `fillConsignmentDetails`, `fillAnimalIdentification`,
`fillAdditionalAnimalDetails`, `fillArrivalDetails`, `fillTransitCountries`,
`fillTransporter`, `fillUploadDocuments`, `fillRolesAndAddresses`,
`fillContactAddress`, `fillReview`, `fillDeclaration`.

Start from that. Add capture calls to it. Confirm with Sam whether the designer
maintains it and whether it is kept green — nothing in the workspace says.

The DR2.1 harness is worth reading for its hard-won Prototype Kit knowledge
(`workareas/shared/dr21-parity/harness/README.md`, "Gotchas"): dev mode because
production forces https and secure cookies, wait on the TCP port not an HTTP
probe under Node 24, `workers: 1` because the kit races session state,
`deviceScaleFactor: 2` with `reducedMotion` for byte-identical re-runs.

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
2. Set `CAPTURE_EVIDENCE_DIR` and `CAPTURE_MODEL_DIR`, then run
   `npm run capture:frontend` from `tools/parity/capture/`. It has never run
   from its new home — getting it green is your first real task, and it proves
   the whole capture path. Check `git status` is clean afterwards.
3. Add a `dr1` corpus to `tools/parity/corpora.json`: sides keep the ids
   `frontend` and `prototype`, label the second one "Design release 1",
   `screenPrefix: 'dr1-'`, paths under `workareas/shared/dr1-parity/`. Omit
   `baselines.passA` until citations are final. Run `tim parity check-evidence`
   and expect it to fail — read what it says.
4. Build the DR1 walker from `walk.spec.js`, capture both sides, and pin to the
   latest commit of each.
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
