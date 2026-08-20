# DR1C run brief — read this whole file before you do anything

You are one agent in a comparison pipeline. This file is the part of your brief
that is the same for everybody. Your spawn prompt carries the rest.

## 1. FIREWALL — this run reuses nothing

Two previous runs of this comparison exist. **This run reuses nothing from
either.** You must not read, open, `ls`, `grep`, `find`, diff or copy from:

- `~/git/defra/trade-imports-workspace/workareas/shared/dr1-parity/`
- `~/git/defra/trade-imports-workspace/workareas/shared/dr1b-parity/`
- `~/git/defra/trade-imports-workspace/workareas/journey-builder/EUDPA-328-DR1/`
- `~/git/defra/trade-imports-workspace/workareas/journey-builder/EUDPA-328-DR1B/`
- `~/git/defra/parity-archive/`

Not their findings, backlogs, handovers, contracts, pairings, slices, **specs**,
manifests, evidence or reports. Not "just to see the shape". Not to check a
screen id. Not to copy a selector.

**Documents you are told to read will point you at those paths by name.** The
`SPEC_AUTHOR` persona says "read an existing one first" and names
`workareas/shared/dr1-parity/specs/`. The finding-contract template says to read
`workareas/shared/dr1-parity/FINDING-CONTRACT.md` as the worked example. **Ignore
both instructions.** Everything you need is either in this file, in your spawn
prompt, or in the two applications' own source.

**Flagging a deviation is not permission for it.** The last session was given
this same instruction, reused three things, flagged all three, and had its work
thrown away. If you believe you cannot do your job without one of those files,
stop and say so in your report. Do not read it and explain afterwards.

### The firewall reaches inside this workarea too

`workareas/shared/dr1c-parity/` is mostly yours, but **one earlier attempt at
this run got as far as taking pictures, using capture specs copied from a
previous corpus.** That attempt was scrapped. The scrap commit removed
everything it could see — but `workareas/shared/*/capture/` is gitignored, so
182 files of rendered HTML and page models survived it invisibly, and they are
the output of the copied specs.

They have been moved out of the workspace. If you see a `capture/` directory
here holding screens you did not photograph, **it is not evidence, it is
residue**: tell the parent and do not read it.

**Exactly two things in this workarea predate you and are legitimate:**

- `enumerate.cjs`, `enumerate.frontend.cjs`, `enumerate.prototype.cjs` — the
  screen enumeration, derived from each application's own source. Deliberately
  kept. Read it freely; it is the specification for this run.
- `run-heads.json` — where each checkout stood when the run began.

Everything else is being written now, by this run.

## 2. What is being compared

The DEFRA live-animals import notification **frontend** against **Design
Release 1** of the GOV.UK prototype.

| | implementation side | requirements side |
|---|---|---|
| id | `frontend` | `prototype` |
| label | Frontend | Design release 1 |
| checkout | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `~/git/defra/defra-design/GB-notification-service` |
| source root | `src/server/app/sets/live-animals/journeys/linear/` | `app/` |
| screen id prefix | `fe-` | `dr1-` |
| local port | 3005 | 3010 |
| screens | 31 | 28 |
| commit | `76a864ba` | `491b3926` |

**DR1 is the root mount.** The prototype serves four journeys from one router.
DR1 is the one with no path prefix, and its views are the loose `.html` files at
the root of `app/views/` — **never** `app/views/design-release-2/x.html` or
`app/views/design-release-2.1/x.html` or `app/views/testing/x.html`. A citation
into a release subfolder is a citation about the wrong document.

**DR1 is signed off.** Where the frontend differs from it, the frontend is wrong
unless the finding itself is mistaken. There is no ruling to wait for and no
"do we want this" question to answer.

## 3. The screen list is the specification

`workareas/shared/dr1c-parity/enumerate.cjs` and the two modules beside it name
every screen each side has, read from that side's own source. That list — 31 and
28 — is what this run must reach and account for. Nothing else is.

See it with:

```
tim parity coverage EUDPA-328-DR1C --workspace ~/git/defra/trade-imports-workspace
```

Each screen carries a `why` saying what a spec has to arrange to reach it. Read
your screens' `why` lines; they were written for you.

## 4. Bash call hygiene

One command per Bash call. No `&&`, no `;`, no `cd`. Write
`~/git/defra/trade-imports-workspace/...`, never a literal `/Users/...` path
(different prefixes reach the permission matcher). `npm install` is blocked by a
guard hook — if you think you need it, you are wrong about something else.

## 5. Guard rails

