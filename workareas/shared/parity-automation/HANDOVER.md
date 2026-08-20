# Handover — run the comparison from scratch, reusing nothing

Everything below the line is the prompt. Copy it whole.

---

You are running a comparison pipeline end to end. It is built, it works, and it
has been run twice. **Your job is a third run that reuses nothing from either.**

Read that sentence twice. The last session was told the same thing, reused three
things anyway, flagged them, and had to throw the work away. Flagging a
deviation is not permission for it.

## Start here

```
tools/parity/start-comparison.sh EUDPA-328-DR1C
tools/parity/phase.sh EUDPA-328-DR1C status
```

The skill is `.claude/skills/parity/SKILL.md`, mode **COMPARE**. Read that mode
whole before doing anything. The worker personas it names are in
`.claude/skills/parity/references/` and they are the work; the commands around
them only check what they produced.

## What is being compared

The DEFRA live-animals import notification **frontend**
(`repos/trade-imports-animals-frontend`, source `src/server/app/`, screen ids
`fe-`) against **Design Release 1** of the GOV.UK prototype
(`~/git/defra/defra-design/GB-notification-service`, screen ids `dr1-`).

DR1 is the **root mount** — `app/views/x.html`, never a release subfolder. It is
**signed off**: where the frontend differs, the frontend is wrong unless the
finding itself is mistaken. Findings are born as work; there is no ruling to
wait for.

## Where the run stands

`dr1c` exists and holds **an enumeration and nothing else**.

| phase | state |
|---|---|
| setup | done — corpus entry, workarea, `requireVerification: true` |
| heads | done — frontend `76a864ba`, prototype `491b3926` |
| **enumerate** | **done, and it is the only thing worth keeping** |
| specs | **todo** — write them from source |
| capture | todo |
| pair, slice, author, verify, dedupe, ingest, report | todo |

A contract-authoring agent may have finished after this was written. Check
whether `workareas/shared/dr1c-parity/FINDING-CONTRACT.md` exists. If it does,
read it and judge it; if not, write it from
`tools/parity/templates/FINDING-CONTRACT.template.md` — six sections in it are
marked and wrong until somebody writes them for this comparison.

## The enumeration, and why it is the one thing you keep

`workareas/shared/dr1c-parity/enumerate.cjs` assembles two modules written by
two agents from each application's own source:

- **frontend, 31 screens.** This application has no route table — paths are
  computed by helpers — so the handle is the `const view` declarations. The
  module reconciles those against the template files **in both directions and
  throws on either mismatch**, so the list checks itself.
- **prototype, 28 screens**, five of which are the **address book**.

**Those five matter.** Both previous corpora used a shared enumerator that
excluded everything under `address-book`, on the reasoning that it "is mounted
outside every release … so it is identical in DR1 and DR2.1". Reading the code,
it is not: the router stack is copied under every base, the later releases point
their navigation at their own copy, and the helper cited only suppresses
automatic href prefixing.

So both runs reported complete coverage against a list short by five, and one
carries a finding about the missing add-an-address route argued entirely from
source because nobody had photographed the screens it is about.

**The scope question is open and is yours to settle with pictures**: the
frontend has no address-book screen at all — its 31 are the notification journey
— and that UI is being built in a different service. Deciding they are out of
scope is a legitimate answer. Inheriting an exclusion whose reason is wrong is
not.

## What "reuse nothing" means, concretely

**Do not read** `workareas/shared/dr1-parity/`, `workareas/shared/dr1b-parity/`,
`workareas/journey-builder/EUDPA-328-DR1/` or `.../EUDPA-328-DR1B/`. Not their
findings, backlogs, handovers, contracts, pairings, **specs**, or comparison
reports.

In particular:

- **Write the capture specs from source and the enumeration.** The previous
  corpora have thirteen working specs. Copying them is the reuse that got the
  last attempt scrapped.
- **No carryover.** There is no `carriedFrom` on this run.
- **Do not use a previous manifest as the specification of what to reach.** The
  enumeration is that specification.

Put the firewall in every agent's brief, not just your own head.

## Rules that are not yours to relax

- **`detail` is frozen from first ingest.** It is the only oracle proving a
  later language pass lost nothing.
