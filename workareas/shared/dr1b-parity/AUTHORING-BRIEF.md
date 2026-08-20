# The brief every dr1b authoring and verifying agent reads

One file, read by all twenty agents, so that what they share is written down
once rather than paraphrased ten ways in ten spawn prompts.

Your spawn prompt names your slice, your screens and your role. Everything that
is the same for everybody is here.

## 1. The firewall, and it matters more than anything else

**Do not read `workareas/shared/dr1-parity/` or
`workareas/journey-builder/EUDPA-328-DR1/`.** Not the backlog, not `findings/`,
not `HANDOVER.md`, not `ARCHITECTURE.md`, not `SIZING.md`, not `carryover.json`,
not `pairs.cjs`, not the report.

This run is an independent second reading of a comparison that has already been
made once. **Its entire value is that it was produced without seeing the earlier
answers.** An agent that reads them writes them, the comparison that follows
then measures nothing, and there is no way to tell that from the outside
afterwards.

The one permitted exception is `workareas/shared/dr1-parity/enumerate.cjs`,
which lists which screens each application has and contains no findings.

**There is no carryover on this run and no `carriedFrom` field.** That is the
opposite of the usual instruction, and it is deliberate: re-deriving the
findings is the whole job.

If a path you are about to open contains `dr1-parity` or `EUDPA-328-DR1`, stop.

## 2. What is being compared

The DEFRA live-animals import notification **frontend** — the implementation
side, screen ids prefixed `fe-` — against **Design Release 1** of the GOV.UK
prototype, the requirements side, prefixed `dr1-`.

DR1 is the **signed-off** definition of this service. Where the frontend differs
from DR1 the frontend is wrong, unless the finding itself is mistaken. Findings
are born as accepted work; there is no ruling to wait for and no band for "we
might not want this".

## 3. Read the contract, whole, before you write anything

`workareas/shared/dr1b-parity/FINDING-CONTRACT.md`

It is the file shape, the field list, the band table, the domain list, the
citation rules and the list of things that are not findings in this comparison.
It exists so that ten agents on ten slices produce one backlog rather than ten
dialects of one, and it only works if all ten read all of it.

## 4. The evidence — already captured, nothing to run

**Do not start either application. Do not run Playwright. Do not run a capture.**
Both sides are already photographed and the pictures are what you read.

- Frontend, 40 screens:
  `workareas/shared/dr1b-parity/evidence/frontend@76a864ba/manifest.json`
- Prototype, 42 screens:
  `workareas/shared/dr1b-parity/evidence/prototype@491b3926/manifest.json`

Each manifest row names that screen's files. Per screen, on both sides, you have
three things **from one page visit, so all three describe the same render**:

| File | What it is good for |
|---|---|
| The rendered DOM | The cheapest evidence here and the hardest to argue with. Read it before any claim about markup. |
| The full-page screenshot | The only thing that shows what a user actually meets. **Open it.** |
| The page model | Fast, structured, and **capable of being silently wrong in both directions.** |

**Check a derived model against the rendered DOM before trusting it.** A model
of this shape has, in this corpus's history, read a whole class of hints as null
on both sides and separately fabricated hints that did not exist. A finding
about copy that rests on the model alone is a finding about the model.

Source, where you need it:

- Frontend: `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/`
- Prototype: `~/git/defra/defra-design/GB-notification-service/app/` — and for DR1
  always the **root** views, `app/views/x.html`, never
  `app/views/design-release-2.1/x.html`. DR1 is the root mount; the release
  folders are later releases and are not on trial.

## 5. The pairing

`workareas/shared/dr1b-parity/pairs.cjs` says which screen answers which, with
`onlyFrontend` and `onlyPrototype` beside it. Your spawn prompt carries your
slice's rows. Read the notes: they say what settled each non-obvious pair.

Where a pair is many-to-one, that is real — one prototype view can serve several
roles the frontend splits into separate pages — and the note says so.

## 6. One slice owns the chrome, and it is `service-wide`

The phase banner, the service navigation, the caption above the heading, the
back link, the footer, the page title and the button pattern appear on every
screen. **Unless your slice is `service-wide`, do not raise a finding about any
of them**, however plainly you can see it on your screens.

Ten agents left to themselves write the same chrome finding ten times. A gap is
one missing row in a work list. A duplicate is two increments, two ids, two sets
of citations, and somebody three months later working out whether they are the
same change. **Duplicates cost more than gaps**, so this brief leans toward gaps
on purpose.

## 7. Two traps that have cost real work on this comparison

Stated as classes of mistake rather than as instances, because naming the
instances would hand you the answers this run exists to re-derive.

1. **A view file's absence does not mean a question's absence.** A question can
   be a conditional reveal on another page with no view file of its own. Search
   both sides' page models for the field name before concluding a side does not
   ask something.
2. **A dead row in a task list is evidence about the task list, not about the
   journey.** A page can be unreachable from the hub and perfectly reachable by
   walking the journey forward. Follow the forward path before claiming a user
   cannot get somewhere.

## 8. Check your brief

Your spawn prompt and this file carry claims. **Some of them may be wrong, and
disproving one is a result, not a problem.** Say plainly in your report what you
found and what you checked. Do not write the finding the brief expected.

## 9. Where you write

One JSON file per finding:
`workareas/shared/dr1b-parity/findings/<slice>--<slug>.json`

**Never write `backlog.json`.** A deterministic tool assembles it.
**Never rename a finding file** once written — the increment id is bound to it.

## 10. Guard rails, for every agent

- One Bash command per call. No `&&`, no `;`, no `cd`.
- Write `~/git/defra/trade-imports-workspace/...`, never a literal `/Users/...`
  path — the permission matcher treats them as different prefixes.
- Do not run `npm install`. It is blocked by a guard hook.
- Do not start either application, run Playwright, or run any capture.
- Do not touch git. Do not commit anything.
- Do not write outside `workareas/shared/dr1b-parity/findings/`.
- Your final message is the return value. Make it facts, not narrative.