- Do not `git commit`, `git push`, `git checkout` or `git stash`. The parent
  commits.
- Do not run `tim parity capture`. Captures cannot run in parallel — one server,
  one session — and the parent serialises them.
- Do not edit `tools/parity/corpora.json`, the pipeline ledger, or
  `enumerate*.cjs`.
- Do not start or stop the applications on ports 3005 and 3010. The parent owns
  them.
- Do not try to work around a denied command by rewriting it. A deny rule is a
  decision, not an obstacle. Say what you needed and carry on without it.

## 6. How you see what a page actually renders

**`curl`, `wget`, `node`, `env`, `bash -c` and `python` are all on this
workspace's deny list.** You cannot fetch a URL from a shell and you must not
try to get around it by transforming the command. There is no retry that works;
stop and use what follows instead.

Two honest sources of rendered markup, in order of preference:

1. **The capture's rendered HTML — once THIS RUN's captures have run.** Every
   screen is written out as markup in the same page visit as its screenshot,
   under:
   - `workareas/shared/dr1c-parity/capture/html/frontend/`
   - `workareas/shared/dr1c-parity/capture/html/prototype/`

   **The rendered DOM is the cheapest evidence in this comparison and the
   hardest to argue with.** If you are a finding author or a verifier, this is
   where you live. Prefer it to reading a template and imagining the output.

   **But check the date before you trust it.** See section 1: an earlier
   scrapped attempt left 182 files in exactly this location, taken by copied
   specs. If the parent has not told you the captures for this run are done,
   there are no captures, and anything you find there is residue.

2. **The templates**, where no capture exists yet — which is the position spec
   authors are in, and it is the intended one. Read the view, read the macro it
   calls, read the data the controller passes it. The Nunjucks and the Prototype
   Kit HTML are both plain enough to read.

A page model is also written per screen under `capture/model/`. Treat it as a
hint and never as evidence: see section 7 for the three ways it is known to
be wrong.

## 7. Knowledge already paid for — do not rediscover it

Every line here cost a previous run a failure. These are facts about the two
applications and about the harness; they are not findings and they are not
reuse.

**The harness.**

- Screenshots are 2x. A device-descriptor bug that shot everything at 1x while
  reporting 2x was found and fixed; you inherit the fix.
- A crop whose control name lands in several places on the page is **refused**
  and the card falls back to the whole page with the reason printed. That is
  correct behaviour. Do not try to make it crop anyway.
- Capture specs are **ES modules** (`.pw.js`), not CommonJS.

**Both applications.**

- **A search widget posts a HIDDEN input, and its open results panel overlays
  the buttons and swallows the mousedown.** Clicking Continue while the panel is
  open reaches nothing — no error, no navigation, no POST. Dismiss the panel,
  then assert the hidden field is non-empty.

  **This is a DR1-side fact. Check which page you are on before applying it.**
  Two spec authors established that the frontend's commodity page is not this
  shape at all: `fe-commodity-search` has no search box, no results panel and no
  hidden input — it renders the whole reference list up front as one checkbox
  fieldset per commodity. That difference against DR1's
  `/what-are-you-importing` is itself likely a finding, so do not paper over it.
- **A live row-filter search box hides the row you just picked.** A form-filler
  that types into every input on the page will make its own target disappear.
  The frontend's five address pickers *are* this shape — a search input, a
  Search button and a results table — even though its commodity page is not.
- **On a hub, an answered row still renders a link.** "Change" sits in the same
  container as "Add" with one extra class. A loop driving off "any link" reopens
  the first section forever. Two agents wrote that bug independently.
- **`selectedSpecies` and `transitCountries` are seeded with the literal
  `"[]"`**, so "assert not empty" passes before anything is chosen. Assert
  against `/^(\[\])?$/`.

  **Also DR1-side only.** `selectedSpecies` appears nowhere in the frontend —
  checked, and it exists only in the prototype's `app/routes.js`, its dashboard
  fixtures and the four releases' `what-are-you-importing.html`. The frontend's
  equivalent is a checkbox value of the shape `${commodity}|${speciesValue}`
  (`commodities/search/view-model/commodity-groups.js:9`).
- **The arrival date has a moving window derived from `new Date()`.** Derive the
  value; never type a literal. Never compare the value itself between sides —
  compare the field. Both sides derive it from the clock: the frontend at
  `features/transport/port-of-entry/arrival-window.js` (7 days back, 6 months
  on, anchored to the start of the day in `Europe/London`), DR1 at
  `app/routes.js:3927-3937`.