- **`ingest` refuses a finding with no `finding.verification`** on this corpus.
  That line is a verifier saying what it opened and what it ran, and it is the
  only thing distinguishing a verifier who found nothing from one who looked at
  nothing. Do not let authors write it.
- **Prove the slicing before spawning anything** — `tim parity slices --strict`.
  Every captured screen owned by exactly one slice, exactly one slice owning the
  chrome, and every other slice told **in as many words** not to raise a chrome
  finding.
- **Captures cannot run in parallel.** One server, one session. Fan out the
  writing; serialise the running.
- **Never `--reseal` on Sam's behalf.** The seal store records the pictures he
  was last shown.
- **A whole-page shot may not stand in for a finding about one control** — but
  an ambiguous name is now refused rather than cropped at a guess, and the card
  falls back to the page with the reason printed. That is correct; do not
  "fix" it.
- **Never mark a phase done that is not.** The ledger is what a later session
  believes.
- Work on `main`, commit directly, push. One Bash command per call, no `&&`, no
  `;`, no `cd`. Write `~/git/defra/…`, never `/Users/…`. `npm install` is
  blocked by a guard hook.

## Knowledge already paid for — do not rediscover it

**About the harness.** Three defects were found and fixed this week; all three
are in `tim` and tested, so you inherit the fixes:

- Every screenshot in every corpus before 20 August was **1x while everything
  reported 2x** — a device descriptor spread over the two settings that decide
  what a picture is worth. There was a test; it asserted the string was present,
  not that it won.
- **Ambiguous crops.** A name landing in several places was cropped at whichever
  came first — once across 27 places on one screen. Now refused on every rung.
- **The scaffold declared capture specs CommonJS.** They are ES modules with a
  top-level `await import`. Any new corpus's first capture would have failed.

**About the applications.** Each of these cost a failed run:

- A search widget posts a **hidden** input and its open results panel overlays
  the buttons and swallows the mousedown. Dismiss it, then assert the hidden
  field.
- **A live row-filter search box will hide the row you just picked** if a
  form-filler types into it.
- On a hub, an answered item still renders a link — "Change" sits in the same
  container as "Add" with one extra class. A loop driving off "any link" reopens
  the first section forever.
- `selectedSpecies` and `transitCountries` are seeded with the literal `"[]"`,
  so "not empty" passes before anything is chosen.
- The arrival date has a **moving window** derived from `new Date()`. Derive it;
  never type a literal.
- **A view file's absence does not mean a question's absence** — several DR1
  questions are conditional reveals with no view of their own.
- **A dead hub row is evidence about the hub, not about the journey.** Follow the
  forward path before claiming a page cannot be reached.
- The frontend needs `STUB_MODE=true`; the corpus sets it. The Prototype Kit
  bounces nodemon while recompiling — wrap the first navigation in
  `toPass({ timeout: 240_000 })`.
- **The page model is unreliable**: it reports `caption: null` on every prototype
  screen because that side uses its own class, it has collapsed five checkbox
  fieldsets into one, and it has attached a hint to the wrong control. Read the
  rendered DOM.

## What the method still does not check

- **Nothing promotes an observation to a finding.** Three times, an agent wrote a
  fact into its own verification line and never raised it. Every check asks
  whether work happened; none asks whether something noticed became a finding.
- **A cross-slice duplicate is a judgement.** `tim parity duplicates` measures
  two sentences; two agents describing one change in different words share no
  screen, no control and no vocabulary. Do the hand search past the list.
- **Two independent runs can share a blind spot.** Both previous runs missed the
  same third occurrence of a label they were both writing about.

## When you finish

Say plainly what it produced: **findings, not rulings.** Nobody has read any of
them. Then name what you could not settle — a question only a designer can
answer, a requirements source contradicting itself, a citation pointing at
nothing — as a short list, not buried in a hundred findings.

## Where you are

- Workspace `~/git/defra/trade-imports-workspace`, on `main`, clean.
- All sub-repos on `main` and current.
- Two previous reports exist and are **not** to be opened during the run:
  `workareas/journey-builder/EUDPA-328-DR1/report/index.html` (133 findings) and
  `.../EUDPA-328-DR1B/report/index.html` (124). The first is also archived at
  `~/git/defra/parity-archive/` with a tag, `dr1-report-frozen-2026-08-20`.
