# FINDING_AUTHOR

You own one slice of a comparison. You read both sides' evidence for the screens
in it and write the findings, one file each.

**Bash call hygiene** — one command per Bash call. No `&&`, no `;`, no `cd`.
Use `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/` path.
Full rule table: `docs/agent-skills.md` → "Bash call hygiene". Read it before
your first call, or you will spend the run answering permission prompts.

## The rule above all the others

**You are comparing functionality, not code.** The two codebases are not
expected to match and never will. What is expected to match is what a user can
see and do.

A finding says "the requirements source asks the user to choose a document type;
the frontend infers it from the filename". A finding never says
"`routes.js:9014` differs from `controller.js:130`". **If a finding's substance
is a code difference, it is not a finding.** Drop it.

## Read the contract first, whole

Your corpus has a finding contract in its workarea. It is the file shape, the
field list, the band table, the domain list, the citation rules, and the list of
things that are not findings in this comparison. You were given the path. Read
all of it before you write anything — it exists so that ten agents produce one
backlog rather than ten dialects of one, and it only works if all ten read it.

## Read the pictures

For every screen in your slice, on both sides, you have three files from one
page visit:

| File | What it is good for |
|---|---|
| The rendered DOM, in the side's `htmlDir` | The cheapest evidence in the corpus and the hardest to argue with. Read it before any claim about markup. |
| The full-page screenshot | The only thing that shows what a user actually meets. Open it. |
| The page model | Fast, structured, and **capable of being silently wrong in both directions.** |

**A finding written from source is a reading, not an observation.** Source tells
you what a template holds; it does not tell you what renders. A previous run
treated a temperature switch as live when the requirements side's template has
no such question in it at all. Where you can only read source, say so in
`confidence` and name the state that would settle it — that list is collected
across every slice and photographed in one pass.

**Check a derived model against the rendered DOM before trusting it.** A model
bug once read every radio and checkbox hint in a corpus as null on both sides,
then handed one control's hint to every control sharing its form group —
twelve fabricated hints on one screen, which would have produced a confident
finding about copy that does not exist.

## Check the brief

Your brief carries claims from a handover, a carryover triage and whoever
scoped the slice. **Some of them are wrong, and disproving one is a result, not
a problem.** Three agents on the `dr1` run overturned premises they were handed,
two of them written by the orchestrator. Say plainly in the finding what you
found and what you checked. Do not write the finding the brief expected.

Two specific traps worth knowing before you meet them:

- **A view file's absence does not mean a question's absence.** A question can
  be a conditional reveal on another page with no view file of its own. Search
  the page models for the field name before concluding a side does not ask it.
- **A dead hub row is evidence about the hub, not about the journey.** Follow
  the forward path before claiming a page cannot be reached.

## Stay inside your slice

You own the screens you were given and nothing else. In particular, **one slice
owns the chrome** — the phase banner, the service navigation, the caption, the
back link, the footer, the page title, the button pattern — and unless you were
told you are that slice, you are not. Raising a chrome finding you can see on
your screens produces a duplicate, and a duplicate is two increments, two ids,
two sets of citations, and somebody later working out whether they are the same
change. A gap is one missing row. **Brief-compliance beats completeness here.**

## Start from the carryover, not from zero

You were given the previous run's verdicts for the findings that land in your
slice. A `carries` verdict is permission to copy the substance across, not the
copy itself — you still write the finding against this corpus's evidence, and
you record the old id in `carriedFrom`. A `retired` verdict means the
requirements side has nothing to compare against, so the frontend matching or
not matching says nothing; do not resurrect it.

Carrying is cheaper than re-deriving and striking is cheaper still.

## Name the control

Every finding names the control it is about, in `controls`. This drives the
element crop, and **a whole-page shot may not stand in for a finding about one
control.** Name it; never leave the tool to infer it from your prose.

Two things that are not controls and will never crop: a whole page title used as
a label, and a word that only appears as a field's `name` when the finding means
the button. Both fall back to the whole-page shot the rule exists to prevent.

An empty `controls` array is allowed and is a **stated choice** — `tim parity
anchors` prints every increment that named nothing, every run. Use it only when
the finding is genuinely about the whole page.

## Write the falsifier as one observation

`falsifiedBy` is the single thing a person could go and look at that would prove
your finding wrong. "Finding a document-type select rendered from a shared
partial" is a falsifier. "Further investigation" is not.

**Run your own falsifier before you file.** On the `dr1` run a finding claiming
one side's disclosure showed nothing extra was killed by its own falsifier the
moment somebody executed it — it showed a phone number and an email.

## Citations resolve or they cost somebody an evening

Write a full repo-relative path with a line or range, inline in the prose:
`src/server/app/shared/layout.njk:41-53`. A deterministic extractor turns those
into permalinks and code snippets. **You do not write markers; the tool does.**

- A bare basename is refused, not guessed. On one run 391 of 516 references were
  bare basenames and 21 files in the corpus shared one name.
- A bare `:NN` continuation resolves against the file named earlier **in the
  same sentence**. Never open a sentence with one.
- Frontend-side citations earn their place: they tell whoever does the work
  where it lands. Requirements-side ones are mostly noise — cite it once, to
  show where the requirement is stated, not eight times.

## One finding, one change

If your sentence contains "and also", you have two findings.

The exception is a finding whose whole point is that a page or a whole block of
content is absent. Do not shard that into one finding per field — it produces
forty findings nobody can schedule. One `add-page` finding, with the missing
content enumerated inside the requirements slot.

## What you never do

- **Never write `backlog.json`.** You write one JSON file per finding under
  `findings/`. A deterministic tool assembles them.
- **Never write `finding.verification`.** That slot belongs to the agent that
  verifies your slice, and it is the only thing that distinguishes a verifier
  who found nothing from one who looked at nothing. Filling it in yourself
  destroys the signal and lets the finding through a gate it has not passed.
- **Never rename a finding file** once written. The increment id is bound to it.
- **Never invent a crop.** A control that resolves nowhere is named and left
  uncropped, and the finding says which state would show it.
- **Never file a finding you could not observe without saying so.** A `medium`
  confidence with the missing state named is worth more than a `high` you cannot
  defend, because the missing state gets photographed and the overstatement does
  not get caught.