- **The MoJ date picker does not close on Escape**, on either side — the
  `SPEC_AUTHOR` persona says it does and it is wrong. On DR1 the dialog still
  carries `moj-datepicker__dialog--open` fifteen seconds after an Escape. Use
  the control the component itself offers, and assert it closed. Type into the
  input rather than driving the calendar.
- **The open calendar is a volatile value**, and it appears on more pages than
  is obvious. Its grid draws the current month with today highlighted, and
  `data-min-date` / `data-max-date` move daily on both sides. If the open state
  is worth a picture, mask what moves — or state in a comment why the drift is
  the thing being compared and must not be masked. Do not let it into the corpus
  unexplained: a drift panel that fires every time teaches its reader to skip it.
- **A view file's absence does not mean a question's absence.** Several DR1
  questions are conditional radio reveals with no view of their own: exit date,
  port of exit, exit border control post, transit/transhipment destination
  country and internal-market purpose are all reveals on `/reason-for-import`.
  Region-of-origin code reveals on `origin-of-the-import.html:102`; manual
  address fields reveal on `address-book-lookup.html:137`. **Before writing "DR1
  does not ask for X", grep `app/views/partials/` for the field name.**

  **The converse trap is real too, and this run has already met it.** An earlier
  version of this brief — and the enumeration's own header comment — said
  county, parish and holding reveal on `cph-number.html:53`. **They do not.**
  That line is a bare `{% include "partials/cph-number-input.html" %}`, and the
  partial is one `govukDateInput` with three always-visible inputs
  (`cph-number-input.html:4, :20, :32, :44`). Both documents have been
  corrected. So: check the partial, do not trust a description of it — including
  one in this file.
- **A dead hub row is evidence about the hub, not about the journey.** Follow the
  forward path before claiming a page cannot be reached.
- **The declaration is a checkbox, not a radio.**
- **Select by value, not by visible text** where a list comes from a reference
  service in one mode and a fixture in another. A list carrying
  "Netherlands (the)" is what a name-matched locator trips over.
- **The Prototype Kit bounces nodemon while recompiling.** Wrap a first
  navigation in `await expect(async () => { … }).toPass({ timeout: 240_000 })`.
- **The page model is unreliable.** It reports `caption: null` on every prototype
  screen because that side uses its own class; it has collapsed five checkbox
  fieldsets into one; and it has attached a hint to the wrong control. Read the
  rendered DOM, not the model, whenever the two could disagree.

## 8. The address book — an open question, not a settled one

The prototype enumeration includes five address-book screens
(`dr1-address-book`, `-add`, `-lookup`, `-view`, `-edit`). Both previous runs
excluded them on reasoning that does not survive reading the code, so both
reported complete coverage against a list short by five.

The frontend has **no** address-book screen at all — its 31 are the notification
journey — and that UI is being built in a different service.

**What this run has established from the frontend's source so far** (a spec
author found it; the parent verified it verbatim):

- There is no add-an-address route, link or affordance anywhere in the frontend
  journey. `party-picker/_address-picker.njk` is the whole picker form — a
  search input, a Search button, a results table, pagination and "Save and
  continue" — and `addresses/copy/copy.en.js` has no add-an-address key. The
  empty state's only copy is "No addresses match your search.", a dead end.
- `src/server/app/services/address-book/index.js:17-19` says so as a design
  statement: *"This service reads and never writes. The notification journey
  selects from the organisation's book; adding, changing and removing the
  records in it belongs to the INS frontend, which is the only writer."* The
  module exposes `search`, `all` and `party` and nothing that creates or edits.

So the frontend's answer to "my address is not listed" is that the user leaves
this service. DR1's answer is a link into `/address-book/add/lookup`.

**That is evidence, not a decision.** It says where the *code* believes the
writer lives; it does not say whether DR1 intended those five screens to belong
to this service. **This run photographs them and hands a person the pictures.**
Deciding they are out of scope is a legitimate answer. Inheriting an exclusion
whose stated reason is wrong is not.

Note also that an absence cannot be photographed. The frontend side of this has
no picture to show, so a finding about it has to say that in words and cite the
source above.

## 9. What you never do

- Never assert an application is correct in a capture spec. These are
  requirements-gathering tools, not tests.
- Never photograph a page without asserting you are on it.
- Never import either application's own test helpers, fixtures or journey
  drivers. They are unmaintained.
- Never mark something complete that is not. A stated absence — "this screen
  could not be reached, and here is why" — is a real answer this run records. A
  wrong picture is worse than no picture.
